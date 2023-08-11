import { FormEvent, useEffect, useState } from "react";
import { ChatMessage, useChatDispatch, useChatState } from "../context";
import styles from "./Conversation.module.css";
import Message from "./Message";

type ConversationProps = {
  conversationName: string;
};

export default function Conversation({ conversationName }: ConversationProps) {
  const [message, setMessage] = useState("");
  const [messageHistory, setMessageHistory] = useState([] as ChatMessage[]);
  const chatState = useChatState();
  const chatDispatch = useChatDispatch();

  const submitHandler = (e: FormEvent) => {
    console.log(`Submitting ${message}`);
    e.preventDefault();

    setMessage("");
    chatDispatch({
      type: "send-message",
      recipientUsername: conversationName,
      message: message,
    });
  };

  useEffect(() => {
    setMessageHistory(chatState[conversationName].historyBuffer);
  }, [chatState]);

  return (
    <>
      <div className={styles.ConversationBox}>
        {messageHistory.map(({ senderUsername, message: m, timestamp }) => {
          return (
            <Message senderUsername={senderUsername} message={m} timestamp={timestamp} />
          );
        })}
      </div>
      <form onSubmit={submitHandler} className={styles.sendForm}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </>
  );
}
