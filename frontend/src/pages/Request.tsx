import { useNavigate, useParams } from "react-router";
import Button from "../components/Button";
import { useEffect } from "react";
import { useChatState } from "../context";
import { connections } from "../api/chat";
import { Link } from "react-router-dom";
import { signallingSocket } from "../api";
import Username from "../components/Username";

export default function Request() {
  const { recipientUsername } = useParams();
  const { username } = useChatState();
  const navigate = useNavigate();
  // TODO: Add a proper cancellation signal for the signalling server

  useEffect(() => {
    if (recipientUsername === undefined) {
      navigate("/");
      return;
    }

    signallingSocket.on(
      "chat-response",
      async ({ senderUsername, response }) => {
        if (senderUsername in connections)
          console.error(`Connection already open for peer ${senderUsername}`);

        if (recipientUsername !== senderUsername)
          throw Error("Response received not for this request");

        if (username === null) return;

        if (response === "accept") {
          navigate("/handshake", {
            state: { peerUsername: senderUsername, isInitiating: true },
          });
          return;
        }

        throw Error("Request rejected");
      }
    );

    signallingSocket.emit("chat-request", { recipientUsername });

    return () => {
      signallingSocket.off("chat-response");
    };
  }, []);

  return (
    <>
      <Username />
      <p>
        Requesting an audience with <b>{recipientUsername}</b>...
      </p>
      <Link to="/">
        <Button>Cancel</Button>
      </Link>
    </>
  );
}
