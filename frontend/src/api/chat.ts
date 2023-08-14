import signallingSocket from "./signallingSocket";
import env from "../env";
// @ts-ignore
import adapter from "webrtc-adapter";

type ChatConnectionCloseCallback = () => void;
type ChatConnectionAnswerCallback = (
  chatConnection: ChatConnection,
  answer: RTCSessionDescriptionInit
) => void;
type DataChannelCreatedCallback = (chatConnection: ChatConnection) => void;

export type ChatConnection = {
  username: string;
  peerUsername: string;
  peerConnection: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  answerCallback?: ChatConnectionAnswerCallback;
  closeCallback?: ChatConnectionCloseCallback;
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
let username: string | null = null;

// Listener for being assigned a name
signallingSocket.on("assign-name", (name) => {
  username = name;
});

// For when we receive candidates before a ChatConnection has been created
const iceCandidateQueue: { [peerUsername: string]: RTCIceCandidateInit[] } = {};

export const chatConnections: { [peerUsername: string]: ChatConnection } = {};

signallingSocket.on("rtc-offer", async ({ senderUsername, offer }) => {
  if (username === null) throw Error("Username not set");
  if (senderUsername in chatConnections)
    console.error(`Connection already open for peer ${senderUsername}`);

  // Run callback from onOffer
  if (offerCallback === null) return;
  offerCallback(senderUsername, offer);
});

// Add answer event listener before we send an offer
signallingSocket.on("rtc-answer", async ({ senderUsername, answer }) => {
  if (username === null) throw Error("Username not set");

  if (senderUsername in chatConnections) {
    const chatConn = chatConnections[senderUsername];

    if (chatConn.answerCallback === undefined) {
      console.log("User received an answer but never sent an offer.");
      return;
    }

    const remoteDesc = new RTCSessionDescription(answer);
    await chatConn.peerConnection.setRemoteDescription(remoteDesc);
    chatConn.answerCallback(chatConn, answer);
  } else {
    console.error(
      `Failed to accept answer. No connection open with ${senderUsername}`
    );
  }
});

// Listener for receiving an ICE candidate and adding it to the connection
signallingSocket.on(
  "rtc-icecandidate",
  async ({ senderUsername, iceCandidate }) => {
    if (username === null) throw Error("Username not set");
    if (senderUsername in chatConnections) {
      chatConnections[senderUsername].peerConnection.addIceCandidate(
        iceCandidate
      );
    } else {
      console.log(
        `Received ICE candidate early. No connection open with ${senderUsername} (yet).`
      );
      iceCandidateQueue[senderUsername].push(iceCandidate);
    }
  }
);

type SendOfferProps = {
  recipientUsername: string;
  onAnswer: (
    chatConnection: ChatConnection,
    answer: RTCSessionDescriptionInit
  ) => void;
  onDataChannelCreated: DataChannelCreatedCallback;
  onClose?: ChatConnectionCloseCallback;
};
export async function sendOffer({
  recipientUsername,
  onAnswer,
  onDataChannelCreated,
  onClose,
}: SendOfferProps): Promise<ChatConnection> {
  console.log(`Sending offer to ${recipientUsername}...`);
  const chatConn = await createChatConnection({
    peerUsername: recipientUsername,
    onAnswer,
    onDataChannelCreated,
    onClose,
  });

  // Create a data channel
  chatConn.dataChannel =
    chatConn.peerConnection.createDataChannel("datachannel");
  chatConn.dataChannelCreatedCallback(chatConn);

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
  senderUsername: string;
  offer: RTCSessionDescriptionInit;
  onDataChannelCreated: DataChannelCreatedCallback;
  onClose?: ChatConnectionCloseCallback;
};
export async function acceptOffer({
  senderUsername,
  offer,
  onDataChannelCreated,
  onClose,
}: AcceptOfferProps): Promise<ChatConnection> {
  console.log(`Accepting offer from ${senderUsername}...`);
  iceCandidateQueue[senderUsername] = [];
  const chatConn = await createChatConnection({
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
  for (const candidate of [...iceCandidateQueue[senderUsername]] ?? []) {
    console.log("Adding early ICE candidate %s", JSON.stringify(candidate));
    chatConn.peerConnection.addIceCandidate(candidate);
  }

  return chatConn;
}

type CreateChatConnectionProps = {
  peerUsername: string;
  onAnswer?: ChatConnectionAnswerCallback;
  onDataChannelCreated: DataChannelCreatedCallback;
  onClose?: ChatConnectionCloseCallback;
};
async function createChatConnection({
  peerUsername,
  onAnswer,
  onDataChannelCreated,
  onClose,
}: CreateChatConnectionProps): Promise<ChatConnection> {
  console.log("Creating connection...");
  if (username === null) throw Error("Username not set");

  const chatConn: ChatConnection = {
    username,
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

  chatConnections[peerUsername] = chatConn;
  console.log("Connection in array");
  return chatConn;
}

function closeChatConnection(chatConnection: ChatConnection): void {
  if (chatConnection.closeCallback !== undefined) {
    chatConnection.closeCallback();
  }

  chatConnection.dataChannel?.close();
  chatConnection.peerConnection.close();

  delete chatConnections[chatConnection.peerUsername];
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
  console.log("Received ICE servers: %s", JSON.stringify(iceServers));
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
