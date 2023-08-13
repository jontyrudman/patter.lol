import { FormEvent, useRef } from "react";
import styles from "./Connect.module.css";
import Button from "../components/Button";
import TextInput from "../components/TextInput";

type ConnectProps = {
  username: string | undefined;
  sendOffer: (recipientUsername: string) => void;
};

export default function Connect({ username, sendOffer }: ConnectProps) {
  const recipientUsernameRef = useRef<HTMLInputElement>(null);

  const handleConnect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const recipientUsername = recipientUsernameRef.current?.value;
    if (recipientUsername === undefined || username === undefined) return;

    sendOffer(recipientUsername);
  };

  return (
    <form onSubmit={handleConnect}>
      <div className={styles.ConnectForm}>
        <label>Who do you want to talk to?</label>
        <TextInput
          ref={recipientUsernameRef}
          type="text"
          name="recipientUsername"
        />
        <Button type="submit">Connect</Button>
      </div>
    </form>
  );
}
