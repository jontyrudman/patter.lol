import {
  Dispatch,
  createContext,
  useContext,
  useReducer,
} from "react";
import { chat } from "../api";

export type ChatConversation = {
  recipientUsername: string;
  historyBuffer: ChatMessage[];
};

export type ChatMessage = {
  senderUsername: string;
  message: string;
  timestamp: number;
};

type ChatContextState = {
  [conversationName: string]: ChatConversation;
};

type ChatDispatchActionMap = {
  "new-conversation": { type: "new-conversation", recipientUsername: string };
  "message-received": { type: "message-received"; message: string; senderUsername: string };
  "send-message": { type: "send-message"; message: string; recipientUsername: string };
};

type ChatDispatchActionType = keyof ChatDispatchActionMap;
type ChatDispatchAction<K extends ChatDispatchActionType> =
  ChatDispatchActionMap[K];

type ChatContextDispatch = Dispatch<ChatDispatchAction<ChatDispatchActionType>>;

const chatContext = createContext<ChatContextState>({});
const chatDispatchContext = createContext<ChatContextDispatch>(() => {});

export function useChatState() {
  return useContext(chatContext);
}

export function useChatDispatch() {
  return useContext(chatDispatchContext);
}

const initialChats: ChatContextState = {};

function chatReducer(
  chats: ChatContextState,
  action: ChatDispatchAction<ChatDispatchActionType>
): ChatContextState {
  switch (action.type) {
    case "new-conversation": {
      console.log(`Opening a new connection with ${action.recipientUsername}`);
      const newChats = { ...chats };
      newChats[action.recipientUsername] = {
        recipientUsername: action.recipientUsername,
        historyBuffer: [],
      };
      return newChats;
    }
    case "message-received": {
      console.log(`new message from ${action.senderUsername}: ${action.message}`);
      if (!(action.senderUsername in chats)) {
        console.log(`No conversation open with ${action.senderUsername}`);
      }
      const newChats = { ...chats };
      const incomingMessage: ChatMessage = {
        senderUsername: action.senderUsername,
        message: action.message,
        timestamp: Date.now(),
      };
      const conversation = chats[action.senderUsername];
      conversation.historyBuffer.push(incomingMessage);
      newChats[action.senderUsername] = conversation;
      console.log(newChats);

      return newChats;
    }
    case "send-message": {
      if (!(action.recipientUsername in chat.chatConnections) || !(action.recipientUsername in chats)) {
        console.log(`No connection open to ${action.recipientUsername}`);
      }
      const chatConnection = chat.chatConnections[action.recipientUsername];
      const newChats = { ...chats };
      const outgoingMessage: ChatMessage = {
        senderUsername: chatConnection.username,
        message: action.message,
        timestamp: Date.now(),
      };

      chatConnection.dataChannel?.send(action.message);
      newChats[action.recipientUsername].historyBuffer.push(outgoingMessage);

      return newChats;
    }
  }
  return chats;
}

export function ChatProvider({ children }: any) {
  const [chats, dispatch] = useReducer(chatReducer, initialChats);

  return (
    <chatContext.Provider value={chats}>
      <chatDispatchContext.Provider value={dispatch}>
        {children}
      </chatDispatchContext.Provider>
    </chatContext.Provider>
  );
}
