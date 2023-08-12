import { io } from "socket.io-client";
import env from "../env";

const signallingSocket = io(env.SIGNALLING_WS, {
  autoConnect: false,
});

signallingSocket.onAny((...props) => {
  console.log("RTC rx: %s", JSON.stringify([...props]));
});

signallingSocket.onAnyOutgoing((...props) => {
  console.log("RTC tx: %s", JSON.stringify([...props]));
});

export default signallingSocket;
