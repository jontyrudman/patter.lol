import styles from "./Connect.module.css";
import UserList from "../components/UserList";
import Break from "../components/Break";
import RequestList from "../components/RequestList";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useChatDispatch } from "../context";

export default function Connect() {
  const chatDispatch = useChatDispatch();

  // Dismiss return-home alert on render
  useEffect(() => {
    chatDispatch({ type: "dismiss-all-request-alerts" });
  }, [chatDispatch]);

  return (
    <div className={styles.connectContainer}>
      Who do you want to talk to?
      <div className={styles.usersAndRequests}>
        <span className={styles.users}>
          <div className={styles.listTitle}>Users online</div>
          <div className={styles.userListContainer}>
            <UserList />
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
      <Link to="/about">About patter.lol</Link>
    </div>
  );
}
