import { Chat } from "./chat";
import { ChatProvider } from "./context/ChatContext";
import styles from "./App.module.css";

export default function App() {
  return (
    <div id={styles.App}>
      <h1>patter.lol</h1>
      <ChatProvider>
        <Chat />
      </ChatProvider>
    </div>
  );
}
