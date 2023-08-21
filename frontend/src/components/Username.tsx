import { useEffect } from "react";
import { useChatDispatch, useChatState } from "../context/ChatContext";
import { signallingSocket } from "../api";
import LoadingDots from "./LoadingDots";
import styles from "./Username.module.css";

export default function Username() {
  const { username } = useChatState();
  const chatDispatch = useChatDispatch();

  useEffect(() => {
    signallingSocket.on("assign-name", (name) =>
      chatDispatch({ type: "set-username", username: name })
    );

    return () => { signallingSocket.off("assign-name") };
  }, []);

  return (
    <div className={styles.Username}>
      Your username is{" "}
      {username === null ? <LoadingDots /> : <b>{username}</b>}
    </div>
  );
}
