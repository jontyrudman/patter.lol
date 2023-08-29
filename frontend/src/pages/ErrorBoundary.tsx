import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import logger from "../utils/logger";

export default function ErrorBoundary() {
  const error = useRouteError();
  logger.error(error);

  return (
    <div>
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
