import { Socket, io } from "socket.io-client";
import env from "../utils/env";
import logger from "../utils/logger";

export type ServerToClientEvents = {
  "assign-name": (username: string) => void;
  "user-list": (users: string[]) => void;
  "rtc-peer-not-found": (peerUsername: string) => void;
  "rtc-icecandidate": ({
    senderUsername,
    iceCandidate,
  }: {
    senderUsername: string;
    iceCandidate: RTCIceCandidateInit;
  }) => Promise<void>;
  "rtc-offer": ({
    senderUsername,
    offer,
  }: {
    senderUsername: string;
    offer: RTCSessionDescriptionInit;
  }) => Promise<void>;
  "rtc-answer": ({
    senderUsername,
    answer,
  }: {
    senderUsername: string;
    answer: RTCSessionDescriptionInit;
  }) => Promise<void>;
  "chat-request": ({
    senderUsername,
  }: {
    senderUsername: string;
  }) => Promise<void>;
  "chat-response": ({
    senderUsername,
    response,
  }: {
    senderUsername: string;
    response: "accept" | "reject";
  }) => Promise<void>;
};

export type ClientToServerEvents = {
  "rtc-icecandidate": ({
    recipientUsername,
    iceCandidate,
  }: {
    recipientUsername: string;
    iceCandidate: RTCIceCandidateInit;
  }) => Promise<void>;
  "rtc-offer": ({
    recipientUsername,
    offer,
  }: {
    recipientUsername: string;
    offer: RTCSessionDescriptionInit;
  }) => Promise<void>;
  "rtc-answer": ({
    recipientUsername,
    answer,
  }: {
    recipientUsername: string;
    answer: RTCSessionDescriptionInit;
  }) => Promise<void>;
  "chat-request": ({
    recipientUsername,
  }: {
    recipientUsername: string;
  }) => Promise<void>;
  "chat-response": ({
    recipientUsername,
    response,
  }: {
    recipientUsername: string;
    response: "accept" | "reject";
  }) => Promise<void>;
};

type SignallingSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const signallingSocket: SignallingSocket = io(env.SIGNALLING_WS, {
  autoConnect: false,
  reconnection: false,
  timeout: 50000,
});

signallingSocket.onAny((...props) => {
  logger.debug("RTC rx: %s", JSON.stringify([...props]));
});

signallingSocket.onAnyOutgoing((...props) => {
  logger.debug("RTC tx: %s", JSON.stringify([...props]));
});

export default signallingSocket;
