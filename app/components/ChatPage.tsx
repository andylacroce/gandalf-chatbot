/**
 * Main chat interface component that manages the conversation with Gandalf.
 * @module ChatPage
 */

"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";
import "../globals.css";
import Image from "next/image";
import ChatMessage from "./ChatMessage";
import { downloadTranscript } from "../../src/utils/downloadTranscript"; // Import the utility
import ToggleSwitch from "@trendmicro/react-toggle-switch";
import { v4 as uuidv4 } from "uuid"; // Import uuid
import "@trendmicro/react-toggle-switch/dist/react-toggle-switch.css";
import styles from "./styles/ChatPage.module.css";

/**
 * Interface representing a chat message in the conversation.
 * @interface Message
 * @property {string} text - The content of the message.
 * @property {string} sender - The sender of the message ('User' or 'Gandalf').
 * @property {string} [audioFileUrl] - Optional URL to the audio file of the message.
 */
interface Message {
  text: string;
  sender: string;
  audioFileUrl?: string;
}

/**
 * ChatPage component that handles the chat interface and interactions with the Gandalf AI.
 * This component manages the state of the conversation, handles user input, and plays audio responses.
 *
 * @returns {JSX.Element} The ChatPage component.
 */
const ChatPage = () => {
  // State definitions
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [apiAvailable, setApiAvailable] = useState<boolean>(true);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>(""); // State for session ID
  const [sessionDatetime, setSessionDatetime] = useState<string>(""); // State for session datetime
  const [audioFiles, setAudioFiles] = useState<string[]>([]); // Track all played audio files

  // Refs
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate a new session ID and session datetime on every mount
  useEffect(() => {
    let newSessionId = "";
    let sessionDatetime = "";
    if (typeof window !== "undefined") {
      newSessionId = uuidv4();
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      sessionDatetime = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      sessionStorage.setItem("gandalf-session-id", newSessionId);
      sessionStorage.setItem("gandalf-session-datetime", sessionDatetime);
    }
    setSessionId(newSessionId);
    setSessionDatetime(sessionDatetime);
  }, []);

  // Extracts the file name from a URL, wrapped in useCallback for stable reference
  const extractFileName = useCallback((url: string): string => {
    const parsedUrl = new URL(url, window.location.origin);
    return parsedUrl.searchParams.get("file") || "";
  }, []);

  /**
   * Plays an audio file from the provided URL, ensuring only one audio plays at a time.
   * Stops and cleans up any previous playback before starting a new one.
   */
  const playAudio = useCallback(async (audioFileUrl: string) => {
    const currentFileName = extractFileName(audioFileUrl);
    setAudioFiles((prev) => {
      if (!prev.includes(currentFileName)) return [...prev, currentFileName];
      return prev;
    });
    if (audioRef.current) {
      if (typeof audioRef.current.pause === "function") {
        audioRef.current.pause();
      }
      if (typeof audioRef.current.currentTime === "number") {
        audioRef.current.currentTime = 0;
      }
    }
    // No more frontend cleanup of old files
    const audio = new Audio(audioFileUrl);
    audioRef.current = audio;
    if (typeof (audio as any)._paused !== "undefined") {
      (audio as any)._paused = false;
    }
    audio.play();
    audio.onended = async () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
    return audio;
  }, [extractFileName]);

  // Function to log message asynchronously
  const logMessage = useCallback(
    async (message: Message) => {
      if (!sessionId || !sessionDatetime) return;
      try {
        // Fire-and-forget POST request to the logging API
        await axios.post("/api/log-message", {
          sender: message.sender,
          text: message.text,
          sessionId: sessionId, // Send the session ID
          sessionDatetime: sessionDatetime, // Send the session datetime
        });
      } catch (error) {
        console.warn("Failed to log message:", error); // Log warning, don't block user
      }
    },
    [sessionId, sessionDatetime],
  ); // Add sessionId and sessionDatetime dependencies

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !apiAvailable || loading) return;

    const userMessage: Message = { sender: "User", text: input }; // Define user message object
    // Use functional update for adding user message to avoid stale state
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    const currentInput = input; // Capture input before clearing
    setInput("");
    setLoading(true);
    setError("");

    logMessage(userMessage); // Log the user's message

    try {
      // Use captured input for the API call
      const response = await axios.post("/api/chat", { message: currentInput });
      const gandalfReply: Message = {
        sender: "Gandalf",
        text: response.data.reply,
        audioFileUrl: response.data.audioFileUrl,
      };

      // Correctly append Gandalf's reply using functional update
      setMessages((prevMessages) => [...prevMessages, gandalfReply]);
      logMessage(gandalfReply); // Log Gandalf's reply

      // Update conversation history (consider if this also needs functional update)
      setConversationHistory((prevHistory) => [
        ...prevHistory,
        userMessage,
        gandalfReply,
      ]);

      if (audioEnabled && gandalfReply.audioFileUrl) {
        await playAudio(gandalfReply.audioFileUrl);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Error sending message. Please try again.");
    } finally {
      setLoading(false);
    }
    // Remove `input` from dependencies as we capture it locally
    // Remove `messages` and `conversationHistory` as we use functional updates
  }, [
    input,
    audioEnabled,
    playAudio,
    apiAvailable,
    logMessage,
    loading
  ]); // input added back to dependencies

  // Handle keyboard input (Enter key)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && apiAvailable && input.trim()) {
      sendMessage();
    }
  };

  /**
   * Toggles the audio playback functionality on and off.
   * When toggled off, it stops any currently playing audio and cleans up resources.
   */
  const handleAudioToggle = useCallback(() => {
    setAudioEnabled((prev) => {
      const newEnabled = !prev;
      if (!newEnabled) {
        // Only pause/reset audio, do not delete files
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }
      return newEnabled;
    });
  }, []);

  /**
   * Scrolls the chat box to the bottom when new messages arrive.
   * Uses direct scrollTop manipulation for reliability.
   */
  const scrollToBottom = useCallback(() => {
    if (chatBoxRef.current) {
      // Set scrollTop directly to the maximum scroll height
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Scroll to bottom on window resize (e.g., mobile keyboard appears)
  useEffect(() => {
    const handleResize = () => {
      scrollToBottom();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [scrollToBottom]);

  // Focus input field on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Scroll to bottom when input is focused (mobile keyboard)
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const handleFocus = () => scrollToBottom();
    input.addEventListener('focus', handleFocus);
    return () => input.removeEventListener('focus', handleFocus);
  }, [scrollToBottom]);

  // Re-focus input field after loading completes
  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading]);

  // Health check on mount
  useEffect(() => {
    axios
      .get("/api/health")
      .then(() => setApiAvailable(true))
      .catch(() => {
        setApiAvailable(false);
        setError(""); // Clear any previous error
      });
  }, []);

  // Download transcript handler - USE THE UTILITY
  const handleDownloadTranscript = async () => {
    try {
      await downloadTranscript(messages);
    } catch (err) {
      console.error("Failed to download transcript:", err);
      alert("Failed to download transcript.");
    }
  };

  /**
   * Render messages so the latest is last (bottom)
   */
  const renderedMessages = useMemo(
    () =>
      messages.map((msg, index) => <ChatMessage key={index} message={msg} />),
    [messages],
  );

  return (
    <div className={styles.chatLayout} data-testid="chat-layout">
      {/* Header fixed at the top */}
      <div className={styles.chatHeader} data-testid="chat-header">
        <div className={styles.chatHeaderContent}>
          <div className={styles.toggleContainer} data-testid="toggle-container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ToggleSwitch checked={audioEnabled} onChange={handleAudioToggle} />
              <span className="toggle-label">Audio</span>
            </div>
            <div className={styles.downloadTranscriptWrapper}>
              <button
                className={styles.downloadTranscriptLink}
                onClick={handleDownloadTranscript}
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

      {/* Main scrollable chat area */}
      <div
        className={styles.chatMessagesScroll}
        data-testid="chat-messages-container"
        ref={chatBoxRef}
      >
        {/* Spacer for header image (Gandalf) to reduce top margin */}
        <div style={{ height: 20, flex: '0 0 20px' }} />
        {renderedMessages}
        <div ref={messagesEndRef} />
        {/* Spacer for spinner so chat bubbles never overlap it */}
        <div style={{ height: loading ? 70 : 0, flex: `0 0 ${loading ? 70 : 0}px` }} />
      </div>

      {/* Spinner in a fixed-height, fixed-position div above the input bar */}
      {loading && (
        <div
          data-testid="loading-indicator"
          className={styles.spinnerContainerFixed}
        >
          <Image
            src="/ring.gif"
            alt="Loading..."
            width={40}
            height={40}
            unoptimized
          />
        </div>
      )}

      {/* Status area for error messages only */}
      <div className="chat-status-area" data-testid="chat-status-area">
        {error && (
          <div className="alert alert-danger" data-testid="error-message">
            {error}
          </div>
        )}
      </div>

      {/* Input area fixed at the bottom */}
      <div className={styles.chatInputArea} data-testid="chat-input-area" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: '100%', maxWidth: 800, zIndex: 10 }}>
        <div className={styles.chatInputContainer} data-testid="chat-input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className={styles.chatInput}
            placeholder={
              !apiAvailable || loading ? "" : "Type in your message here..."
            }
            ref={inputRef}
            disabled={loading || !apiAvailable}
            autoFocus
            data-testid="chat-input"
          />
          <button
            onClick={sendMessage}
            className={`${styles.chatSendButton} ${loading || !apiAvailable ? styles.disabled : ""}`}
            disabled={loading || !apiAvailable}
            data-testid="chat-send-button"
          >
            {loading || !apiAvailable ? "HOLD" : "Send"}
          </button>
        </div>
      </div>

      {/* API unavailable modal */}
      {!apiAvailable && (
        <div className="modal-backdrop" data-testid="modal-backdrop">
          <div
            className="modal-error"
            role="alert"
            data-testid="api-error-message"
          >
            <span
              className="api-error-title"
              style={{ color: "var(--color-text)" }}
            >
              Gandalf is resting his eyes.
            </span>
            <span className="api-error-desc">
              The chat is asleep for now. Please return soon!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
