import { useEffect } from "react";
import { signallingSocket } from "../api";
import { useChatDispatch, useChatState } from "../context";
import {
  acceptOffer,
  allowPeer,
  blockPeer,
  connections,
  onOffer,
  peerAllowed,
  rtcHandshakeSignalsOff,
  rtcHandshakeSignalsOn,
} from "../api/chat";
import RequestList from "../components/RequestList";
import styles from "./Root.module.css";
import { Outlet, useNavigate } from "react-router";

export default function Root() {
  const { username } = useChatState();
  const chatDispatch = useChatDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    signallingSocket.connect();
    rtcHandshakeSignalsOn();

    signallingSocket.on("assign-name", (username) => {
      chatDispatch({ type: "set-username", username });
    });

    return () => {
      signallingSocket.off("assign-name");
      rtcHandshakeSignalsOff();
      signallingSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    onOffer((senderUsername, offer) => {
      if (username === null) throw Error("Username null");
      if (!peerAllowed(senderUsername)) throw Error("Peer not allowed");
      acceptOffer({
        myUsername: username,
        senderUsername,
        offer,
        onDataChannelCreated: (chatConn) => {
          chatDispatch({
            type: "new-conversation",
            recipientUsername: senderUsername,
          });
          chatConn.dataChannel?.addEventListener("message", (ev) => {
            chatDispatch({
              type: "receive-message",
              message: ev.data,
              senderUsername,
            });
          });
          navigate(`/chat/${senderUsername}`);
        },
        onClose: () => {
          console.log("Convo closed");
          navigate("/");
        },
      });
    });

    signallingSocket.on("chat-request", async ({ senderUsername }) => {
      if (senderUsername in connections)
        console.error(`Connection already open for peer ${senderUsername}`);

      chatDispatch({
        type: "new-request",
        requestorUsername: senderUsername,
        accept: () => {
          allowPeer(senderUsername);
        },
        reject: () => {
          blockPeer(senderUsername);
        },
      });
    });

    return () => {
      signallingSocket.off("chat-request");
    };
  }, [username]);

  return (
    <>
      <div className={styles.siteName}>patter.lol</div>
      <RequestList />
      <Outlet />
    </>
  );
}
