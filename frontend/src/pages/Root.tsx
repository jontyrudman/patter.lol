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
import logger from "../utils/logger";

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
        logger.error(`Connection already open for peer ${senderUsername}`);

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
        },
      });
    });

    return () => {
      signallingSocket.off("chat-request");
    };
  }, [username]);

  return (
    <>
      {Object.values(dialogState).map(({ text, buttons, id }, index) => {
        return (
          <Dialog
            offsetX={index * 10}
            offsetY={index * 10}
            open
            key={`dialog_${id}`}
          >
            {text}
            <DialogButtons>
              {buttons.map(({ text, onClick }, btnIndex) => (
                <Button key={`dialogbtn_${id}_${btnIndex}`} onClick={onClick}>
                  {text}
                </Button>
              ))}
            </DialogButtons>
          </Dialog>
        );
      })}
      <div
        className={styles.siteWideContainer}
        /* @ts-ignore */
        inert={Object.values(dialogState).length > 0 ? "" : undefined}
      >
        <div className={styles.siteName}>patter.lol</div>
        <RequestList />
        <Outlet />
      </div>
    </>
  );
}
