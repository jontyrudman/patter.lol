import { createServer } from "http";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { Server, Socket } from "socket.io";
// @ts-ignore
import Moniker from "moniker";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { RateLimiterMemory } from "rate-limiter-flexible";

// Only use .env files in dev mode
if (process.env.NODE_ENV === "development") {
  dotenv.config();
  dotenv.config({ path: ".secrets.env" });
}

// TODO: enforce max message length
// TODO: Error handling for missing env vars
// TODO: Error handling generally
// TODO: Log levels
// TODO: Limit number of duplicate connections
// TODO: Timeout a user even if not disconnected

interface UserSocket extends Socket {
  username: string;
}

type SocketId = string;

type ConnectedUsers = {
  [username: string]: SocketId;
};

type IceServers =
  | [{ urls: string } | { urls: string; username: string; credential: string }]
  | undefined;

const connectedUsers = <ConnectedUsers>{};
const expressApp = express();
const httpServer = createServer(expressApp);
let getSocketById: ((id: string) => UserSocket) | (() => undefined) = () =>
  undefined;

const env = {
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
  PORT: parseInt(process.env.PORT ?? "5000"),
  METERED_API_KEY: process.env.METERED_API_KEY,
};

const rateLimiterWs = new RateLimiterMemory({
  points: 10, // 10 points
  duration: 1, // per second
});

const rateLimiterHttp = new RateLimiterMemory({
  points: 20, // 20 points
  duration: 1, // per second
});

const rateLimiterMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  rateLimiterHttp
    .consume(req.ip)
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).send("Too Many Requests");
    });
};

function uniqueName() {
  let name = Moniker.choose();
  while (name in connectedUsers) name = Moniker.choose();
  return name;
}

function broadcastUserList(io: Server) {
  console.log("Sending list of users");
  io.emit("user-list", Object.keys(connectedUsers));
}

function onConnect(socket: UserSocket) {
  console.log(
    "Connection made to socket id %s with user ID %s",
    socket.id,
    socket.username
  );

  // Send a name to the client
  socket.emit("assign-name", socket.username);
  socket.emit("user-list", Object.keys(connectedUsers));
}

/**
 * Throttle socket events per socket session
 */
function throttledOn(
  socket: UserSocket,
  ev: string,
  callback: (...args: any) => void
) {
  socket.on(ev, (...args) => {
    // Consume 1 point per event from a given socket
    rateLimiterWs
      .consume(socket.id)
      .then(() => {
        callback(...args);
      })
      .catch((err) => {
        // no available points to consume
        // emit error or warning message
        socket.emit("blocked", { retryMs: err.msBeforeNext });
      });
  });
}

function registerOnDisconnectListener(io: Server, socket: UserSocket) {
  // Remove the socket from connectedUsers or remove user if there is only one
  socket.on("disconnect", () => {
    console.log(
      "%s (%s) disconnected",
      socket.username,
      socket.handshake.address
    );

    // Cancel any pending requests from this user
    socket.broadcast.emit("chat-request-cancelled", {
      senderUsername: socket.username,
    });

    delete connectedUsers[socket.username];
    broadcastUserList(io);
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

function registerChatListeners(socket: UserSocket) {
  throttledOn(socket, "chat-request", ({ recipientUsername }) => {
    console.log(
      "Chat request from %s to %s",
      socket.username,
      recipientUsername
    );
    forwardToRecipient(socket, recipientUsername, "chat-request", {
      senderUsername: socket.username,
    });
  });

  throttledOn(socket, "chat-request-cancelled", ({ recipientUsername }) => {
    console.log(
      "Chat request from %s to %s cancelled",
      socket.username,
      recipientUsername
    );
    forwardToRecipient(socket, recipientUsername, "chat-request-cancelled", {
      senderUsername: socket.username,
    });
  });

  throttledOn(socket, "chat-response", ({ recipientUsername, response }) => {
    console.log(
      "Chat response from %s to %s",
      socket.username,
      recipientUsername
    );
    forwardToRecipient(socket, recipientUsername, "chat-response", {
      senderUsername: socket.username,
      response,
    });
  });

  throttledOn(socket, "rtc-offer", ({ recipientUsername, offer }) => {
    console.log("Offer from %s to %s", socket.username, recipientUsername);
    forwardToRecipient(socket, recipientUsername, "rtc-offer", {
      senderUsername: socket.username,
      offer,
    });
  });

  throttledOn(socket, "rtc-answer", ({ recipientUsername, answer }) => {
    console.log("Answer from %s to %s", socket.username, recipientUsername);
    forwardToRecipient(socket, recipientUsername, "rtc-answer", {
      senderUsername: socket.username,
      answer,
    });
  });

  throttledOn(
    socket,
    "rtc-icecandidate",
    ({ recipientUsername, iceCandidate }) => {
      console.log(
        "ICE candidate from %s to %s",
        socket.username,
        recipientUsername
      );
      forwardToRecipient(socket, recipientUsername, "rtc-icecandidate", {
        senderUsername: socket.username,
        iceCandidate,
      });
    }
  );
}

/**
 * Get an array of ICE servers from Metered
 */
async function getIceServers(): Promise<IceServers> {
  const response = await fetch(
    `https://patter.metered.live/api/v1/turn/credentials?apiKey=${env.METERED_API_KEY}`
  );

  let iceServers: IceServers;

  try {
    iceServers = await (response.json() as Promise<IceServers>);
    // Remove port 80 TURN servers
    iceServers = <IceServers>iceServers?.filter((elem) => {
      if (elem.urls.includes("turn:") && elem.urls.includes(":80"))
        return false;
      return true;
    });
  } catch (e) {
    console.error(e);
    return;
  }
  return iceServers;
}

function setupHTTPServer() {
  expressApp.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
    })
  );
  expressApp.use(rateLimiterMiddleware);
  expressApp.use(express.json());

  expressApp.post("/get-ice-servers", async (_, res) => {
    const iceServers = await getIceServers();
    console.log("Sending ICE servers");
    res.json({ iceServers: iceServers });
  });
}

function setupWebSockets() {
  const io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_ORIGIN,
    },
  });

  getSocketById = (id) => <UserSocket>io.sockets.sockets.get(id);

  /**
   * Runs for each new socket.
   * If the client already has a name, assign it to this socket too.
   * Assign a new client (based on IP) a random name on the socket.
   */
  io.use((socket: Socket, next: Function) => {
    const userSocket = <UserSocket>socket;
    const username = uniqueName();
    connectedUsers[username] = userSocket.id;
    userSocket.username = username;
    console.log("Assigned new user %s", username);

    // Send out updated user list to all clients
    broadcastUserList(io);

    next();
  });

  io.on("connection", (socket) => {
    const userSocket = <UserSocket>socket;
    onConnect(userSocket);

    registerOnDisconnectListener(io, userSocket);
    registerChatListeners(userSocket);
  });
}

setupWebSockets();
setupHTTPServer();
httpServer.listen(env.PORT);
