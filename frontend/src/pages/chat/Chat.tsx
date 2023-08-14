import { useChatDispatch } from "../../context";
import Connect from "./Connect";
import Conversation from "./Conversation";
import { chat, signallingSocket } from "../../api";
import { useEffect, useState } from "react";
import styles from "./Chat.module.css";
import LoadingDots from "../../components/LoadingDots";

export default function Chat() {
  const [username, setUsername] = useState();
  const [showConversation, setShowConversation] = useState(false);
  const [recipientUsername, setRecipientUsername] = useState("");
  // @ts-ignore
  const [loadingConn, setLoadingConn] = useState(false);
  const chatDispatch = useChatDispatch();

  const setUpDataChannelListeners = (chatConn: chat.ChatConnection) => {
    if (chatConn.dataChannel === null) throw Error("Data channel not ready");

    chatConn.dataChannel.addEventListener("open", () => {
      console.log("datachannel open");
      chatDispatch({
        type: "new-conversation",
        recipientUsername: chatConn.peerUsername,
      });
      setLoadingConn(false);
      setShowConversation(true);
    });

    chatConn.dataChannel.addEventListener("message", (e) => {
      console.log(`Message received: ${e.data}`);
      chatDispatch({
        type: "message-received",
        message: e.data,
        senderUsername: chatConn.peerUsername,
      });
    });
  };

  const sendOffer = (recipientUsername: string) => {
    setLoadingConn(true);

    chat.sendOffer({
      recipientUsername,
      onAnswer: (conn) => {
        console.log(`Received answer from ${conn.peerUsername}`);
        setUpDataChannelListeners(conn);
      },
      onDataChannelCreated: (conn) => {
        setUpDataChannelListeners(conn);
      },
    });

    setRecipientUsername(recipientUsername);

    return chat;
  };

  // Listener for being assigned a name
  signallingSocket.on("assign-name", (name) => {
    setUsername(name);
  });

  chat.onOffer(async (senderUsername, offer) => {
    setRecipientUsername(senderUsername);
    console.log(`Received offer from ${senderUsername}`);
    await chat.acceptOffer({
      offer,
      senderUsername,
      onDataChannelCreated: (conn) => {
        setUpDataChannelListeners(conn);
      },
    });
  });

  useEffect(() => {
    signallingSocket.connect();

    return () => {
      signallingSocket.disconnect();
    };
  }, []);

  return (
    <div className={styles.Chat}>
      <div className={styles.usernameHeadline}>
        Your username is{" "}
        {username === undefined ? <LoadingDots /> : <b>{username}</b>}
      </div>
      {showConversation ? (
        <Conversation conversationName={recipientUsername} />
      ) : (
        <Connect username={username} sendOffer={sendOffer} />
      )}
    </div>
  );
}
