import { FormEvent, useEffect, useRef, useState } from "react";
import signallingSocket from "./signallingSocket";
// @ts-ignore
import adapter from "webrtc-adapter";

const rtcConfiguration = {
  iceServers: [{ urls: "stun:stun2.1.google.com:19302" }],
};
let peerConnection: RTCPeerConnection | undefined;
// @ts-ignore
let dataChannel: RTCDataChannel | undefined;

async function initPeerConnection(recipientUsername: string) {
  peerConnection = new RTCPeerConnection(rtcConfiguration);
  dataChannel = peerConnection.createDataChannel("datachannel");

  // Add answer event listener before we send an offer
  signallingSocket.on("rtc-answer", async ({ senderUsername, answer }) => {
    console.log("answer from %s: %s", senderUsername, JSON.stringify(answer));
    if (peerConnection === undefined) return;
    const remoteDesc = new RTCSessionDescription(answer);
    await peerConnection.setRemoteDescription(remoteDesc);
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  signallingSocket.emit("rtc-offer", { recipientUsername, offer });

  // Add event listener to our RTC connection for when local ICE candidates pop up
  peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      signallingSocket.emit("rtc-ice-candidate", {
        recipientUsername,
        iceCandidate: event.candidate,
      });
    }
  });
}

export default function Connect() {
  const [username, setUsername] = useState(null);
  const recipientUsernameRef = useRef<HTMLInputElement>(null);

  const handleConnect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (recipientUsernameRef.current?.value === undefined) return;
    initPeerConnection(recipientUsernameRef.current.value);
  };

  useEffect(() => {
    signallingSocket.connect();

    // Listener for being assigned a name
    signallingSocket.on("assign-name", (name) => {
      setUsername(name);
    });

    // Listener for receiving an offer and sending an answer
    signallingSocket.on("rtc-offer", async ({ senderUsername, offer }) => {
      peerConnection = new RTCPeerConnection(rtcConfiguration);
      peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      signallingSocket.emit("rtc-answer", {
        recipientUsername: senderUsername,
        answer,
      });


      // Add event listener to our RTC connection for when local ICE candidates pop up
      peerConnection.addEventListener("icecandidate", (event) => {
        if (event.candidate) {
          signallingSocket.emit("rtc-ice-candidate", {
            recipientUsername: senderUsername,
            iceCandidate: event.candidate,
          });
        }
      });
    });

    // Listener for receiving an ICE candidate and adding it to the connection
    signallingSocket.on(
      "rtc-ice-candidate",
      async ({ iceCandidate }) => {
        // TODO: Better behaviour than this
        if (peerConnection === undefined) return;
        try {
          await peerConnection.addIceCandidate(iceCandidate);
        } catch (e) {
          console.error("Error adding received ice candidate", e);
        }
      }
    );

    peerConnection.addEventListener("datachannel", (event) => {
      dataChannel = event.channel;
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
