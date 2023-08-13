import styles from "./Message.module.css";

type MessageProps = {
  senderUsername: string;
  message: string;
  timestamp: number;
};

export default function Message({
  senderUsername,
  message,
  timestamp,
}: MessageProps) {
  const datetime = new Date(timestamp as number);
  const today =
    new Date(Date.now()).toLocaleDateString() === datetime.toLocaleDateString();

  return (
    <div className={styles.Message}>
      <div>
        <b>{senderUsername}</b>
      </div>
      <div>{message}</div>
      <div style={{ textAlign: "right" }}>
        {!today && `${datetime.toLocaleDateString()} `}{datetime.toLocaleTimeString()}
      </div>
    </div>
  );
}
