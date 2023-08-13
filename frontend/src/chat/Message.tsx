import styles from "./Message.module.css";

type MessageProps = {
  senderUsername: string,
  message: string,
  timestamp: number,
}

export default function Message({senderUsername, message, timestamp}: MessageProps) {
  const datetime = new Date(timestamp as number);

  return (
    <div className={styles.Message}>
      <div><b>{senderUsername}:</b></div>
      <div>{message}</div>
      <div style={{ textAlign: "right" }}>{datetime.toLocaleDateString()} {datetime.toLocaleTimeString()}</div>
    </div>
  );
}
