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

  // Refs
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate or persist session ID on component mount (use sessionStorage for per-tab/session logs)
  useEffect(() => {
    let storedSessionId = '';
    if (typeof window !== 'undefined') {
      storedSessionId = sessionStorage.getItem('gandalf-session-id') || '';
      if (!storedSessionId) {
        storedSessionId = uuidv4();
        sessionStorage.setItem('gandalf-session-id', storedSessionId);
      }
    }
    setSessionId(storedSessionId);
  }, []);

  /**
   * Plays an audio file from the provided URL, ensuring only one audio plays at a time.
   * Stops and cleans up any previous playback before starting a new one.
   */
  const playAudio = useCallback(async (audioFileUrl: string) => {
    // Always pause and reset previous audio before playing new audio
    if (audioRef.current) {
      if (typeof audioRef.current.pause === 'function') {
        audioRef.current.pause();
      }
      if (typeof audioRef.current.currentTime === 'number') {
        audioRef.current.currentTime = 0;
      }
      try {
        const previousAudioFileName = extractFileName(audioRef.current.src);
        if (previousAudioFileName && previousAudioFileName !== extractFileName(audioFileUrl)) {
          await axios.delete(`/api/delete-audio?file=${previousAudioFileName}`);
        }
      } catch (error) {
        console.error("Error deleting previous audio file:", error);
      }
      // Do NOT set audioRef.current = null here!
    }

    // Always create a new Audio instance for each playback
    const audio = new Audio(audioFileUrl);
    audioRef.current = audio;
    if (typeof (audio as any)._paused !== 'undefined') {
      (audio as any)._paused = false;
    }
    audio.play();

    audio.onended = async () => {
      try {
        const currentAudioFileName = extractFileName(audioFileUrl);
        await axios.delete(`/api/delete-audio?file=${currentAudioFileName}`);
      } catch (error) {
        console.error("Error deleting audio file:", error);
      }
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };

    return audio;
  }, []);

  // Function to log message asynchronously
  const logMessage = useCallback(async (message: Message) => {
    if (!sessionId) return; // Don't log if session ID isn't generated yet
    try {
      // Fire-and-forget POST request to the logging API
      await axios.post('/api/log-message', {
        sender: message.sender,
        text: message.text,
        sessionId: sessionId, // Send the session ID
      });
    } catch (error) {
      console.warn("Failed to log message:", error); // Log warning, don't block user
    }
  }, [sessionId]); // Add sessionId dependency

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
  }, [input, audioEnabled, playAudio, apiAvailable, logMessage, sessionId, loading]); // Updated dependencies

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
    setAudioEnabled(!audioEnabled);

    if (audioRef.current && audioEnabled) {
      // Pause and reset the current audio
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      // Delete the current audio file
      const currentAudioFileName = extractFileName(audioRef.current.src);
      axios
        .delete(`/api/delete-audio?file=${currentAudioFileName}`)
        .catch((error) => {
          console.error("Error deleting current audio file:", error);
        });

      // Clear the current audio ref
      audioRef.current = null;
    }
  }, [audioEnabled]);

  /**
   * Extracts the file name from a URL.
   * Parses the URL and extracts the 'file' query parameter.
   */
  const extractFileName = (url: string): string => {
    const parsedUrl = new URL(url, window.location.origin);
    return parsedUrl.searchParams.get("file") || "";
  };

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

  // Focus input field on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Re-focus input field after loading completes
  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading]);

  // Health check on mount
  useEffect(() => {
    axios.get("/api/health")
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
   * Correctly renders the messages so the latest is at the bottom (bottom-up)
   */
  const renderedMessages = useMemo(
    () => messages.map((msg, index) => 
      <ChatMessage key={index} message={msg} />
    ),
    [messages]
  );

  return (
    <div className="chat-layout">
      {/* Header area with Gandalf image and controls */}
      <div className="chat-header">
        <div className="toggle-container top-left" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ToggleSwitch checked={audioEnabled} onChange={handleAudioToggle} />
            <span className="toggle-label">Audio</span>
          </div>
          <div className="download-transcript-wrapper">
            <button
              className="download-transcript-link"
              onClick={handleDownloadTranscript}
              type="button"
              aria-label="Download chat transcript"
            >
              <span className="download-icon" aria-hidden="true">&#128190;</span>
              <span className="download-label">Transcript</span>
            </button>
          </div>
        </div>
        <div className="icon-container top-right">
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
        <div className="gandalf-image-container">
          <Image
            src="/gandalf.jpg"
            alt="Gandalf"
            priority={true}
            width={150}
            height={150}
            className="rounded-circle"
            style={{ objectFit: "cover" }}
          />
        </div>
      </div>

      {/* Main scrollable chat area */}
      <div className="chat-messages-container">
        <div className="chat-messages" ref={chatBoxRef} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          {renderedMessages}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Status area for spinner and error messages */}
      <div className="chat-status-area">
        {loading && (
          <div className="spinner-container" data-testid="loading-indicator">
            <Image
              src="/ring.gif"
              alt="Loading..."
              width={40}
              height={40}
              unoptimized
            />
          </div>
        )}
        {error && (
          <div className="alert alert-danger" data-testid="error-message">
            {error}
          </div>
        )}
      </div>

      {/* Input area fixed at the bottom */}
      <div className="chat-input-area">
        <div className="chat-input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="chat-input"
            placeholder={(!apiAvailable || loading) ? "" : "Type in your message here..."}
            ref={inputRef}
            disabled={loading || !apiAvailable}
            autoFocus
          />
          <button
            onClick={sendMessage}
            className={`chat-send-button ${loading || !apiAvailable ? "disabled" : ""}`}
            disabled={loading || !apiAvailable}
          >
            {(loading || !apiAvailable) ? "HOLD" : "Send"}
          </button>
        </div>
      </div>

      {/* API unavailable modal */}
      {!apiAvailable && (
        <div className="modal-backdrop">
          <div className="modal-error" role="alert" data-testid="api-error-message">
            <span className="api-error-title" style={{ color: 'var(--color-text)' }}>
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
