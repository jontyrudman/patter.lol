import { useChatState } from "../ChatContext";
import Connect from "./Connect";
import Conversation from "./Conversation";
import { ChatConnection } from "../chatconn";
import { useChatDispatch } from "../ChatContext";
import { useEffect, useState } from "react";
import signallingSocket from "../signallingSocket";

export default function Chat() {
  const [username, setUsername] = useState();
  const [showConversation, setShowConversation] = useState(false);
  const [recipientUsername, setRecipientUsername] = useState("");
  const [loadingConn, setLoadingConn] = useState(false);
  const chatState = useChatState();
  const chatDispatch = useChatDispatch();

  const newChatConnection = (recipientUsername: string) => {
    if (username === undefined)
      throw Error("Can't create connection when username doesn't exist!");
    const chat = new ChatConnection(username, recipientUsername);

    chat.onReady(() => {
      console.log("ChatConnection ready");
      chatDispatch({ type: "new-conversation", recipientUsername });
      setLoadingConn(false);
      setShowConversation(true);
    });

    chat.onPeerNotFound(() => {
      setLoadingConn(false);
    });

    chat.onMessageReceived((message) => {
      console.log(`Message received: ${message}`);
      chatDispatch({
        type: "message-received",
        message: message,
        senderUsername: chat.recipientUsername,
      });
    });

    setRecipientUsername(recipientUsername);

    return chat;
  };

  const sendOffer = (recipientUsername: string) => {
    setLoadingConn(true);
    const chat = newChatConnection(recipientUsername);
    chat.sendOffer();
  };

  // Listener for being assigned a name
  signallingSocket.on("assign-name", (name) => {
    setUsername(name);
  });

  // Listener for receiving an offer and sending an answer
  signallingSocket.on("rtc-offer", async ({ senderUsername, offer }) => {
    if (username === undefined) return;
    const chat = newChatConnection(senderUsername);
    await chat.acceptOffer(offer);
  });

  useEffect(() => {
    signallingSocket.connect();

    return () => {
      signallingSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    console.log(JSON.stringify(chatState));
  }, [chatState]);

  if (showConversation) return <Conversation conversationName={recipientUsername} />;

  return <Connect username={username} sendOffer={sendOffer} />;
}
