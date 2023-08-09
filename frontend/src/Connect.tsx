import { FormEvent, useEffect, useRef, useState } from "react";
import signallingSocket from "./signallingSocket";
import { ChatConnection } from "./chatconn";

export default function Connect() {
  const [username, setUsername]: [string | undefined, Function] = useState();
  const recipientUsernameRef = useRef<HTMLInputElement>(null);

  const handleConnect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const recipientUsername = recipientUsernameRef.current?.value;
    if (recipientUsername === undefined || username === undefined) return;

    const chat = new ChatConnection(username, recipientUsername);
    chat.sendOffer();
  };

  // Listener for being assigned a name
  signallingSocket.on("assign-name", (name) => {
    setUsername(name);
  });

  // Listener for receiving an offer and sending an answer
  signallingSocket.on("rtc-offer", async ({ senderUsername, offer }) => {
    if (username === undefined) return;
    const chat = new ChatConnection(username, senderUsername);
    await chat.acceptOffer(offer);
  });

  useEffect(() => {
    signallingSocket.connect();

    return () => {
      signallingSocket.disconnect();
    };
  }, []);

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
