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
import { useDialogState } from "../context/DialogContext";
import Dialog, { DialogButtons } from "../components/Dialog";
import Button from "../components/Button";

export default function Root() {
  const { username } = useChatState();
  const chatDispatch = useChatDispatch();
  const navigate = useNavigate();
  const dialogState = useDialogState();

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
          navigate("/handshake", {
            state: { peerUsername: senderUsername, isInitiating: false },
          });
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
      {Object.values(dialogState).map(({ text, buttons }, index) => {
        return (
          <Dialog offsetX={index * 10} offsetY={index * 10} open>
            {text}
            <DialogButtons>
              {buttons.map(({ text, onClick }) => (
                <Button onClick={onClick}>{text}</Button>
              ))}
            </DialogButtons>
          </Dialog>
        );
      })}
      {/* @ts-ignore */}
      <div className={styles.siteWideContainer} inert={Object.values(dialogState).length > 0 ? "" : undefined}>
        <div className={styles.siteName}>patter.lol</div>
        <RequestList />
        <Outlet />
      </div>
    </>
  );
}
