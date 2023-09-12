import { v4 as uuid } from "uuid";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ChatConnection, acceptOffer, onOffer, sendOffer } from "../api/chat";
import { useChatDispatch, useChatState } from "../context";
import { useDialogDispatch } from "../context/DialogContext";

export default function Handshake() {
  const { state: locationState } = useLocation();
  const navigate = useNavigate();
  const { username } = useChatState();
  const chatDispatch = useChatDispatch();
  const dialogDispatch = useDialogDispatch();
  const [frozenState, setFrozenState] = useState<any>({});

  function initConversation(chatConn: ChatConnection, _peerUsername: string) {
    chatDispatch({
      type: "new-conversation",
      recipientUsername: _peerUsername,
    });
    chatConn.dataChannel?.addEventListener("message", (ev) => {
      chatDispatch({
        type: "receive-message",
        message: ev.data,
        senderUsername: _peerUsername,
      });
    });
    chatConn.dataChannel?.addEventListener("close", () => {
      const id = uuid();
      dialogDispatch({
        type: "open-dialog",
        dialog: {
          id,
          text: `${_peerUsername} has left the chat.`,
          buttons: [
            {
              text: "Okay :(",
              onClick: () => {
                chatConn.close();
                chatDispatch({
                  type: "remove-conversation",
                  recipientUsername: _peerUsername,
                });
                dialogDispatch({ type: "close-dialog", id });
                navigate("/");
              },
            },
          ],
        },
      });
    });
    navigate(`/chat/${_peerUsername}`);
  }

  /**
   * Wait for data channel to open before starting the chat
   */
  function onDataChannelCreated(
    chatConn: ChatConnection,
    _peerUsername: string,
  ) {
    // Race lock
    let initialised = false;

    chatConn.dataChannel?.addEventListener("open", () => {
      if (initialised) return;
      // Prevent the next if statement
      initialised = true;
      initConversation(chatConn, _peerUsername);
    });

    // If the event listener was added too late, check the state too
    if (!initialised && chatConn.dataChannel?.readyState === "open") {
      initialised = true;
      initConversation(chatConn, _peerUsername);
    }
  }

  function onChatConnClosed() {
    navigate("/");
  }

  useEffect(() => {
    if (locationState !== null) {
      setFrozenState(locationState);
    }
  }, [locationState]);

  useEffect(() => {
    if (username === null) {
      navigate("/");
      return;
    }

    if (frozenState.isInitiating === true) {
      sendOffer({
        myUsername: username,
        recipientUsername: frozenState.peerUsername,
        onAnswer: () => {},
        onDataChannelCreated: (chatConn) =>
          onDataChannelCreated(chatConn, frozenState.peerUsername),
        onClose: onChatConnClosed,
      });
    } else if (frozenState.isInitiating === false) {
      onOffer((senderUsername, offer) => {
        if (frozenState.peerUsername !== senderUsername)
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
  }, [frozenState]);

  return <p>Shaking the hand of {frozenState.peerUsername}...</p>;
}
