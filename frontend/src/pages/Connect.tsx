import { FormEvent, useRef } from "react";
import styles from "./Connect.module.css";
import Button from "../components/Button";
import TextInput from "../components/TextInput";
import Form from "../components/Form";
import { useNavigate } from "react-router";
import { useChatState } from "../context";
import Username from "../components/Username";

export default function Connect() {
  const { username } = useChatState();
  const navigate = useNavigate();
  const recipientUsernameRef = useRef<HTMLInputElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const handleConnect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const recipientUsername = recipientUsernameRef.current?.value;
    if (recipientUsername === undefined || username === undefined) return;

    navigate(`request/${recipientUsername}`);
  };

  return (
    <>
      <Username />
      <Form onSubmit={handleConnect} className={styles.ConnectForm}>
        <label>Who do you want to talk to?</label>
        <TextInput
          ref={recipientUsernameRef}
          type="text"
          name="recipientUsername"
          required
        />
        <Button type="submit" ref={connectButtonRef}>
          Connect
        </Button>
      </Form>
    </>
  );
}
