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
} from "react";
import axios from "axios";
import "../globals.css";
import Image from "next/image";
import ChatMessagesList from "./ChatMessagesList";
import { downloadTranscript } from "../../src/utils/downloadTranscript"; // Import the utility
import "@trendmicro/react-toggle-switch/dist/react-toggle-switch.css";
import styles from "./styles/ChatPage.module.css";
import { useSession } from "./useSession";
import { useAudioPlayer } from "./useAudioPlayer";
import ChatInput from "./ChatInput";
import ChatStatus from "./ChatStatus";
import ApiUnavailableModal from "./ApiUnavailableModal";
import ChatHeader from "./ChatHeader";
import { Message } from "../../src/types/message";
import { useChatScrollAndFocus } from "./useChatScrollAndFocus";
import { useApiError } from "./useApiError";

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
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [apiAvailable, setApiAvailable] = useState<boolean>(true);
  const [sessionId, sessionDatetime] = useSession(); // Use useSession hook
  const { error, setError, handleApiError } = useApiError();

  // Refs
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const audioEnabledRef = useRef(audioEnabled);
  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  const { playAudio, audioRef } = useAudioPlayer(audioEnabledRef);

  useChatScrollAndFocus({
    chatBoxRef,
    inputRef,
    messages,
    loading
  });

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
    const userMessage: Message = { sender: "User", text: input };
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

      if (audioEnabledRef.current && gandalfReply.audioFileUrl) {
        await playAudio(gandalfReply.audioFileUrl);
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
    // Remove `input` from dependencies as we capture it locally
    // Remove `messages` and `conversationHistory` as we use functional updates
  }, [
    input,
    playAudio,
    apiAvailable,
    logMessage,
    loading,
    handleApiError,
    setError // Added to satisfy exhaustive-deps lint rule
  ]); // input added back to dependencies per lint rule

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
    // Focus the input after toggling audio
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [audioRef, inputRef]);

  // Health check on mount
  useEffect(() => {
    axios
      .get("/api/health")
      .then(() => {
        setApiAvailable(true);
        // Focus input if available after health check
        if (inputRef.current) {
          inputRef.current.focus();
        }
      })
      .catch((err) => {
        setApiAvailable(false);
        handleApiError(err);
      });
  }, [handleApiError]);

  // Download transcript handler - USE THE UTILITY
  const handleDownloadTranscript = async () => {
    try {
      await downloadTranscript(messages);
    } catch (err) {
      console.error("Failed to download transcript:", err);
      alert("Failed to download transcript.");
    }
  };

  const handleHeaderLinkClick = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  return (
    <div className={styles.chatLayout} data-testid="chat-layout">
      <ChatHeader
        onDownloadTranscript={handleDownloadTranscript}
        onHeaderLinkClick={handleHeaderLinkClick}
      />
      <ChatMessagesList
        messages={messages}
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
        apiAvailable={apiAvailable && !(!apiAvailable)} // disables input if API is unavailable
        inputRef={inputRef}
        audioEnabled={audioEnabled}
        onAudioToggle={handleAudioToggle}
      />
      <ChatStatus error={error} />
      <ApiUnavailableModal show={!apiAvailable} />
    </div>
  );
};

export default ChatPage;
