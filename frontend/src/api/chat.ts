import signallingSocket from "./signallingSocket";
import env from "../utils/env";
// @ts-ignore
import adapter from "webrtc-adapter";
import logger from "../utils/logger";

type CloseCallback = () => void;
type AnswerCallback = (
  chatConnection: ChatConnection,
  answer: RTCSessionDescriptionInit
) => void;
type DataChannelCreatedCallback = (chatConnection: ChatConnection) => void;

export type ChatConnection = {
  username: string;
  peerUsername: string;
  peerConnection: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  answerCallback?: AnswerCallback;
  closeCallback?: CloseCallback;
  dataChannelCreatedCallback: DataChannelCreatedCallback;
  close: () => void;
};

type IceServersConfig = {
  iceServers: (
    | { urls: string }
    | { urls: string; username: string; credential: string }
  )[];
};

let offerCallback:
  | ((senderUsername: string, offer: RTCSessionDescriptionInit) => void)
  | null;
const MAX_PENDING_ICE_CANDIDATES = 10;

// For when we receive candidates before a ChatConnection has been created
const iceCandidateQueue: { [peerUsername: string]: RTCIceCandidateInit[] } = {};
let allowedPeers: string[] = [];

export const connections: { [peerUsername: string]: ChatConnection } = {};

export function rtcHandshakeSignalsOn() {
  signallingSocket.on("rtc-offer", async ({ senderUsername, offer }) => {
    if (senderUsername in connections)
      logger.error(`Connection already open for peer ${senderUsername}`);

    iceCandidateQueue[senderUsername] = new Array(MAX_PENDING_ICE_CANDIDATES);
    // Run callback from onOffer
    if (offerCallback === null) return;
    offerCallback(senderUsername, offer);
  });

  // Add answer event listener before we send an offer
  signallingSocket.on("rtc-answer", async ({ senderUsername, answer }) => {
    if (senderUsername in connections) {
      const chatConn = connections[senderUsername];

      if (chatConn.answerCallback === undefined) {
        logger.debug("User received an answer but never sent an offer.");
        return;
      }

      const remoteDesc = new RTCSessionDescription(answer);
      await chatConn.peerConnection.setRemoteDescription(remoteDesc);
      chatConn.answerCallback(chatConn, answer);
    } else {
      logger.debug(
        `Failed to accept answer. No connection open with ${senderUsername}`
      );
    }
  });

  // Listener for receiving an ICE candidate and adding it to the connection
  signallingSocket.on(
    "rtc-icecandidate",
    async ({ senderUsername, iceCandidate }) => {
      if (senderUsername in connections) {
        connections[senderUsername].peerConnection.addIceCandidate(
          iceCandidate
        );
      } else {
        logger.debug(
          `Received ICE candidate early. No connection open with ${senderUsername} (yet).`
        );
        iceCandidateQueue[senderUsername].push(iceCandidate);
      }
    }
  );
}

export function rtcHandshakeSignalsOff() {
  signallingSocket.off("rtc-offer");
  signallingSocket.off("rtc-answer");
  signallingSocket.off("rtc-icecandidate");
}

export function allowPeer(peerUsername: string) {
  if (allowedPeers.includes(peerUsername)) return;
  allowedPeers.push(peerUsername);
  signallingSocket.emit("chat-response", {
    recipientUsername: peerUsername,
    response: "accept",
  });
}

export function blockPeer(peerUsername: string) {
  allowedPeers = allowedPeers.filter((v) => v !== peerUsername);
  signallingSocket.emit("chat-response", {
    recipientUsername: peerUsername,
    response: "reject",
  });

  // Remove any pending ICE candidates
  delete iceCandidateQueue[peerUsername];
}

export function peerAllowed(peerUsername: string) {
  return allowedPeers.includes(peerUsername);
}

type SendOfferProps = {
  myUsername: string;
  recipientUsername: string;
  onAnswer: (
    chatConnection: ChatConnection,
    answer: RTCSessionDescriptionInit
  ) => void;
  onDataChannelCreated: DataChannelCreatedCallback;
  onClose?: CloseCallback;
};
export async function sendOffer({
  myUsername,
  recipientUsername,
  onAnswer,
  onDataChannelCreated,
  onClose,
}: SendOfferProps): Promise<ChatConnection> {
  logger.info(`Sending offer to ${recipientUsername}...`);
  const chatConn = await createChatConnection({
    myUsername,
    peerUsername: recipientUsername,
    onAnswer,
    onDataChannelCreated,
    onClose,
  });

  // Create a data channel
  chatConn.dataChannel =
    chatConn.peerConnection.createDataChannel("datachannel");
  chatConn.dataChannelCreatedCallback(chatConn);

  iceCandidateQueue[recipientUsername] = new Array(MAX_PENDING_ICE_CANDIDATES);

  // Send the offer
  const offer = await chatConn.peerConnection.createOffer();
  await chatConn.peerConnection.setLocalDescription(offer);
  signallingSocket.emit("rtc-offer", {
    recipientUsername: recipientUsername,
    offer,
  });

  // TODO: Use ACK for peer-not-found

  return chatConn;
}

