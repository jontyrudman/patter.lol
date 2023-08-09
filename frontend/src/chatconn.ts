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
    console.log(`Failed to accept answer. No connection open with ${senderUsername}.`);
  }
});

// Listener for receiving an ICE candidate and adding it to the connection
signallingSocket.on("rtc-ice-candidate", async ({ senderUsername, iceCandidate }) => {
  if (senderUsername in activeChatConnections) {
    await activeChatConnections[senderUsername].addIceCandidate(iceCandidate);
  } else {
    console.log(`Failed to accept ICE candidate. No connection open with ${senderUsername}.`);
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

export class ChatConnection {
  peerConnection: RTCPeerConnection | undefined;
  dataChannel: RTCDataChannel | undefined;
  myUsername: string;
  recipientUsername: string;

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

    // Add event listener to our RTC connection for when local ICE candidates pop up
    this.peerConnection.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        signallingSocket.emit("rtc-ice-candidate", {
          recipientUsername: this.recipientUsername,
          iceCandidate: event.candidate,
        });
      }
    });

    this.peerConnection.addEventListener("connectionstatechange", () => {
      if (this.peerConnection === undefined) return;
      if (this.peerConnection.connectionState === "connected") {
        console.log("Connected");
      }
    });

    this.peerConnection.addEventListener("datachannel", (event) => {
      this.dataChannel = event.channel;
    });
  }

  async sendOffer() {
    await this.#createPeerConnection();
    if (this.peerConnection === undefined) throw Error("Can't send offer");

    this.dataChannel = this.peerConnection.createDataChannel("datachannel");

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
      await new Promise(resolve => setTimeout(resolve, 1000));
      count += 1;
    }
    if (this.peerConnection === undefined) throw Error("Can't receive ICE candidate");

    try {
      await this.peerConnection.addIceCandidate(iceCandidate);
    } catch (e) {
      console.error("Error adding received ice candidate", e);
    }
  }
}