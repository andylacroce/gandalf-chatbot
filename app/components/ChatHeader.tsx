import React from "react";
import styles from "../components/styles/ChatPage.module.css";
import ToggleSwitch from "@trendmicro/react-toggle-switch";
import Image from "next/image";

interface ChatHeaderProps {
  audioEnabled: boolean;
  onAudioToggle: () => void;
  onDownloadTranscript: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ audioEnabled, onAudioToggle, onDownloadTranscript }) => (
  <div className={styles.chatHeader} data-testid="chat-header">
    <div className={styles.chatHeaderContent}>
      <div className={styles.toggleContainer} data-testid="toggle-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ToggleSwitch checked={audioEnabled} onChange={onAudioToggle} />
          <span className="toggle-label">Audio</span>
        </div>
        <div className={styles.downloadTranscriptWrapper}>
          <button
            className={styles.downloadTranscriptLink}
            onClick={onDownloadTranscript}
            type="button"
            aria-label="Download chat transcript"
          >
            <span className={styles.downloadIcon} aria-hidden="true">
              &#128190;
            </span>
            <span className={styles.downloadLabel}>Transcript</span>
          </button>
        </div>
      </div>
      <div className={styles.gandalfImageContainer}>
        <Image
          src="/gandalf.jpg"
          alt="Gandalf"
          priority={true}
          width={150}
          height={150}
          className="rounded-circle"
          style={{ objectFit: 'cover' }}
        />
      </div>
      <div className={styles.iconContainer}>
        <a
          href="https://mastodon.world/@AndyLacroce"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image src="/mastodon.png" alt="Mastodon" width={50} height={50} />
        </a>
        <a
          href="https://www.andylacroce.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image src="/dexter.webp" alt="Dexter" width={50} height={50} />
        </a>
      </div>
    </div>
  </div>
);

export default ChatHeader;
