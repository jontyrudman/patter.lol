import {useNavigate, useParams} from "react-router";
import Button from "../components/Button";
import {useEffect} from "react";
import {useChatDispatch, useChatState} from "../context";
import {onChatResponse, sendChatRequest} from "../api/chat";
import {Link} from "react-router-dom";
import {signallingSocket} from "../api";
import Username from "../components/Username";

export default function Request() {
  const { recipientUsername } = useParams();
  const { username } = useChatState();
  const chatDispatch = useChatDispatch();
  const navigate = useNavigate();
  // TODO: Add a proper cancellation signal for the signalling server
  
  useEffect(() => {
    if (recipientUsername === undefined) {
      navigate("/");
      return;
    }

    onChatResponse((senderUsername, response) => {
      if (recipientUsername !== senderUsername) throw Error("Response received not for this request");

      if (response === "accept") {
        navigate(`/chat/${senderUsername}`);
        return;
      }

      throw Error("Request rejected");
    });

    sendChatRequest(recipientUsername);

    // TODO: off chat response listener
  }, []);

  return (
    <>
      <Username />
      <p>Requesting an audience with <b>{recipientUsername}</b>...</p>
      <Link to="/">
        <Button>Cancel</Button>
      </Link>
    </>
  );
}
