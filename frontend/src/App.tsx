import { ChatProvider } from "./context/ChatContext";
import styles from "./App.module.css";
import { RouterProvider } from "react-router";
import router from "./routes";
import { DialogProvider } from "./context/DialogContext";

export default function App() {
  return (
    <div id={styles.App}>
      <ChatProvider>
        <DialogProvider>
          <RouterProvider router={router} />
        </DialogProvider>
      </ChatProvider>
    </div>
  );
}
