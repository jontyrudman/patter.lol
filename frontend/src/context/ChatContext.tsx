import { Dispatch, createContext, useContext, useReducer } from "react";
import { chat } from "../api";
import logger from "../utils/logger";

export type ChatRequest = {
  requestorUsername: string;
  accept: () => void;
  reject: () => void;
};

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
  conversations: {
    [recipientName: string]: ChatConversation;
  };
  requests: { [requestorName: string]: ChatRequest };
  username: string | null;
  userList: string[] | null;
  alerts: {
    requestFrom: Set<string>;
    messageFrom: Set<string>;
  }
};

type ChatDispatchActionType = keyof ChatDispatchActionMap;
type ChatDispatchAction<K extends ChatDispatchActionType> =
  ChatDispatchActionMap[K];

type ChatContextDispatch = Dispatch<ChatDispatchAction<ChatDispatchActionType>>;

const initialChats: ChatContextState = {
  conversations: {},
  requests: {},
  username: null,
  userList: null,
  alerts: {
    requestFrom: new Set(),
    messageFrom: new Set(),
  },
};
const chatContext = createContext<ChatContextState>(initialChats);
const chatDispatchContext = createContext<ChatContextDispatch>(() => {});

export function useChatState() {
  return useContext(chatContext);
}

export function useChatDispatch() {
  return useContext(chatDispatchContext);
}

type ChatDispatchActionMap = {
  "set-username": { type: "set-username"; username: string | null };
  "set-user-list": { type: "set-user-list"; users: string[] };
  "new-conversation": { type: "new-conversation"; recipientUsername: string };
  "remove-conversation": {
    type: "remove-conversation";
    recipientUsername: string;
  };
  "receive-message": {
    type: "receive-message";
    message: string;
    senderUsername: string;
  };
  "send-message": {
    type: "send-message";
    message: string;
    recipientUsername: string;
  };
  "dismiss-all-request-alerts": {
    type: "dismiss-all-request-alerts";
  };
  "dismiss-message-alert": {
    type: "dismiss-message-alert";
    from: string;
  };
  "new-request": { type: "new-request" } & ChatRequest;
  "remove-request": { type: "remove-request"; requestorUsername: string };
};

function chatReducer(
  chats: ChatContextState,
  action: ChatDispatchAction<ChatDispatchActionType>,
): ChatContextState {
  switch (action.type) {
    case "set-username": {
      const newChats = { ...chats };
      newChats.username = action.username;
      return newChats;
    }
    case "set-user-list": {
      const newChats = { ...chats };
      newChats.userList = action.users;
      return newChats;
    }
    case "new-conversation": {
      logger.info(`Opening a new connection with ${action.recipientUsername}`);
      const newChats = { ...chats };
      newChats.conversations[action.recipientUsername] = {
        recipientUsername: action.recipientUsername,
        historyBuffer: [],
      };
      return newChats;
    }
    case "receive-message": {
      logger.info(
        `New message from ${action.senderUsername}: ${action.message}`,
      );
      if (!(action.senderUsername in chats.conversations)) {
        logger.error(`No conversation open with ${action.senderUsername}`);
      }
      const newChats = { ...chats };
      const incomingMessage: ChatMessage = {
        senderUsername: action.senderUsername,
        message: action.message,
        timestamp: Date.now(),
      };
      const conversation = chats.conversations[action.senderUsername];
      conversation.historyBuffer.push(incomingMessage);

      newChats.conversations[action.senderUsername] = conversation;
      newChats.alerts.messageFrom.add(action.senderUsername);

      return newChats;
    }
    case "send-message": {
      if (
        !(action.recipientUsername in chat.connections) ||
        !(action.recipientUsername in chats.conversations)
      ) {
        logger.error(`No connection open to ${action.recipientUsername}`);
      }
      logger.info(`Sending message "${action.message}"...`);
      const chatConnection = chat.connections[action.recipientUsername];
      const newChats = { ...chats };
      const outgoingMessage: ChatMessage = {
        senderUsername: chatConnection.username,
        message: action.message,
        timestamp: Date.now(),
      };

      chatConnection.dataChannel?.send(action.message);
      newChats.conversations[action.recipientUsername].historyBuffer.push(
        outgoingMessage,
      );

      return newChats;
    }
    case "dismiss-all-request-alerts": {
      logger.info(
        `Dismissing request alerts...`,
      );
      const newChats = { ...chats };
      newChats.alerts.requestFrom.clear();
      return newChats;
    }
    case "dismiss-message-alert": {
      logger.info(
        `Dismissing message alert from ${action.from}...`,
      );
      const newChats = { ...chats };
      newChats.alerts.messageFrom.delete(action.from);
      return newChats;
    }
    case "new-request": {
      logger.info(
        `Logging new chat request from ${action.requestorUsername}...`,
      );
      const newChats = { ...chats };
      newChats.requests[action.requestorUsername] = {
        requestorUsername: action.requestorUsername,
        accept: action.accept,
        reject: action.reject,
      };
      newChats.alerts.requestFrom.add(action.requestorUsername);
      return newChats;
    }
    case "remove-request": {
      logger.info(`Removing chat request from ${action.requestorUsername}...`);
      const newChats = { ...chats };
      delete newChats.requests[action.requestorUsername];
      return newChats;
    }
    case "remove-conversation": {
      logger.info(`Closing chat with ${action.recipientUsername}...`);
      const newChats = { ...chats };
      delete newChats.conversations[action.recipientUsername];
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
