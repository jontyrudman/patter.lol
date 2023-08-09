import { FormEvent, useEffect, useRef, useState } from "react";
import signallingSocket from "./signallingSocket";
// @ts-ignore
import adapter from "webrtc-adapter";

let rtcConfiguration = {};
let peerConnection: RTCPeerConnection | undefined;
let dataChannel: RTCDataChannel | undefined;

async function createPeerConnection(recipientUsername: string) {
  peerConnection = new RTCPeerConnection(rtcConfiguration);

  // Add event listener to our RTC connection for when local ICE candidates pop up
  peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      signallingSocket.emit("rtc-ice-candidate", {
        recipientUsername,
        iceCandidate: event.candidate,
      });
    }
  });

  peerConnection.addEventListener("connectionstatechange", () => {
    if (peerConnection === undefined) return;
    if (peerConnection.connectionState === "connected") {
      console.log("Connected");
    }
  });

  peerConnection.addEventListener("datachannel", (event) => {
    dataChannel = event.channel;

    dataChannel.addEventListener('message', event => {
      console.log(`New message: ${event.data}`);
    });
  });
}

async function sendOffer(recipientUsername: string) {
  if (peerConnection === undefined) throw Error("Can't send offer");
  dataChannel = peerConnection.createDataChannel("datachannel");

  dataChannel.addEventListener('message', event => {
    console.log(`New message: ${event.data}`);
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  signallingSocket.emit("rtc-offer", { recipientUsername, offer });
}

async function getICEServers(username: string) {
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
  rtcConfiguration = {
    iceServers,
  };
}

export default function Connect() {
  const [username, setUsername] = useState(null);
  const recipientUsernameRef = useRef<HTMLInputElement>(null);

  const handleConnect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const recipientUsername = recipientUsernameRef.current?.value;
    if (recipientUsername === undefined) return;

    createPeerConnection(recipientUsername);
    sendOffer(recipientUsername);
  };

  useEffect(() => {
    signallingSocket.connect();

    // Listener for being assigned a name
    signallingSocket.on("assign-name", (name) => {
      setUsername(name);
      getICEServers(name);
    });

    // Listener for receiving an offer and sending an answer
    signallingSocket.on("rtc-offer", async ({ senderUsername, offer }) => {
      createPeerConnection(senderUsername);
      if (peerConnection === undefined) throw Error("Can't receive offer");

      peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      signallingSocket.emit("rtc-answer", {
        recipientUsername: senderUsername,
        answer,
      });
    });

    // Add answer event listener before we send an offer
    signallingSocket.on("rtc-answer", async ({ answer }) => {
      if (peerConnection === undefined) throw Error("Can't receive answer");
      const remoteDesc = new RTCSessionDescription(answer);
      await peerConnection.setRemoteDescription(remoteDesc);
    });

    // Listener for receiving an ICE candidate and adding it to the connection
    signallingSocket.on("rtc-ice-candidate", async ({ iceCandidate }) => {
      // TODO: Better behaviour than this
      if (peerConnection === undefined)
        throw Error("Can't receive ICE candidate");
      try {
        await peerConnection.addIceCandidate(iceCandidate);
      } catch (e) {
        console.error("Error adding received ice candidate", e);
      }
    });

    return () => {
      signallingSocket.disconnect();
    };
  }, []);

  return (
    <div>
      <p>Your username is {username}</p>
      <form onSubmit={handleConnect}>
        <label>Chat with:</label>
        <input
          ref={recipientUsernameRef}
          type="text"
          name="recipientUsername"
        />
        <button type="submit">Connect</button>
      </form>
    </div>
  );
}
