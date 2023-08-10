import { Chat } from "./chat";
import "./App.css";
import { ChatProvider } from "./context/ChatContext";

export default function App() {
  return (
    <ChatProvider>
      <Chat />
    </ChatProvider>
  );
}
