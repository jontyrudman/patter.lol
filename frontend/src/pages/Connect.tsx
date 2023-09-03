import styles from "./Connect.module.css";
import { useNavigate } from "react-router";
import { useChatState } from "../context";
import UserList from "../components/UserList";
import Break from "../components/Break";
import RequestList from "../components/RequestList";

export default function Connect() {
  const { username } = useChatState();
  const navigate = useNavigate();

  const handleConnect = (recipientUsername: string) => {
    if (recipientUsername === undefined || username === undefined) return;

    navigate(`/request/${recipientUsername}`);
  };

  return (
    <>
      <div className={styles.connectContainer}>
        Who do you want to talk to?
        <div className={styles.usersAndRequests}>
          <span className={styles.users}>
            <div className={styles.listTitle}>Users online</div>
            <div className={styles.userListContainer}>
              <UserList onConnect={handleConnect} />
            </div>
          </span>
          <Break />
          <div className={styles.requests}>
            <div className={styles.listTitle}>Incoming requests</div>
            <div className={styles.requestListContainer}>
              <RequestList />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
