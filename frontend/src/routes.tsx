import { Root, Request, Conversation } from "./pages";
import { createBrowserRouter } from "react-router-dom";
import Connect from "./pages/Connect";
import Handshake from "./pages/Handshake";
import ErrorBoundary from "./pages/ErrorBoundary";
import About from "./pages/About";

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
        path: "chat/:recipientUsername",
        element: <Conversation />,
      },
      {
        path: "about",
        element: <About />,
      }
    ],
  },
]);

export default router;
