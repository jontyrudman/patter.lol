import { v4 as uuid } from "uuid";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { ChatConnection, acceptOffer, onOffer, sendOffer } from "../api/chat";
import { useChatDispatch, useChatState } from "../context";
import { useDialogDispatch } from "../context/DialogContext";

// TODO: Handle peer-not-found

export default function Handshake() {
  const { peerUsername, isInitiating } = useLocation().state;
  const navigate = useNavigate();
  const { username } = useChatState();
  const chatDispatch = useChatDispatch();
  const dialogDispatch = useDialogDispatch();

  function onDataChannelCreated(
    chatConn: ChatConnection,
    peerUsername: string
  ) {
    chatDispatch({
      type: "new-conversation",
      recipientUsername: peerUsername,
    });
    chatConn.dataChannel?.addEventListener("message", (ev) => {
      chatDispatch({
        type: "receive-message",
        message: ev.data,
        senderUsername: peerUsername,
      });
    });
    chatConn.dataChannel?.addEventListener("close", () => {
      const id = uuid();
      dialogDispatch({
        type: "open-dialog",
        dialog: {
          id,
          text: `${peerUsername} has left the chat.`,
          buttons: [
            {
              text: "Okay :(",
              onClick: () => {
                chatConn.close();
                chatDispatch({type: "remove-conversation", recipientUsername: peerUsername})
                dialogDispatch({ type: "close-dialog", id });
                navigate("/");
              },
            },
          ],
        },
      });
    });
    navigate(`/chat/${peerUsername}`);
  }

  function onChatConnClosed() {
    navigate("/");
  }

  useEffect(() => {
    if (username === null) {
      navigate("/");
      return;
    }

    if (isInitiating === true) {
      sendOffer({
        myUsername: username,
        recipientUsername: peerUsername,
        onAnswer: () => {},
        onDataChannelCreated: (chatConn) =>
          onDataChannelCreated(chatConn, peerUsername),
        onClose: onChatConnClosed,
      });
    } else if (isInitiating === false) {
      onOffer((senderUsername, offer) => {
        if (peerUsername !== senderUsername)
          throw Error("Offer received from different peer");
        if (username === null) throw Error("Username null");
        acceptOffer({
          myUsername: username,
          senderUsername,
          offer,
          onDataChannelCreated: (chatConn) =>
            onDataChannelCreated(chatConn, senderUsername),
          onClose: onChatConnClosed,
        });
      });
    }
  }, []);

  return <p>Shaking the hand of {peerUsername}...</p>;
}
