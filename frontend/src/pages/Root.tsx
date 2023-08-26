import { useEffect } from "react";
import { signallingSocket } from "../api";
import { useChatDispatch, useChatState } from "../context";
import {
  allowPeer,
  blockPeer,
  connections,
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
    signallingSocket.on("chat-request", async ({ senderUsername }) => {
      if (senderUsername in connections)
        console.error(`Connection already open for peer ${senderUsername}`);

      chatDispatch({
        type: "new-request",
        requestorUsername: senderUsername,
        accept: () => {
          allowPeer(senderUsername);
          navigate("/handshake", { state: { peerUsername: senderUsername, isInitiating: false } })
        },
        reject: () => {
          blockPeer(senderUsername);
          // TODO: Do something
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
