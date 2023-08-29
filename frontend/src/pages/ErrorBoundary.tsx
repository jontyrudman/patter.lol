import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import logger from "../utils/logger";
import styles from "./Root.module.css";

export default function ErrorBoundary() {
  const error = useRouteError();
  logger.error(error);

  return (
    <div>
      <div className={styles.siteName}>patter.lol</div>
      <b>Oops! An error has occurred.</b>
      {isRouteErrorResponse(error) && (
        <>
          <br />
          <code>{error.statusText}</code>
        </>
      )}
      {(error instanceof Error) && (
        <>
          <br />
          <code>{error.message}</code>
        </>
      )}
    </div>
  );
}
