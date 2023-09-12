import styles from "./UserList.module.css";
import { useChatState } from "../context";
import LoadingDots from "./LoadingDots";
import {Link} from "react-router-dom";
import Button from "./Button";

export default function UserList() {
  const { userList, username } = useChatState();

  return (
    <div className={styles.UserList}>
      {userList === null && (
        <p className={styles.noOne}>
          Loading users
          <LoadingDots />
        </p>
      )}
      {userList?.map((u: string, index) => {
        if (u === username && userList.length === 1) {
          return (
            <p key="userlistitem_noone" className={styles.noOne}>
              No one online right now :(
            </p>
          );
        }
        if (u === username) return null;
        return (
          <div className={styles.listItem} key={`userlistitem_${index}`}>
            <span>
              <b>{u}</b>
            </span>
            <Link to={`/request/${u}`}>
              <Button>Connect</Button>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
