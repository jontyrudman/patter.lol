import { PropsWithChildren } from "react";

interface DialogProps extends PropsWithChildren {
  open: boolean;
}

export default function Dialog({ open, children }: DialogProps) {
  return <dialog open={open}>{children}</dialog>;
}
