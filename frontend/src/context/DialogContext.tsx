import { Dispatch, createContext, useContext, useReducer } from "react";

type DialogButton = {
  text: string;
  onClick: () => void;
};
type DialogData = {
  id: string;
  text: string;
  buttons: DialogButton[];
};

type DialogContextState = {
  [id: string]: DialogData;
};

type DialogDispatchActionType = keyof DialogDispatchActionMap;
type DialogDispatchAction<K extends DialogDispatchActionType> =
  DialogDispatchActionMap[K];

type DialogContextDispatch = Dispatch<
  DialogDispatchAction<DialogDispatchActionType>
>;

const initialDialogs: DialogContextState = {};
const dialogContext = createContext(initialDialogs);
const dialogDispatchContext = createContext<DialogContextDispatch>(() => {});

export function useDialogState() {
  return useContext(dialogContext);
}

export function useDialogDispatch() {
  return useContext(dialogDispatchContext);
}

type DialogDispatchActionMap = {
  "open-dialog": { type: "open-dialog"; dialog: DialogData };
  "close-dialog": { type: "close-dialog"; id: string };
};
function chatReducer(
  dialogs: DialogContextState,
  action: DialogDispatchAction<DialogDispatchActionType>
): DialogContextState {
  switch (action.type) {
    case "open-dialog": {
      const newDialogs = { ...dialogs };
      newDialogs[action.dialog.id] = action.dialog;
      return newDialogs;
    }
    case "close-dialog": {
      const newDialogs = { ...dialogs };
      delete newDialogs[action.id];
      return newDialogs;
    }
  }
  return dialogs;
}

export function DialogProvider({ children }: any) {
  const [chats, dispatch] = useReducer(chatReducer, initialDialogs);

  return (
    <dialogContext.Provider value={chats}>
      <dialogDispatchContext.Provider value={dispatch}>
        {children}
      </dialogDispatchContext.Provider>
    </dialogContext.Provider>
  );
}
