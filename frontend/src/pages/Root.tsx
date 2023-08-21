import { useEffect } from "react";
import { signallingSocket } from "../api";
import { useChatDispatch } from "../context";
import { allowPeer, blockPeer, onChatRequest } from "../api/chat";
import RequestList from "../components/RequestList";
import styles from "./Root.module.css";
import {Outlet, useNavigate} from "react-router";

export default function Root() {
  const chatDispatch = useChatDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    signallingSocket.connect();

    signallingSocket.on("assign-name", (username) => {
      chatDispatch({ type: "set-username", username });
    });

    onChatRequest((senderUsername) => {
      const accept = async () => {
        allowPeer(senderUsername);
        navigate(`/chat/${senderUsername}`);
      };
      const reject = async () => {
        blockPeer(senderUsername);
      };
      chatDispatch({
        type: "new-request",
        requestorUsername: senderUsername,
        accept,
        reject,
      });
    });

    // TODO: off chat request

    return () => {
      signallingSocket.off("assign-name");
      signallingSocket.disconnect();
    };
  }, []);

  return (
    <>
      <div className={styles.siteName}>patter.lol</div>
      <RequestList />
      <Outlet />
    </>
  );
}
