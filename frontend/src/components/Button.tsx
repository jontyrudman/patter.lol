import { forwardRef } from "react";
import styles from "./Button.module.css";

const Button = forwardRef<HTMLButtonElement, any>(
  ({ children, ...other }: any, ref) => {
    return (
      <button ref={ref} className={styles.Button} {...other}>
        {children}
      </button>
    );
  }
);

export default Button;
