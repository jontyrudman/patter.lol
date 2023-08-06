import { Server, Socket } from "socket.io";
// @ts-ignore
import Moniker from "moniker";

// TODO: Limit number of duplicate connections

interface UserSocket extends Socket {
  username: string;
}

type ConnectedUser = {
  username: string;
  socketIds: Array<string>;
};

type ConnectedUsers = {
  [ipAddr: string]: ConnectedUser;
};

const connectedUsers = <ConnectedUsers>{};
let getSocketById: ((id: string) => UserSocket) | (() => undefined) = () =>
  undefined;

function uniqueName() {
  let name = Moniker.choose();
  while (name in connectedUsers) name = Moniker.choose();
  return name;
}

/**
 * Runs for each new socket.
 * If the client already has a name, assign it to this socket too.
 * Assign a new client (based on IP) a random name on the socket.
 */
function usernameMiddleware(socket: Socket, next: Function) {
  const userSocket = <UserSocket>socket;
  if (userSocket.handshake.address in connectedUsers) {
    userSocket.username = connectedUsers[userSocket.handshake.address].username;
    console.log(
      "User already found for address %s %s",
      userSocket.handshake.address,
      userSocket.username
    );
    // Count duplicate connections so we know when to clear after all disconnected
    connectedUsers[userSocket.handshake.address].socketIds.push(userSocket.id);
  } else {
    const username = uniqueName();
    connectedUsers[userSocket.handshake.address] = {
      socketIds: [userSocket.id],
      username,
    };
    userSocket.username = username;
    console.log("Assigned new user %s", username);
  }

  next();
}

function onConnect(socket: UserSocket) {
  console.log(
    "Connection made to socket id %s with user ID %s",
    socket.id,
    socket.username
  );

  // Send a name to the client
  socket.emit("assign-name", socket.username);
}

function registerOnDisconnectListener(socket: UserSocket) {
  // Remove the socket from connectedUsers or remove user if there is only one
  socket.on("disconnect", () => {
    console.log(
      "%s (%s) disconnected",
      socket.username,
      socket.handshake.address
    );

    // When all sockets with a given username are disconnected, remove from connectedUsers
    if (connectedUsers[socket.handshake.address].socketIds.length <= 1) {
      console.log(
        "All connections from %s disconnected, removing user %s",
        socket.handshake.address,
        socket.username
      );
      delete connectedUsers[socket.handshake.address];
    } else {
      const i = connectedUsers[socket.handshake.address].socketIds.indexOf(
        socket.id
      );
      if (i !== -1) {
        connectedUsers[socket.handshake.address].socketIds.splice(i, 1);
      }
    }
  });
}

function forwardToRecipient(
  initiatorSocket: UserSocket,
  recipientUsername: string,
  event: string,
  data: any
) {
  console.log(
    `Attempting to forward data from ${initiatorSocket.username} to ${recipientUsername}...`
  );

  // Look for the recipient in `connectedUsers` and forward data to them
  for (const { username, socketIds } of Object.values(connectedUsers)) {
    if (recipientUsername !== username) continue;

    // If there's a match to the recipient, send to all sockets open for them
    socketIds.forEach((sid) => {
      getSocketById(sid)?.emit(event, { senderUsername: initiatorSocket.username, ...data });
    });

    // Success, return early
    return;
  }

  console.log(`${recipientUsername} not found`);
  initiatorSocket.emit("rtc-peer-not-found", recipientUsername);
}

function registerRtcHandshakeListener(socket: UserSocket) {
  socket.on("rtc-offer", ({ recipientUsername, offer }) => {
    console.log("Offer from %s to %s", socket.username, recipientUsername);
    forwardToRecipient(socket, recipientUsername, "rtc-offer", {
      senderUsername: socket.username,
      offer,
    });
  });

  socket.on("rtc-answer", ({ recipientUsername, answer }) => {
    console.log("Answer from %s to %s", socket.username, recipientUsername);
    forwardToRecipient(socket, recipientUsername, "rtc-answer", {
      senderUsername: socket.username,
      answer,
    });
  });

  socket.on("rtc-ice-candidate", ({ recipientUsername, iceCandidate }) => {
    console.log(
      "ICE candidate from %s to %s",
      socket.username,
      recipientUsername
    );
    forwardToRecipient(socket, recipientUsername, "rtc-ice-candidate", {
      senderUsername: socket.username,
      iceCandidate,
    });
  });
}

function setup() {
  const io = new Server(5000, {
    cors: {
      origin: "http://192.168.1.149:4173",
    },
  });

  getSocketById = (id) => <UserSocket>io.sockets.sockets.get(id);

  io.use(usernameMiddleware);

  io.on("connection", (socket) => {
    const userSocket = <UserSocket>socket;
    onConnect(userSocket);

    registerOnDisconnectListener(userSocket);
    registerRtcHandshakeListener(userSocket);
  });
}

setup();
