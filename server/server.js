import { Server } from "socket.io";
import Moniker from "moniker";

// TODO: Limit number of duplicate connections
// TODO: Convert to TS

const connectedUsers = {};

function uniqueName() {
  let name = Moniker.choose();
  while (name in connectedUsers) name = Moniker.choose();
  return name;
}

function setup() {
  const io = new Server(5000, {
    cors: {
      origin: "http://localhost:3000",
    },
  });

  io.use((socket, next) => {
    /*
     * Runs for each new socket.
     * If the client already has a name, assign it to this socket too.
     * Assign a new client (based on IP) a random name on the socket.
     */
    if (socket.handshake.address in connectedUsers) {
      socket.userID = connectedUsers[socket.handshake.address];
      console.log(
        "User already found for address %s %s",
        socket.handshake.address,
        socket.userID
      );
      // Count duplicate connections so we know when to clear after all disconnected
      connectedUsers[socket.handshake.address].sockets.push(socket.id);
    } else {
      const userID = uniqueName();
      connectedUsers[socket.handshake.address] = {
        sockets: [socket.id],
        userID,
      };
      socket.userID = userID;
      console.log("Assigned new user %s", userID);
    }

    next();
  });

  io.on("connection", (socket) => {
    console.log(
      "connection made to socket id %s with user ID %s",
      socket.id,
      socket.userID
    );

    // Send a name to the client
    socket.emit("assign-name", socket.userID);

    // Remove the socket from connectedUsers or remove user if there is only one
    socket.on("disconnect", () => {
      console.log(
        "%s (%s) disconnected",
        socket.userID,
        socket.handshake.address
      );

      // When all sockets with a given userID are disconnected, remove from connectedUsers
      if (connectedUsers[socket.handshake.address].sockets.length <= 1) {
        console.log(
          "All connections from %s disconnected, removing user %s",
          socket.handshake.address,
          socket.userID
        );
        delete connectedUsers[socket.handshake.address];
      } else {
        const i = connectedUsers[socket.handshake.address].sockets.indexOf(
          socket.id
        );
        if (i !== -1) {
          connectedUsers[socket.handshake.address].sockets.splice(i, 1);
        }
      }
    });
  });
}

setup();
