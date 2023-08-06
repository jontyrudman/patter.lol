import { FormEvent, useEffect, useRef, useState } from "react";
import signallingSocket from "./signallingSocket";

async function connectToPeer(recipientUsername: string) {
  signallingSocket.emit("rtc-offer", recipientUsername);
}

export default function Connect() {
  const [username, setUsername] = useState(null);
  const recipientUsernameRef = useRef<HTMLInputElement>(null);

  const handleConnect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (recipientUsernameRef.current?.value === undefined) return;
    connectToPeer(recipientUsernameRef.current.value);
  };

  useEffect(() => {
    signallingSocket.connect();

    signallingSocket.on("assign-name", (name) => {
      setUsername(name);
    });

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
