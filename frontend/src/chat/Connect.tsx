import { FormEvent, useRef } from "react";

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
    <div>
      <p>Your username is {username}</p>
      <form onSubmit={handleConnect}>
        <label>Chat with:</label>
        <input
          ref={recipientUsernameRef}
          type="text"
          name="recipientUsername"
        />
        <button type="submit">Connect</button>
      </form>
    </div>
  );
}
