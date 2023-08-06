import { io } from "socket.io-client";

const signallingSocket = io(import.meta.env.VITE_SIGNALLING_SERVER, {
  autoConnect: false,
});

signallingSocket.onAny((...props) => {
  console.log("RTC rx: %s", JSON.stringify([...props]));
});

signallingSocket.onAnyOutgoing((...props) => {
  console.log("RTC tx: %s", JSON.stringify([...props]));
});

export default signallingSocket;
