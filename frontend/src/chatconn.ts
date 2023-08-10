import signallingSocket from "./signallingSocket";
// @ts-ignore
import adapter from "webrtc-adapter";

type ActiveChatConnections = {
  [recipientUsername: string]: ChatConnection;
};
const activeChatConnections: ActiveChatConnections = {};

// Add answer event listener before we send an offer
signallingSocket.on("rtc-answer", async ({ senderUsername, answer }) => {
  if (senderUsername in activeChatConnections) {
    await activeChatConnections[senderUsername].acceptAnswer(answer);
  } else {
    console.log(
      `Failed to accept answer. No connection open with ${senderUsername}.`
    );
  }
});

// Listener for receiving an ICE candidate and adding it to the connection
signallingSocket.on(
  "rtc-icecandidate",
  async ({ senderUsername, iceCandidate }) => {
    if (senderUsername in activeChatConnections) {
      await activeChatConnections[senderUsername].addIceCandidate(iceCandidate);
    } else {
      console.log(
        `Failed to accept ICE candidate. No connection open with ${senderUsername}.`
      );
    }
  }
);

signallingSocket.on("rtc-peer-not-found", (username) => {
  console.log(`Peer ${username} not found`);
  if (username in activeChatConnections) {
    activeChatConnections[username].triggerPeerNotFound();
  }
});

async function getIceServers(username: string) {
  const response = await fetch(
    `http://${import.meta.env.VITE_SIGNALLING_SERVER}/get-ice-servers`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    }
  );
  const { iceServers } = await response.json();
  console.log("Received ICE servers: %s", JSON.stringify(iceServers));
  return {
    iceServers,
  };
}

type ListenerRecord<T, S> = {
  [K in keyof T]: (this: S, ev: T[K]) => void;
};

class ChatConnection {
  peerConnection: RTCPeerConnection | undefined;
  dataChannel: RTCDataChannel | undefined;
  myUsername: string;
  recipientUsername: string;
  #peerConnectionListeners: ListenerRecord<
    RTCPeerConnectionEventMap,
    RTCPeerConnection
  >[] = [];
  #dataChannelListeners: ListenerRecord<
    RTCDataChannelEventMap,
    RTCDataChannel
  >[] = [];
  #peerNotFoundListeners: Function[] = [];
  
  constructor(myUsername: string, recipientUsername: string) {
    if (recipientUsername in activeChatConnections)
      throw Error(`Chat with ${recipientUsername} already exists!`);
    this.recipientUsername = recipientUsername;
    this.myUsername = myUsername;
    activeChatConnections[recipientUsername] = this;
  }

  async #createPeerConnection() {
    const config = await getIceServers(this.myUsername);
    this.peerConnection = new RTCPeerConnection(config);
    // Add waiting event listeners
    for (const obj of this.#peerConnectionListeners) {
      const event = <keyof RTCPeerConnectionEventMap>Object.keys(obj)[0];
      const listener = <EventListenerOrEventListenerObject>(
        Object.values(obj)[0]
      );
      this.peerConnection.addEventListener(event, listener);
    }

    this.peerConnection.addEventListener("datachannel", (event) => {
      this.#setDataChannel(event.channel);
    });

    // Add event listener to our RTC connection for when local ICE candidates pop up
    this.peerConnection.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        signallingSocket.emit("rtc-icecandidate", {
          recipientUsername: this.recipientUsername,
          iceCandidate: event.candidate,
        });
      }
    });
  }

  #setDataChannel(dataChannel: RTCDataChannel) {
    this.dataChannel = dataChannel;

    // Add waiting event listeners
    for (const obj of this.#dataChannelListeners) {
      const event = <keyof RTCDataChannelEventMap>Object.keys(obj)[0];
      const listener = <EventListenerOrEventListenerObject>(
        Object.values(obj)[0]
      );
      this.dataChannel.addEventListener(event, listener);
    }
  }

  triggerPeerNotFound() {
    for (const fn of this.#peerNotFoundListeners) {
      fn();
    }
    this.dataChannel?.close();
    this.peerConnection?.close();
  }

  onPeerNotFound(listener: Function) {
    this.#peerNotFoundListeners.push(listener);
  }

  onPeerConnectionEvent<K extends keyof RTCPeerConnectionEventMap>(
    type: K,
    listener: (this: RTCPeerConnection, ev: RTCPeerConnectionEventMap[K]) => any
  ): void {
    if (this.peerConnection === undefined) {
      this.#peerConnectionListeners.push({ [type]: listener } as ListenerRecord<
        RTCPeerConnectionEventMap,
        RTCPeerConnection
      >);
      return;
    }

    this.peerConnection.addEventListener(type, listener);
  }

  onDataChannelEvent<K extends keyof RTCDataChannelEventMap>(
    type: K,
    listener: (this: RTCDataChannel, ev: RTCDataChannelEventMap[K]) => any
  ): void {
    if (this.dataChannel === undefined) {
      this.#dataChannelListeners.push({ [type]: listener } as ListenerRecord<
        RTCDataChannelEventMap,
        RTCDataChannel
      >);
      return;
    }

    this.dataChannel.addEventListener(type, listener);
  }

  onReady(listener: Function): void {
    this.onDataChannelEvent("open", () => {
      listener();
    });
  }
  
  // TODO: onClose

  onMessageReceived(listener: (message: string) => void): void {
    this.onDataChannelEvent("message", (event) => {
      listener(event.data);
    });
  }

  async sendChatMessage(message: string) {
    if (this.dataChannel === undefined)
      throw Error("No dataChannel to send message");

    this.dataChannel.send(message);
  }

  async sendOffer() {
    await this.#createPeerConnection();
    if (this.peerConnection === undefined) throw Error("Can't send offer");

    this.#setDataChannel(this.peerConnection.createDataChannel("datachannel"));

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    signallingSocket.emit("rtc-offer", {
      recipientUsername: this.recipientUsername,
      offer,
    });
  }

  async acceptOffer(offer: RTCSessionDescriptionInit) {
    await this.#createPeerConnection();
    if (this.peerConnection === undefined) throw Error("Can't receive offer");

    this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    signallingSocket.emit("rtc-answer", {
      recipientUsername: this.recipientUsername,
      answer,
    });
  }

  async acceptAnswer(answer: RTCSessionDescriptionInit) {
    if (this.peerConnection === undefined) throw Error("Can't receive answer");
    const remoteDesc = new RTCSessionDescription(answer);
    await this.peerConnection.setRemoteDescription(remoteDesc);
  }

  async addIceCandidate(iceCandidate: RTCIceCandidateInit) {
    let count = 0;
    while (this.peerConnection === undefined && count < 5) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      count += 1;
    }
    if (this.peerConnection === undefined)
      throw Error("Can't receive ICE candidate");

    try {
      await this.peerConnection.addIceCandidate(iceCandidate);
    } catch (e) {
      console.error("Error adding received ice candidate", e);
    }
  }
}

export { activeChatConnections, ChatConnection };
