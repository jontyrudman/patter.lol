import "./node_modules/webrtc-adapter/out/adapter.js";
import {io} from "./node_modules/socket.io-client/dist/socket.io.esm.min.js";

let messageSubmissionForm;
let sendButton;
let messagesContainer;
let messageTemplate;

function connectToSignallingServer() {
  const socket = io("ws://localhost:5000", {
  });

  socket.on("assign-name", (name) => {
    console.log("I have been assigned name %s", name);
  });
}

window.onload = () => {
  messageSubmissionForm = document.querySelector("#messageSubmissionForm");
  sendButton = messageSubmissionForm.querySelector("button");
  messagesContainer = document.querySelector("#messagesContainer");
  messageTemplate = document.querySelector("#messageTemplate");

  connectToSignallingServer();
}
