import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { ChatMessage, useChatDispatch, useChatState } from "../context";
import styles from "./Chat.module.css";
import Message from "../components/Message";
import Button from "../components/Button";
import TextInput from "../components/TextInput";
import Form from "../components/Form";
import { useNavigate, useParams } from "react-router";
import Username from "../components/Username";

export default function Conversation() {
  const { recipientUsername } = useParams();
  const [message, setMessage] = useState("");
  const [messageHistory, setMessageHistory] = useState([] as ChatMessage[]);
  const { conversations, username } = useChatState();
  const chatDispatch = useChatDispatch();
  const navigate = useNavigate();

  const submitHandler = (e: FormEvent) => {
    if (recipientUsername === undefined) {
      navigate("/");
      return;
    }
    console.log(`Submitting ${message}`);
    e.preventDefault();

    setMessage("");
    chatDispatch({
      type: "send-message",
      recipientUsername,
      message: message,
    });
  };

  useEffect(() => {
    if (
      recipientUsername === undefined ||
      username === undefined ||
      !(recipientUsername in conversations)
    ) {
      console.log(recipientUsername, username, conversations);
      navigate("/");
      return;
    }
    setMessageHistory(conversations[recipientUsername]?.historyBuffer ?? []);
  }, [conversations, username, recipientUsername]);

  return (
    <>
      <Username />
      <div className={styles.ConversationContainer}>
        <div className={styles.ConversationHistory}>
          <p>
            You're talking to <b>{recipientUsername}</b>
          </p>
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
    </>
  );
}
