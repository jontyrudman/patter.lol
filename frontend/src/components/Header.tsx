import { useEffect } from "react";
import { signallingSocket } from "../api";
import styles from "./Header.module.css";
import LoadingDots from "./LoadingDots";
import { useChatDispatch, useChatState } from "../context";

export default function Header() {
  const { username } = useChatState();
  const chatDispatch = useChatDispatch();

  useEffect(() => {
    signallingSocket.on("assign-name", (name) =>
      chatDispatch({ type: "set-username", username: name })
    );

    return () => {
      signallingSocket.off("assign-name");
    };
  }, []);

  return (
    <div className={styles.header}>
      <div className={styles.siteName}>patter.lol</div>
      <div className={styles.username}>
        Your username is{" "}
        {username === null ? <LoadingDots /> : <b>{username}</b>}
      </div>
    </div>
  );
}
