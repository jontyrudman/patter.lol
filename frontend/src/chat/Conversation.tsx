import { FormEvent, useEffect, useState } from "react";
import { ChatMessage, useChatDispatch, useChatState } from "../ChatContext";

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
      <div
        style={{ width: "500px", height: "500px", border: "1px solid white", overflow: 'auto' }}
      >
        {messageHistory.map(({ senderUsername, message: m, timestamp }) => {
          return (
            <p>
              {senderUsername}: {m} - {timestamp}
            </p>
          );
        })}
      </div>
      <form onSubmit={submitHandler}>
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
