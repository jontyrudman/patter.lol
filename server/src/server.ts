require('dotenv').config();
import { Server, Socket } from "socket.io";
// @ts-ignore
import Moniker from "moniker";

// TODO: Limit number of duplicate connections

interface UserSocket extends Socket {
  username: string;
}

type SocketId = string;

type ConnectedUsers = {
  [username: string]: SocketId;
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
  const username = uniqueName();
  connectedUsers[username] = userSocket.id;
  userSocket.username = username;
  console.log("Assigned new user %s", username);

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

    delete connectedUsers[socket.username];
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

  if (recipientUsername in connectedUsers) {
    getSocketById(connectedUsers[recipientUsername])?.emit(event, { senderUsername: initiatorSocket.username, ...data });
  } else {
    console.log(`${recipientUsername} not found`);
    initiatorSocket.emit("rtc-peer-not-found", recipientUsername);
  }
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
  const io = new Server(Number.parseInt(process.env.PORT ?? "5000"), {
    cors: {
      origin: process.env.FRONTEND_ORIGIN,
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
