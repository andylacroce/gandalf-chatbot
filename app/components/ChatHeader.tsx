import React from "react";
import styles from "./styles/ChatHeader.module.css";
import Image from "next/image";

interface ChatHeaderProps {
  onDownloadTranscript: () => void;
  onHeaderLinkClick?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ onDownloadTranscript, onHeaderLinkClick }) => (
  <div className={styles.chatHeader} data-testid="chat-header">
    <div className={styles.chatHeaderContent}>
      <div className={styles.headerLeft}>
        <div className="mt-2">
          <button
            className={`${styles.downloadTranscriptLink} flex items-center gap-1 ml-0`}
            type="button"
            aria-label="Download chat transcript"
            onClick={() => { onDownloadTranscript(); if (onHeaderLinkClick) onHeaderLinkClick(); }}
          >
            <span className={styles.downloadIcon} aria-hidden="true">
              &#128190;
            </span>
            <span className={styles.downloadLabel}>Transcript</span>
          </button>
        </div>
      </div>
      <div className={styles.headerCenter}>
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
      <div className={styles.headerRight}>
        <a
          href="https://mastodon.world/@AndyLacroce"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onHeaderLinkClick}
        >
          <Image src="/mastodon.png" alt="Mastodon" width={50} height={50} />
        </a>
        <a
          href="https://www.andylacroce.com/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onHeaderLinkClick}
        >
          <Image src="/dexter.webp" alt="Dexter" width={50} height={50} />
        </a>
      </div>
    </div>
  </div>
);

export default ChatHeader;
