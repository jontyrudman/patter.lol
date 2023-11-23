import {
  ChangeEvent,
  FormEvent,
  RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChatMessage, useChatDispatch, useChatState } from "../context";
import styles from "./Conversation.module.css";
import Message from "../components/Message";
import Button from "../components/Button";
import TextInput from "../components/TextInput";
import Form from "../components/Form";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { useNavigate, useParams } from "react-router";
import logger from "../utils/logger";
import { connections } from "../api/chat";
import { Link } from "react-router-dom";

function scrollToBottom(ref: RefObject<HTMLElement>) {
  ref.current?.scrollTo({
    top: ref.current.scrollHeight,
    behavior: "smooth",
  });
}

/**
 *
 * @returns messageHistory
 */
function useMessageHistory(recipientUsername: string | undefined) {
  const chatState = useChatState();
  const navigate = useNavigate();
  const [messageHistory, setMessageHistory] = useState([] as ChatMessage[]);

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

    setMessageHistory([
      ...(chatState.conversations[recipientUsername]?.historyBuffer ?? []),
    ]);
  }, [chatState, recipientUsername, navigate]);

  return messageHistory;
}

function useScrollToBottom(
  messageHistory: ChatMessage[],
  messagesContainerRef: RefObject<HTMLDivElement>,
  dismissAlert: () => void
) {
  const chatState = useChatState();
  const atBottom = useRef(true);
  const lastHistoryLen = useRef(messageHistory.length);

  const trackScroll = () => {
    if (
      (messagesContainerRef.current?.scrollTop ?? 0) +
        (messagesContainerRef.current?.clientHeight ?? 0) ===
      messagesContainerRef.current?.scrollHeight
    ) {
      atBottom.current = true;
    } else {
      atBottom.current = false;
    }
  };

  useEffect(() => {
    if (lastHistoryLen.current < messageHistory.length) {
      lastHistoryLen.current = messageHistory.length;
    } else {
      return;
    }

    /**
     * Scroll to bottom if we sent the message
     * or if the user was already at the bottom
     * before receiving a new message
     */
    const scrollToBottomConditional = () => {
      if (
        atBottom.current ||
        messageHistory.slice(-1)[0]?.senderUsername === chatState.username
      ) {
        scrollToBottom(messagesContainerRef);
        dismissAlert();
      }
    };

    if (document.hidden) {
      const scrollToBottomOnVisible = function () {
        if (!document.hidden && atBottom.current) {
          scrollToBottomConditional();
          document.removeEventListener(
            "visibilitychange",
            scrollToBottomOnVisible
          );
        }
      };
      document.addEventListener("visibilitychange", scrollToBottomOnVisible);
    } else {
      scrollToBottomConditional();
    }
  }, [messageHistory, chatState.username, messagesContainerRef]);

  return { trackScroll };
}

function Back({ currentRecipient }: { currentRecipient?: string }) {
  const { alerts } = useChatState();

  // Is there a new, valid request (more than one req and not the current user)?
  const newRequest =
    Object.keys(alerts.requests).length > 0 &&
    !(
      currentRecipient &&
      alerts.requests.hasOwnProperty(currentRecipient) &&
      Object.keys(alerts.requests).length === 1
    );
  // Same but for a new message
  const newMessage =
    Object.keys(alerts.messages).length > 0 &&
    !(
      currentRecipient &&
      alerts.messages.hasOwnProperty(currentRecipient) &&
      Object.keys(alerts.messages).length === 1
    );

  let text;
  if (newRequest) text = "New request";

  // Messages have priority
  if (newMessage) text = "New message";

  return (
    <Link to="/">
      <Button alertDot={text != undefined}>
        <FontAwesomeIcon icon={faArrowLeft} />
        {text ? <span style={{ marginLeft: "0.5rem" }}>{text}</span> : null}
      </Button>
    </Link>
  );
}

export default function Conversation() {
  const { recipientUsername } = useParams();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageHistory = useMessageHistory(recipientUsername);
  const chatState = useChatState();
  const navigate = useNavigate();
  const chatDispatch = useChatDispatch();

  const dismissAlert = () => {
    if (recipientUsername === undefined) return;
    chatDispatch({ type: "dismiss-message-alert", from: recipientUsername });
  };

  const { trackScroll } = useScrollToBottom(
    messageHistory,
    messagesContainerRef,
    dismissAlert
  );

  const [message, setMessage] = useState("");

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

  const handleEndConversation = async () => {
    if (recipientUsername === undefined) return;
    Object.entries(connections).forEach(([k, v]) => {
      if (k === recipientUsername) v.close();
    });

    chatDispatch({ type: "remove-conversation", recipientUsername });
    navigate("/");
  };

  return (
    <div className={styles.ConversationContainer}>
      <div className={styles.ConversationHistory}>
        <div className={styles.conversationHeader}>
          <div className={styles.headerBack}>
            <Back currentRecipient={recipientUsername} />
          </div>
          <div className={styles.headerText}>
            You're talking to <b>{recipientUsername}</b>
          </div>
          <div className={styles.headerEnd}>
            <Button onClick={handleEndConversation}>End conversation</Button>
          </div>
        </div>

        <div
          className={styles.messages}
          ref={messagesContainerRef}
          onScroll={trackScroll}
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
    </div>
  );
}
