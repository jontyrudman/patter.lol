import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { ChatMessage, useChatDispatch, useChatState } from "../context";
import styles from "./Conversation.module.css";
import Message from "./Message";
import Button from "../components/Button";
import TextInput from "../components/TextInput";
import Form from "../components/Form";

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
    <div className={styles.ConversationContainer}>
      <div className={styles.ConversationHistory}>
        <p>You're talking to <b>{conversationName}</b></p>
        {messageHistory.map(({ senderUsername, message: m, timestamp }) => {
          return (
            <Message
              key={`msg_${senderUsername}_${timestamp}`}
              senderUsername={senderUsername}
              message={m}
              timestamp={timestamp}
            />
          );
        })}
      </div>
      <Form onSubmit={submitHandler} className={styles.sendForm}>
        <TextInput
          type="text"
          value={message}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setMessage(e.target.value)
          }
        />
        <Button type="submit">Send</Button>
      </Form>
    </div>
  );
}
