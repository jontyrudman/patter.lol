import { Root, Request, Chat } from "./pages";
import { createBrowserRouter } from "react-router-dom";
import Connect from "./pages/Connect";
import Handshake from "./pages/Handshake";
import ErrorBoundary from "./pages/ErrorBoundary";

const router = createBrowserRouter([
  {
    // Select recipient
    path: "/",
    element: <Root />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Connect />,
      },
      {
        // Send recipient chat request
        path: "request/:recipientUsername",
        element: <Request />,
      },
      {
        path: "handshake",
        element: <Handshake />,
      },
      {
        // Chat with recipient
        path: "convo/:recipientUsername",
        element: <Chat />,
      },
    ],
  },
]);

export default router;
