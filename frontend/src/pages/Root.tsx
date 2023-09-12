import { AnimatePresence, motion } from "framer-motion";
import { v4 as uuid } from "uuid";
import { cloneElement, useEffect } from "react";
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
import { Outlet, useLocation, useNavigate, useOutlet } from "react-router";
import { useDialogDispatch, useDialogState } from "../context/DialogContext";
import Dialog, { DialogButtons } from "../components/Dialog";
import Button from "../components/Button";
import logger from "../utils/logger";
import Header from "../components/Header";

export default function Root() {
  const { username } = useChatState();
  const chatDispatch = useChatDispatch();
  const navigate = useNavigate();
  const dialogState = useDialogState();
  const dialogDispatch = useDialogDispatch();
  const { pathname } = useLocation();
  // Has to be done this way to get exit animations working
  const outlet = useOutlet();

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
        "The last websocket request was blocked due to being too fast"
      );
    });

    return () => {
      signallingSocket.off("user-list");
      signallingSocket.off("assign-name");
      signallingSocket.off("blocked");
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

  const pageVariants = {
    initial: {
      x: pathname === "/" ? "-100vw" : "100vw",
    },
    in: {
      x: "0",
    },
    out: {
      x: pathname === "/" ? "-100vw" : "100vw",
    },
  };

  const pageTransition = {
    type: "tween",
    ease: "linear",
    duration: 0.2,
  };

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
        <Header />
        <AnimatePresence mode="wait">
          <motion.main
            className={styles.main}
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {outlet}
          </motion.main>
        </AnimatePresence>
      </div>
    </>
  );
}
