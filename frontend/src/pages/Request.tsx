import { v4 as uuid } from "uuid";
import { useNavigate, useParams } from "react-router";
import Button from "../components/Button";
import { useEffect } from "react";
import { useChatDispatch, useChatState } from "../context";
import { connections } from "../api/chat";
import { Link } from "react-router-dom";
import { signallingSocket } from "../api";
import { useDialogDispatch } from "../context/DialogContext";
import logger from "../utils/logger";
import env from "../utils/env";

export default function Request() {
  const { recipientUsername } = useParams();
  const { username, requests } = useChatState();
  const chatDispatch = useChatDispatch();
  const navigate = useNavigate();
  const dialogDispatch = useDialogDispatch();

  // TODO: Add a timeout counter for cancelling

  useEffect(() => {
    if (recipientUsername === undefined) {
      navigate("/");
      return;
    }

    // If there's a request from this user that we haven't accepted, accept it
    if (recipientUsername in requests) {
      requests[recipientUsername].accept();
      chatDispatch({ type: "remove-request", requestorUsername: recipientUsername });
    }

    signallingSocket.on("rtc-peer-not-found", (peerUsername) => {
      if (peerUsername !== recipientUsername) return;

      const dialogId = uuid();
      dialogDispatch({
        type: "open-dialog",
        dialog: {
          id: dialogId,
          text: "User not found!",
          buttons: [
            {
              text: "Okay :(",
              onClick: () => {
                dialogDispatch({ type: "close-dialog", id: dialogId });
                navigate("/");
              },
            },
          ],
        },
      });
    });

    signallingSocket.on(
      "chat-response",
      async ({ senderUsername, response }) => {
        if (senderUsername in connections)
          logger.error(`Connection already open for peer ${senderUsername}`);

        if (recipientUsername !== senderUsername)
          logger.debug("Response received not for this request");

        if (username === null) return;

        if (response === "accept") {
          navigate("/handshake", {
            state: { peerUsername: senderUsername, isInitiating: true },
          });
          return;
        }

        const dialogId = uuid();
        dialogDispatch({
          type: "open-dialog",
          dialog: {
            id: dialogId,
            text: "Your request was rejected",
            buttons: [
              {
                text: "Okay :(",
                onClick: () => {
                  dialogDispatch({ type: "close-dialog", id: dialogId });
                  navigate("/");
                },
              },
            ],
          },
        });
      },
    );

    try {
      signallingSocket
        .timeout(env.SIGNALLING_TIMEOUT_MS)
        .emit("chat-request", { recipientUsername });
    } catch {
      const id = uuid();
      dialogDispatch({
        type: "open-dialog",
        dialog: {
          id,
          text: "Failed to send chat request",
          buttons: [
            {
              text: "Okay :(",
              onClick: () => {
                navigate("/");
                dialogDispatch({ type: "close-dialog", id });
              },
            },
          ],
        },
      });
    }

    return () => {
      signallingSocket.off("chat-response");
      signallingSocket.off("rtc-peer-not-found");
    };
  }, []);

  const handleCancel = () => {
    if (recipientUsername === undefined) return;
    signallingSocket.emit("chat-request-cancelled", { recipientUsername });
  };

  return (
    <div>
      <p>
        Requesting an audience with <b>{recipientUsername}</b>...
      </p>
      <Link to="/">
        <Button onClick={handleCancel}>Cancel</Button>
      </Link>
    </div>
  );
}
