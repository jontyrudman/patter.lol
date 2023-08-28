import { PropsWithChildren } from "react";
import styles from "./Dialog.module.css";

interface DialogProps extends PropsWithChildren {
  open?: boolean;
  offsetX?: number;
  offsetY?: number;
}

export default function Dialog({
  open = true,
  offsetX,
  offsetY,
  children,
}: DialogProps) {
  return (
    <dialog
      className={styles.Dialog}
      style={{ top: `calc(4rem + ${offsetY ?? 0}px)`, left: `${offsetX ?? 0}px` }}
      open={open}
      aria-modal
    >
      {children}
    </dialog>
  );
}

export function DialogButtons({children}: PropsWithChildren) {
  return (
    <div className={styles.DialogButtons}>
      {children}
    </div>
  );
}
