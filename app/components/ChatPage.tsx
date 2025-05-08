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
import ChatMessagesList from "./ChatMessagesList";
import { downloadTranscript } from "../../src/utils/downloadTranscript"; // Import the utility
import ToggleSwitch from "@trendmicro/react-toggle-switch";
import { v4 as uuidv4 } from "uuid"; // Import uuid
import "@trendmicro/react-toggle-switch/dist/react-toggle-switch.css";
import styles from "./styles/ChatPage.module.css";
import { useSession } from "./useSession";
import { useAudioPlayer } from "./useAudioPlayer";
import ChatInput from "./ChatInput";
import ChatStatus from "./ChatStatus";
import ApiUnavailableModal from "./ApiUnavailableModal";
import ChatHeader from "./ChatHeader";

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
  const [sessionId, sessionDatetime] = useSession(); // Use useSession hook
  const [audioFiles, setAudioFiles] = useState<string[]>([]); // Track all played audio files

  // Refs
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioEnabledRef = useRef(audioEnabled);
  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  const { playAudio, audioRef } = useAudioPlayer(audioEnabledRef);

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

      if (audioEnabledRef.current && gandalfReply.audioFileUrl) {
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
  }, [audioRef]);

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

  return (
    <div className={styles.chatLayout} data-testid="chat-layout">
      <ChatHeader
        audioEnabled={audioEnabled}
        onAudioToggle={handleAudioToggle}
        onDownloadTranscript={handleDownloadTranscript}
      />
      <ChatMessagesList
        messages={messages}
        messagesEndRef={messagesEndRef}
        className={styles.chatMessagesScroll}
      />
      {loading && (
        <div data-testid="loading-indicator" className={styles.spinnerContainerFixed}>
          <Image src="/ring.gif" alt="Loading..." width={40} height={40} unoptimized />
        </div>
      )}
      <ChatInput
        input={input}
        setInput={setInput}
        onSend={sendMessage}
        onKeyDown={handleKeyDown}
        loading={loading}
        apiAvailable={apiAvailable}
        inputRef={inputRef}
      />
      <ChatStatus error={error} />
      <ApiUnavailableModal show={!apiAvailable} />
    </div>
  );
};

export default ChatPage;
