import { FormEvent, useRef, useState } from "react";
import styles from "./Connect.module.css";
import Button from "../../components/Button";
import TextInput from "../../components/TextInput";
import Form from "../../components/Form";

type ConnectProps = {
  username: string | undefined;
  sendOffer: (recipientUsername: string) => void;
};

export default function Connect({ username, sendOffer }: ConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const recipientUsernameRef = useRef<HTMLInputElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const handleConnect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConnecting(true);

    const recipientUsername = recipientUsernameRef.current?.value;
    if (recipientUsername === undefined || username === undefined) return;

    sendOffer(recipientUsername);
  };

  return (
    <Form onSubmit={handleConnect} className={styles.ConnectForm}>
      <label>Who do you want to talk to?</label>
      <TextInput
        ref={recipientUsernameRef}
        type="text"
        name="recipientUsername"
      />
      <Button
        loadingText="Connecting"
        isLoading={connecting}
        type="submit"
        ref={connectButtonRef}
      >
        Connect
      </Button>
    </Form>
  );
}
