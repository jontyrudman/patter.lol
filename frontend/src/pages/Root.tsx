import { v4 as uuid } from "uuid";
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
import styles from "./Root.module.css";
import { useNavigate } from "react-router";
import { useDialogDispatch, useDialogState } from "../context/DialogContext";
import logger from "../utils/logger";
import Header from "../components/Header";
import AnimatedOutlet from "../layouts/AnimatedOutlet";
import AnimatedDialogs from "../layouts/AnimatedDialogs";

/**
 * Sets up the signalling server to handle our connection,
 * handshake and chat request events.
 */
function useSignallingServerSetup() {
  const chatDispatch = useChatDispatch();
  const dialogDispatch = useDialogDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    signallingSocket.connect();
    rtcHandshakeSignalsOn();

    signallingSocket.on("connect_error", () => {
      const id = uuid();
      dialogDispatch({
        type: "open-dialog",
        dialog: {
          id,
          text: "Couldn't connect to the signalling server!",
          buttons: [
            {
              text: "Retry",
              onClick: () => {
                signallingSocket.connect();
                dialogDispatch({ type: "close-dialog", id });
              },
            },
          ],
        },
      });
    });

    signallingSocket.on("assign-name", (username) => {
      chatDispatch({ type: "set-username", username });
    });

    signallingSocket.on("user-list", (users) => {
      chatDispatch({ type: "set-user-list", users });
    });

    // TODO: Do something better than this, like emitting with ack
    signallingSocket.on("blocked", () => {
      logger.error(
        "The last websocket request was blocked due to being too fast",
      );
    });

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

    signallingSocket.on(
      "chat-request-cancelled",
      async ({ senderUsername }) => {
        chatDispatch({
          type: "remove-request",
          requestorUsername: senderUsername,
        });
      },
    );

    return () => {
      signallingSocket.off("user-list");
      signallingSocket.off("assign-name");
      signallingSocket.off("blocked");
      signallingSocket.off("chat-request");
      signallingSocket.off("chat-request-cancelled");
      rtcHandshakeSignalsOff();
      signallingSocket.disconnect();
    };
  }, [chatDispatch, dialogDispatch, navigate]);
}

export default function Root() {
  const dialogState = useDialogState();
  useSignallingServerSetup();

  return (
    <>
      <AnimatedDialogs />
      <div
        className={styles.siteWideContainer}
        ref={node => node && (Object.values(dialogState).length > 0 ?
          node.setAttribute('inert', '') : node.removeAttribute('inert')
        )}
      >
        <Header />
        <AnimatedOutlet />
      </div>
    </>
  );
}