export function onOffer(
  callback: (senderUsername: string, offer: RTCSessionDescriptionInit) => void
): void {
  offerCallback = callback;
}

type AcceptOfferProps = {
  myUsername: string;
  senderUsername: string;
  offer: RTCSessionDescriptionInit;
  onDataChannelCreated: DataChannelCreatedCallback;
  onClose?: CloseCallback;
};
export async function acceptOffer({
  myUsername,
  senderUsername,
  offer,
  onDataChannelCreated,
  onClose,
}: AcceptOfferProps): Promise<ChatConnection> {
  logger.info(`Accepting offer from ${senderUsername}...`);
  const chatConn = await createChatConnection({
    myUsername,
    peerUsername: senderUsername,
    onDataChannelCreated,
    onClose,
  });

  // Send answer
  chatConn.peerConnection.setRemoteDescription(
    new RTCSessionDescription(offer)
  );
  const answer = await chatConn.peerConnection.createAnswer();
  await chatConn.peerConnection.setLocalDescription(answer);
  signallingSocket.emit("rtc-answer", {
    recipientUsername: senderUsername,
    answer,
  });

  // Add early ICE candidates
  while (iceCandidateQueue[senderUsername].length) {
    const candidate = iceCandidateQueue[senderUsername].pop();
    logger.debug("Adding early ICE candidate %s", JSON.stringify(candidate));
    chatConn.peerConnection.addIceCandidate(candidate);
  }

  return chatConn;
}

type CreateChatConnectionProps = {
  myUsername: string;
  peerUsername: string;
  onAnswer?: AnswerCallback;
  onDataChannelCreated: DataChannelCreatedCallback;
  onClose?: CloseCallback;
};
async function createChatConnection({
  myUsername,
  peerUsername,
  onAnswer,
  onDataChannelCreated,
  onClose,
}: CreateChatConnectionProps): Promise<ChatConnection> {
  logger.debug("Creating connection...");

  const chatConn: ChatConnection = {
    username: myUsername,
    peerUsername,
    close: () => {},
    peerConnection: await createPeerConnection(),
    dataChannel: null,
    answerCallback: onAnswer,
    dataChannelCreatedCallback: onDataChannelCreated,
    closeCallback: onClose,
  };
  chatConn.close = () => {
    closeChatConnection(chatConn);
  };

  // Listen for new data channel and ICE candidates
  setUpPeerConnectionListeners(chatConn);

  connections[peerUsername] = chatConn;
  logger.debug("Connection now added to array");
  return chatConn;
}

function closeChatConnection(chatConnection: ChatConnection): void {
  if (chatConnection.closeCallback !== undefined) {
    chatConnection.closeCallback();
  }

  chatConnection.dataChannel?.close();
  chatConnection.peerConnection.close();

  delete connections[chatConnection.peerUsername];
}

async function createPeerConnection(): Promise<RTCPeerConnection> {
  const config = await getIceServers();
  const peerConnection = new RTCPeerConnection(config);
  return peerConnection;
}

/* Gets ICE servers from signalling server */
async function getIceServers(): Promise<IceServersConfig> {
  const response = await fetch(`${env.SIGNALLING_HTTP}/get-ice-servers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const { iceServers } = await response.json();
  return {
    iceServers,
  };
}

/**
 * Sets up required peerConnection listeners "datachannel" and "icecandidate".
 */
function setUpPeerConnectionListeners(chatConnection: ChatConnection): void {
  chatConnection.peerConnection.addEventListener("datachannel", (event) => {
    chatConnection.dataChannel = event.channel;
    chatConnection.dataChannelCreatedCallback(chatConnection);
  });

  chatConnection.peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      signallingSocket.emit("rtc-icecandidate", {
        recipientUsername: chatConnection.peerUsername,
        iceCandidate: event.candidate,
      });
    }
  });
}
