import {
  ChangeEvent,
  FormEvent,
  RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChatMessage, useChatDispatch, useChatState } from "../context";
import styles from "./Chat.module.css";
import Message from "../components/Message";
import Button from "../components/Button";
import TextInput from "../components/TextInput";
import Form from "../components/Form";
import { useNavigate, useParams } from "react-router";
import logger from "../utils/logger";
import { connections } from "../api/chat";

function scrollToBottom(ref: RefObject<HTMLElement>) {
  ref.current?.scrollTo({
    top: ref.current.scrollHeight,
    behavior: "smooth",
  });
}

export default function Conversation() {
  const { recipientUsername } = useParams();
  const [message, setMessage] = useState("");
  const [messageHistory, setMessageHistory] = useState([] as ChatMessage[]);
  const [scrolledToLatest, setScrolledToLatest] = useState(true);
  const chatState = useChatState();
  const messagesRef = useRef<HTMLDivElement>(null);
  const chatDispatch = useChatDispatch();
  const navigate = useNavigate();

  const scrollHandler = () => {
    if (
      (messagesRef.current?.scrollTop ?? 0) +
        (messagesRef.current?.clientHeight ?? 0) ===
      messagesRef.current?.scrollHeight
    ) {
      setScrolledToLatest(true);
    } else {
      setScrolledToLatest(false);
    }
  };

  const submitHandler = (e: FormEvent) => {
    if (recipientUsername === undefined) {
      navigate("/");
      return;
    }
    e.preventDefault();

    setMessage("");
    chatDispatch({
      type: "send-message",
      recipientUsername,
      message: message,
    });
  };

  useEffect(() => {
    if (document.hidden) {
      const scrollToBottomOnVisible = function () {
        if (!document.hidden && scrolledToLatest) {
          // Scroll to bottom if we sent the message or if the user was already at the bottom before receiving a new message
          if (
            scrolledToLatest ||
            messageHistory.slice(-1)[0]?.senderUsername === chatState.username
          ) {
            scrollToBottom(messagesRef);
          }
          document.removeEventListener(
            "visibilitychange",
            scrollToBottomOnVisible
          );
        }
      };
      document.addEventListener("visibilitychange", scrollToBottomOnVisible);
    } else {
      if (
        scrolledToLatest ||
        messageHistory.slice(-1)[0]?.senderUsername === chatState.username
      ) {
        // Scroll to bottom if we sent the message or if the user was already at the bottom before receiving a new message
        scrollToBottom(messagesRef);
      }
    }
  }, [messageHistory]);

  useEffect(() => {
    if (
      recipientUsername === undefined ||
      chatState.username === undefined ||
      !(recipientUsername in chatState.conversations)
    ) {
      logger.error("You or the peer aren't initialised");
      logger.debug(
        recipientUsername,
        chatState.username,
        chatState.conversations
      );
      navigate("/");
      return;
    }

    setMessageHistory(
      [...chatState.conversations[recipientUsername]?.historyBuffer] ?? []
    );
  }, [chatState, recipientUsername]);

  const handleEndConversation = () => {
    if (recipientUsername === undefined) return;
    Object.entries(connections).forEach(([k, v]) => {
      if (k === recipientUsername) v.close();
    });

    chatDispatch({ type: "remove-conversation", recipientUsername });
  };

  return (
    <>
      <div className={styles.ConversationHistory}>
        <div className={styles.conversationHeader}>
          <span>
            You're talking to <b>{recipientUsername}</b>
          </span>
          <Button onClick={handleEndConversation}>End conversation</Button>
        </div>

        <div
          className={styles.messages}
          ref={messagesRef}
          onScroll={scrollHandler}
        >
          {messageHistory.map(({ senderUsername, message: m, timestamp }) => {
            return (
              <Message
                key={`msg_${senderUsername}_${timestamp}`}
                senderUsername={
                  senderUsername === chatState.username ? "me" : senderUsername
                }
                message={m}
                timestamp={timestamp}
              />
            );
          })}
        </div>
      </div>

      <Form onSubmit={submitHandler} className={styles.sendForm}>
        <TextInput
          type="text"
          value={message}
          required
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setMessage(e.target.value)
          }
        />
        <Button type="submit">Send</Button>
      </Form>
    </>
  );
}
