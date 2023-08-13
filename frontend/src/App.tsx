import { Chat } from "./pages/chat";
import { ChatProvider } from "./context/ChatContext";
import styles from "./App.module.css";

export default function App() {
  return (
    <div id={styles.App}>
      <div className={styles.siteName}>patter.lol</div>
      <ChatProvider>
        <Chat />
      </ChatProvider>
    </div>
  );
}
