import { forwardRef } from "react";
import styles from "./TextInput.module.css";

const TextInput = forwardRef<HTMLInputElement, any>(
  ({ children, ...other }: any, ref) => {
    return (
      <input type="text" ref={ref} className={styles.TextInput} {...other}>
        {children}
      </input>
    );
  }
);

export default TextInput;
