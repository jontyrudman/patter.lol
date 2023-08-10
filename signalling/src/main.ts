import { createServer } from "http";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import { Server, Socket } from "socket.io";
// @ts-ignore
import Moniker from "moniker";
import dotenv from "dotenv";

dotenv.config();

// TODO: Limit number of duplicate connections

interface UserSocket extends Socket {
  username: string;
}

type SocketId = string;

type ConnectedUsers = {
  [username: string]: SocketId;
};

const connectedUsers = <ConnectedUsers>{};
const expressApp = express();
const httpServer = createServer(expressApp);
let getSocketById: ((id: string) => UserSocket) | (() => undefined) = () =>
  undefined;

const env = {
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
  PORT: parseInt(process.env.PORT ?? "5000"),
  TURN_DOMAIN: process.env.TURN_DOMAIN,
  TURN_SECRET: process.env.TURN_SECRET ?? "",
  // Default to a day
  TURN_SECRET_LIFETIME_SECONDS: parseInt(
    process.env.TURN_SECRET_LIFETIME_SECONDS ?? "86400"
  ),
};

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
    getSocketById(connectedUsers[recipientUsername])?.emit(event, {
      senderUsername: initiatorSocket.username,
      ...data,
    });
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

  socket.on("rtc-icecandidate", ({ recipientUsername, iceCandidate }) => {
    console.log(
      "ICE candidate from %s to %s",
      socket.username,
      recipientUsername
    );
    forwardToRecipient(socket, recipientUsername, "rtc-icecandidate", {
      senderUsername: socket.username,
      iceCandidate,
    });
  });
}

/**
 * Makes an array of ICE servers by generating a timestamped username and
 * a credential in the form of an HMAC.
 *
 * The secret used for the HMAC is shared between the TURN server and this one
 * and the timestamped username is written into the hash.
 */
function getICEServers(name: string): Array<Object> {
  const unixExpiryTimestamp =
    parseInt((Date.now() / 1000).toString()) + env.TURN_SECRET_LIFETIME_SECONDS;

  const hmac = crypto.createHmac("sha1", env.TURN_SECRET);
  const username = [unixExpiryTimestamp, name].join(":");

  hmac.setEncoding('utf-8');
  hmac.write(username);
  hmac.end();
  const credential = hmac.read();

  return [
    {
      urls: "stun:" + env.TURN_DOMAIN + ":3478",
    },
    {
      username: username,
      urls: "turns:" + env.TURN_DOMAIN + ":443",
      credential: credential,
    },
    {
      username: username,
      urls: "turn:" + env.TURN_DOMAIN + ":3478",
      credential: credential,
    },
  ];
}

function setupHTTPServer() {
  expressApp.use(cors({
    origin: env.FRONTEND_ORIGIN,
  }));
  expressApp.use(express.json());
  expressApp.post("/get-ice-servers", (req, res) => {
    console.log(req.body);
    const iceServers = getICEServers(req.body.username);
    console.log("Sending ICE servers: %s", JSON.stringify(iceServers));
    res.json({"iceServers": iceServers});
  });
}

function setupWebSockets() {
  const io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_ORIGIN,
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

setupWebSockets();
setupHTTPServer();
httpServer.listen(env.PORT);
