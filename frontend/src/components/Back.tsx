import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import styles from "./Back.module.css";

type BackProps = {
  text?: string;
};
export default function Back({ text = undefined }: BackProps) {
  return (
    <div
      className={
        text === undefined
          ? styles.borderContainerCircle
          : styles.borderContainerPill
      }
    >
      <button className={text === undefined ? styles.circle : styles.pill}>
        <FontAwesomeIcon icon={faArrowLeft} />
        {text}
      </button>
    </div>
  );
}
