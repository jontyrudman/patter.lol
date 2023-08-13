type DialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  children: any;
}

export default function Dialog({ open, children }: DialogProps) {
  return (
    <dialog open={open}>
      {children}
    </dialog>
  );
}
