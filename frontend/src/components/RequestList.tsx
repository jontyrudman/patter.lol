import Button from "./Button";
import { useChatDispatch, useChatState } from "../context";
import styles from "./RequestList.module.css";

export default function RequestList() {
  const { requests } = useChatState();
  const chatDispatch = useChatDispatch();
  const closeWrapper = (requestorUsername: string, fn: () => void) => {
    fn();
    chatDispatch({ type: "remove-request", requestorUsername });
  };

  // TODO: Add a timeout counter

  if (Object.values(requests).length === 0) {
    return null;
  }

  return (
    <div className={styles.RequestList}>
      {Object.values(requests).map(({ requestorUsername, accept, reject }) => (
        <div className={styles.request}>
          <p><b>{requestorUsername}</b> wants to talk with you.</p>
          <Button onClick={() => closeWrapper(requestorUsername, reject)}>
            Reject
          </Button>
          <Button onClick={() => closeWrapper(requestorUsername, accept)}>
            Accept
          </Button>
        </div>
      ))}
    </div>
  );
}
