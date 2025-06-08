import React from "react";
import styles from "./styles/ChatInput.module.css";

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  loading: boolean;
  apiAvailable: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  audioEnabled: boolean;
  onAudioToggle: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  onKeyDown,
  loading,
  apiAvailable,
  inputRef,
  audioEnabled,
  onAudioToggle,
}) => (
  <div className={styles.chatInputArea} data-testid="chat-input-area">
    <div className={styles.chatInputContainer} data-testid="chat-input-container" role="group" aria-label="Chat input area">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        className={styles.chatInput}
        placeholder={!apiAvailable || loading ? "" : "Type in your message here..."}
        ref={inputRef}
        disabled={loading || !apiAvailable}
        autoFocus
        data-testid="chat-input"
        aria-label="Type your message"
        aria-disabled={loading || !apiAvailable}
      />
      <button
        onClick={onSend}
        className={
          loading || !apiAvailable
            ? `${styles.chatSendButton} ${styles.disabled}`
            : styles.chatSendButton
        }
        disabled={loading || !apiAvailable}
        data-testid="chat-send-button"
        aria-label={loading || !apiAvailable ? "Send disabled" : "Send message"}
      >
        {loading || !apiAvailable ? "HOLD" : "Send"}
      </button>
      <button
        type="button"
        onClick={onAudioToggle}
        className={styles.audioToggleButton}
        aria-label={audioEnabled ? "Disable audio replies" : "Enable audio replies"}
        aria-pressed={audioEnabled}
        data-testid="chat-audio-toggle"
        tabIndex={0}
      >
        {audioEnabled ? (
          // Modern outlined volume up icon
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 9v6h4l5 5V4l-5 5H5z" stroke="var(--button-bg)" strokeWidth="2" strokeLinejoin="round" fill="none"/>
            <path d="M16.5 8.5a5 5 0 010 7" stroke="var(--button-bg)" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <path d="M19 5a9 9 0 010 14" stroke="var(--button-bg)" strokeWidth="2" strokeLinecap="round" fill="none"/>
          </svg>
        ) : (
          // Modern outlined volume off icon
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 9v6h4l5 5V4l-5 5H5z" stroke="var(--disabled-bg)" strokeWidth="2" strokeLinejoin="round" fill="none"/>
            <line x1="21" y1="3" x2="3" y2="21" stroke="var(--disabled-bg)" strokeWidth="2"/>
          </svg>
        )}
      </button>
    </div>
  </div>
);

export default ChatInput;
