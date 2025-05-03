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
import ToggleSwitch from "@trendmicro/react-toggle-switch";
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
  /** @state {Message[]} Current messages in the conversation */
  const [messages, setMessages] = useState<Message[]>([]);

  /** @state {string} Current user input */
  const [input, setInput] = useState<string>("");

  /** @state {boolean} Whether a request is in progress */
  const [loading, setLoading] = useState<boolean>(false);

  /** @state {string} Error message if any */
  const [error, setError] = useState<string>("");

  /** @state {boolean} Whether audio responses are enabled */
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  /** @state {boolean} Whether the API is available */
  const [apiAvailable, setApiAvailable] = useState<boolean>(true);

  /** @ref Reference to the chat box container for auto-scrolling */
  const chatBoxRef = useRef<HTMLDivElement>(null);

  /** @ref Reference to the input field for auto-focusing */
  const inputRef = useRef<HTMLInputElement | null>(null);

  /** @state {Message[]} Complete conversation history */
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);

  /** @state {HTMLAudioElement | null} Currently playing audio element */
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null,
  );

  /** @ref Persistent Audio element to ensure only one plays at a time */
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Plays an audio file from the provided URL, ensuring only one audio plays at a time.
   * Stops and cleans up any previous playback before starting a new one.
   */
  const playAudio = useCallback(async (audioFileUrl: string) => {
    // Stop and clean up previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      try {
        const previousAudioFileName = extractFileName(audioRef.current.src);
        if (previousAudioFileName !== extractFileName(audioFileUrl)) {
          await axios.delete(`/api/delete-audio?file=${previousAudioFileName}`);
        }
      } catch (error) {
        console.error("Error deleting previous audio file:", error);
      }
      audioRef.current = null;
    }

    // Create and play new audio
    const audio = new Audio(audioFileUrl);
    audioRef.current = audio;
    audio.play();

    audio.onended = async () => {
      try {
        const currentAudioFileName = extractFileName(audioFileUrl);
        await axios.delete(`/api/delete-audio?file=${currentAudioFileName}`);
      } catch (error) {
        console.error("Error deleting audio file:", error);
      }
      // Clean up ref after playback ends
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };

    setCurrentAudio(audio);
    return audio;
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !apiAvailable) return;

    const newMessages = [...messages, { sender: "User", text: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await axios.post("/api/chat", { message: input });
      const gandalfReply: Message = {
        sender: "Gandalf",
        text: response.data.reply,
        audioFileUrl: response.data.audioFileUrl,
      };

      setMessages([...newMessages, gandalfReply]);
      setConversationHistory([
        ...conversationHistory,
        { sender: "User", text: input },
        gandalfReply,
      ]);

      if (audioEnabled && gandalfReply.audioFileUrl) {
        const audio = await playAudio(gandalfReply.audioFileUrl);
        setCurrentAudio(audio);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Error sending message. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [input, messages, audioEnabled, conversationHistory, playAudio, apiAvailable]);

  /**
   * Toggles the audio playback functionality on and off.
   * When toggled off, it stops any currently playing audio and cleans up resources.
   */
  const handleAudioToggle = useCallback(() => {
    setAudioEnabled(!audioEnabled);

    if (currentAudio && audioEnabled) {
      // Pause and reset the current audio
      currentAudio.pause();
      currentAudio.currentTime = 0;

      // Delete the current audio file
      const currentAudioFileName = extractFileName(currentAudio.src);
      axios
        .delete(`/api/delete-audio?file=${currentAudioFileName}`)
        .catch((error) => {
          console.error("Error deleting current audio file:", error);
        });

      // Clear the current audio state
      setCurrentAudio(null);
    }
  }, [audioEnabled, currentAudio]);

  /**
   * Extracts the file name from a URL.
   * Parses the URL and extracts the 'file' query parameter.
   *
   * @param {string} url - The full URL of the file
   * @returns {string} The extracted file name or empty string if not found
   */
  const extractFileName = (url: string): string => {
    const parsedUrl = new URL(url, window.location.origin);
    return parsedUrl.searchParams.get("file") || "";
  };

  /**
   * Effect hook to scroll the chat box to the bottom when new messages arrive.
   */
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  /**
   * Effect hook to focus the input field when the component mounts.
   */
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  /**
   * Effect hook to re-focus the input field after loading completes.
   */
  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading]);

  /**
   * Health check on mount
   */
  useEffect(() => {
    axios.get("/api/health")
      .then(() => setApiAvailable(true))
      .catch(() => {
        setApiAvailable(false);
        setError(""); // Clear any previous error
      });
  }, []);

  const renderedMessages = useMemo(
    () =>
      messages.map((msg, index) => <ChatMessage key={index} message={msg} />),
    [messages],
  );

  return (
    <>
      <div className="chatbox-header-relative">
        <div className="toggle-container top-left">
          <ToggleSwitch checked={audioEnabled} onChange={handleAudioToggle} />
          <span className="toggle-label">Audio</span>
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
        <div className="gandalf-img-top text-center">
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
      <div
        className="chat-box border rounded p-3 mb-3"
        ref={chatBoxRef}
      >
        {renderedMessages}
      </div>
      <div className="spinner-container">
        {loading && (
          <Image
            src="/ring.gif"
            alt="Loading..."
            width={40}
            height={40}
            unoptimized
            data-testid="loading-indicator"
          />
        )}
      </div>
      {error && (
        <div className="alert alert-danger" data-testid="error-message">
          {error}
        </div>
      )}
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
      <div className="card-footer">
        <div className="input-group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="form-control"
            placeholder={(!apiAvailable || loading) ? "" : "Type in your message here..."}
            ref={inputRef}
            disabled={loading || !apiAvailable}
            autoFocus
          />
          <div className="input-group-append">
            <button
              onClick={sendMessage}
              className={`btn ${loading || !apiAvailable ? "btn-secondary" : "btn-primary"}`}
              disabled={loading || !apiAvailable}
            >
              {(loading || !apiAvailable) ? "HOLD" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatPage;
