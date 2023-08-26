import { Root, Request, Chat } from "./pages";
import { createBrowserRouter } from "react-router-dom";
import Connect from "./pages/Connect";
import Handshake from "./pages/Handshake";

const router = createBrowserRouter([
  {
    // Select recipient
    path: "/",
    element: <Root />,
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
        element: <Chat />,
      },
    ],
  },
]);

export default router;
