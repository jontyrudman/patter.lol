import styles from "./Connect.module.css";
import Form from "../components/Form";
import { useNavigate } from "react-router";
import { useChatState } from "../context";
import Username from "../components/Username";
import UserList from "../components/UserList";

export default function Connect() {
  const { username } = useChatState();
  const navigate = useNavigate();

  const handleConnect = (recipientUsername: string) => {
    if (recipientUsername === undefined || username === undefined) return;

    navigate(`/request/${recipientUsername}`);
  }

  return (
    <>
      <Username />
      <Form className={styles.ConnectForm}>
        <label>Who do you want to talk to?</label>
        <UserList onConnect={handleConnect} />
      </Form>
    </>
  );
}
