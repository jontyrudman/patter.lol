import { Server } from "socket.io";
import Moniker from "moniker";

// TODO: Limit number of duplicate connections

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
      connectedUsers[socket.handshake.address].count += 1;
    } else {
      const userID = uniqueName();
      connectedUsers[socket.handshake.address] = { count: 1, userID };
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

    // Decrement the count of the connection or remove if there is only one
    socket.on("disconnect", async () => {
      console.log(
        "%s (%s) disconnected",
        socket.userID,
        socket.handshake.address
      );

      // When all sockets with a given userID are disconnected, remove from connectedUsers
      if (connectedUsers[socket.handshake.address].count <= 1) {
        console.log(
          "All connections from %s disconnected, removing user %s",
          socket.handshake.address,
          socket.userID
        );
        delete connectedUsers[socket.handshake.address];
      } else {
        connectedUsers[socket.handshake.address].count -= 1;
      }
    });
  });
}

setup();
