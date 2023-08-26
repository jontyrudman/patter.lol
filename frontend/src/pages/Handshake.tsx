import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { acceptOffer, onOffer, sendOffer } from "../api/chat";
import { useChatDispatch, useChatState } from "../context";

export default function Handshake() {
  const { peerUsername, isInitiating } = useLocation().state;
  const navigate = useNavigate();
  const { username } = useChatState();
  const chatDispatch = useChatDispatch();

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
        onDataChannelCreated: (chatConn) => {
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
          navigate(`/chat/${peerUsername}`);
        },
        onClose: () => {
          console.log("Connection closed");
          navigate("/");
        },
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
    }
  }, []);

  return <p>Shaking the hand of {peerUsername}...</p>;
}
