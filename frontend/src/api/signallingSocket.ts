import { io } from "socket.io-client";

const TLS = (import.meta.env.VITE_TLS == "true");
const SIGNALLING_SERVER = import.meta.env.VITE_SIGNALLING_SERVER;
console.log(import.meta.env.VITE_TLS, SIGNALLING_SERVER);

const signallingSocket = io(`${TLS ? "wss" : "ws"}://${SIGNALLING_SERVER}`, {
  autoConnect: false,
});

signallingSocket.onAny((...props) => {
  console.log("RTC rx: %s", JSON.stringify([...props]));
});

signallingSocket.onAnyOutgoing((...props) => {
  console.log("RTC tx: %s", JSON.stringify([...props]));
});

export default signallingSocket;
