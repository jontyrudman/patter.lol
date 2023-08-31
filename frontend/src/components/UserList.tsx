import Button from "./Button";
import styles from "./UserList.module.css";
import { useChatState } from "../context";
import LoadingDots from "./LoadingDots";

type UserListProps = {
  onConnect: (username: string) => void;
};
export default function UserList({ onConnect }: UserListProps) {
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
            <Button onClick={() => onConnect(u)}>Connect</Button>
          </div>
        );
      })}
    </div>
  );
}
