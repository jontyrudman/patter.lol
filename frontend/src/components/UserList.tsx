import styles from "./UserList.module.css";
import { useChatState } from "../context";
import LoadingDots from "./LoadingDots";
import { Link } from "react-router-dom";
import Button from "./Button";

function LoadingUsers() {
  return (
    <p className={styles.noOne}>
      Loading users
      <LoadingDots />
    </p>
  );
}

function NoOneOnline() {
  return (
    <p key="userlistitem_noone" className={styles.noOne}>
      No one online right now :(
    </p>
  );
}

function ChatWithUser({
  username
}: {
  username: string
}) {
  const { conversations, alerts } = useChatState();
  const alreadyConnected = Object.keys(conversations).includes(username);
  const alert = alreadyConnected && alerts.messages.hasOwnProperty(username);

  return (
    <div className={styles.listItem}>
      <span>
        <b>{username}</b>
      </span>
      {alreadyConnected ? (
        <Link to={`/chat/${username}`}>
          <Button alertDot={alert}>Return to chat</Button>
        </Link>
      ) : (
        <Link to={`/request/${username}`}>
          <Button>Connect</Button>
        </Link>
      )}
    </div>
  );
}

export default function UserList() {
  const { userList, username: myUsername } = useChatState();

  return (
    <div className={styles.UserList}>
      {userList === null && <LoadingUsers />}

      {userList?.length === 1 && <NoOneOnline />}

      {userList?.map((u: string, index) => {
        if (u === myUsername) {
          return null;
        } else {
          return (
            <ChatWithUser
              username={u}
              key={`userlist_item_${index}`}
            />
          );
        }
      })}
    </div>
  );
}
