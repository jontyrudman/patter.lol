import Button from "./Button";
import { useChatDispatch, useChatState } from "../context";
import styles from "./RequestList.module.css";
import { useEffect } from "react";
import { signallingSocket } from "../api";

export default function RequestList() {
  const { requests } = useChatState();
  const chatDispatch = useChatDispatch();
  const closeWrapper = (requestorUsername: string, fn: () => void) => {
    fn();
    chatDispatch({ type: "remove-request", requestorUsername });
  };

  // TODO: Add a timeout counter

  useEffect(() => {
    signallingSocket.on(
      "chat-request-cancelled",
      async ({ senderUsername }) => {
        chatDispatch({
          type: "remove-request",
          requestorUsername: senderUsername,
        });
      }
    );
  });

  if (Object.values(requests).length === 0) {
    return (
      <p className={styles.noOne}>
        No requests
      </p>
    );
  }

  return (
    <div className={styles.RequestList}>
      {Object.values(requests).map(
        ({ requestorUsername, accept, reject }, index) => (
          <div className={styles.request} key={`request_${index}`}>
            <span>
              <b>{requestorUsername}</b> wants to talk with you.
            </span>
            <div className={styles.buttons}>
              <Button onClick={() => closeWrapper(requestorUsername, accept)}>
                Accept
              </Button>
              <Button onClick={() => closeWrapper(requestorUsername, reject)}>
                Reject
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
