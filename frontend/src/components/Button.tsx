import {
  ComponentPropsWithoutRef,
  forwardRef,
  useEffect,
  useState,
} from "react";
import styles from "./Button.module.css";
import LoadingDots from "./LoadingDots";
import getTextWidth from "../utils/getTextWidth";

interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  children: any;
  isLoading: boolean | undefined;
  loadingText: string | undefined;
}

const Button = forwardRef<HTMLButtonElement, any>(
  ({ children, isLoading, loadingText, ...other }: ButtonProps, ref) => {
    const [style, setStyle] = useState({});

    useEffect(() => {
      if (loadingText !== undefined) {
        const loadingTextWidth = getTextWidth(
          loadingText + "...",
          "600 16px / 24px Inter",
        );
        setStyle({
          width: `calc(${loadingTextWidth})`,
          textAlign: isLoading ? "left" : "center",
          boxSizing: "content-box",
        });
      }
    }, [loadingText, isLoading]);

    return (
      <button
        disabled={isLoading}
        style={style}
        ref={ref}
        className={styles.Button}
        {...other}
      >
        {isLoading === true && loadingText !== undefined ? (
          <>
            {loadingText}
            <LoadingDots />
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

export default Button;
