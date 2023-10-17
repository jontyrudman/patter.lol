import Button from "../components/Button";
import Dialog, { AnimateDialogs, DialogButtons } from "../components/Dialog";
import { useDialogState } from "../context/DialogContext";

export default function AnimatedDialogs() {
  const dialogState = useDialogState();

  return (
    <AnimateDialogs>
      {Object.values(dialogState).map(({ text, buttons, id }, index) => {
        return (
          <Dialog
            offsetX={index * 10}
            offsetY={index * 10}
            open
            key={`dialog_${id}`}
          >
            {text}
            <DialogButtons>
              {buttons.map(({ text, onClick }, btnIndex) => (
                <Button key={`dialogbtn_${id}_${btnIndex}`} onClick={onClick}>
                  {text}
                </Button>
              ))}
            </DialogButtons>
          </Dialog>
        );
      })}
    </AnimateDialogs>
  );
}
