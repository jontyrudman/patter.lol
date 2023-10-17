import { forwardRef, useRef } from "react";
import styles from "./Button.module.css";

// Use for visual Button click on submit, even with enter
const Form = forwardRef<HTMLFormElement, any>(
  ({ children, ...other }: any, forwardedRef) => {
    const localRef = useRef<HTMLFormElement | null>(null);

    localRef.current?.addEventListener("submit", () => {
      const submitButton: HTMLButtonElement | undefined | null =
        localRef.current?.querySelector("button[type='submit']");

      if (submitButton === undefined || submitButton === null) return;
      submitButton.classList.add(styles.active);
      setTimeout(() => {
        submitButton.classList.remove(styles.active);
      }, 250);
    });

    return (
      <form
        ref={(instance: HTMLFormElement) => {
          localRef.current = instance;
          if (typeof forwardedRef === "function") forwardedRef(instance);
          else if (forwardedRef !== null) forwardedRef.current = instance;
        }}
        {...other}
      >
        {children}
      </form>
    );
  },
);

export default Form;
