import { Link } from "react-router-dom";
import styles from "./About.module.css";

export default function About() {
  return (
    <div className={styles.aboutContainer}>
      <div className={styles.textContainer}>
        <h2>About</h2>
        <p><i>patter.lol</i> is a peer-to-peer chat app.</p>
        <p>
          When another user accepts your chat request, <i>patter</i> uses WebRTC to connect
          you both for the duration of your conversation.
          <br />
          If a true peer-to-peer connection can't be made, <i>patter</i> uses a TURN server
          to relay the data.
        </p>

      </div>

        <p>
          Created by{" "}
          <a href="https://jnthn.me" target="_blank" rel="noopener noreferrer">
            Jonathan Rudman
          </a>
          .
          <br />
          Deployed on{" "}
          <a href="https://fly.io" target="_blank" rel="noopener noreferrer">
            fly.io
          </a>
          .
          <br />
          TURN server provided by{" "}
          <a
            href="https://www.metered.ca"
            target="_blank"
            rel="noopener noreferrer"
          >
            Metered
          </a>
          .
          <br />
          Code hosted on{" "}
          <a
            href="https://github.com/jontyrudman/patter.lol"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          .
        </p>

      <div className={styles.footer}>
        <Link to="/">Back to connections</Link>
      </div>
    </div>
  );
}
