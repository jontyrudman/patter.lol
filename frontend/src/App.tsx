import { ChatProvider } from "./context/ChatContext";
import styles from "./App.module.css";
import { RouterProvider } from "react-router";
import router from "./routes";

export default function App() {
  return (
    <div id={styles.App}>
      <ChatProvider>
        <RouterProvider router={router} />
      </ChatProvider>
    </div>
  );
}
