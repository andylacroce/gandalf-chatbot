import React from "react";
import styles from "../components/styles/ChatPage.module.css";

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  loading: boolean;
  apiAvailable: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  onKeyDown,
  loading,
  apiAvailable,
  inputRef,
}) => (
  <div className={styles.chatInputArea} data-testid="chat-input-area">
    <div className={styles.chatInputContainer} data-testid="chat-input-container">
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
      >
        {loading || !apiAvailable ? "HOLD" : "Send"}
      </button>
    </div>
  </div>
);

export default ChatInput;
