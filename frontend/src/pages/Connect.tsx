import styles from "./Connect.module.css";
import { useLocation, useNavigate } from "react-router";
import UserList from "../components/UserList";
import Break from "../components/Break";
import RequestList from "../components/RequestList";

export default function Connect() {
  const {pathname} = useLocation();
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
    </div>
  );
}
