import { AnimatePresence, motion } from "framer-motion";
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
    <motion.dialog
      className={styles.Dialog}
      style={{
        top: `calc(4rem + ${offsetY ?? 0}px)`,
        left: `${offsetX ?? 0}px`,
      }}
      open={open}
      aria-modal
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {children}
    </motion.dialog>
  );
}

/**
 * Wrap around Dialogs to get their animations to happen.
 */
export function AnimateDialogs({ children }: PropsWithChildren) {
  return <AnimatePresence>{children}</AnimatePresence>;
}

export function DialogButtons({ children }: PropsWithChildren) {
  return <div className={styles.DialogButtons}>{children}</div>;
}
