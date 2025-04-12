/**
 * Main chat interface component that manages the conversation with Gandalf.
 * @module ChatPage
 */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../globals.css';
import Image from 'next/image';
import ChatMessage from './ChatMessage';
import ToggleSwitch from '@trendmicro/react-toggle-switch';
import '@trendmicro/react-toggle-switch/dist/react-toggle-switch.css';

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
  const [input, setInput] = useState<string>('');
  
  /** @state {boolean} Whether a request is in progress */
  const [loading, setLoading] = useState<boolean>(false);
  
  /** @state {string} Error message if any */
  const [error, setError] = useState<string>('');
  
  /** @state {boolean} Whether audio responses are enabled */
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  
  /** @ref Reference to the chat box container for auto-scrolling */
  const chatBoxRef = useRef<HTMLDivElement>(null);
  
  /** @ref Reference to the input field for auto-focusing */
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  /** @state {Message[]} Complete conversation history */
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  
  /** @state {HTMLAudioElement | null} Currently playing audio element */
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  /**
   * Sends the user's message to the server and handles Gandalf's response.
   * This function manages the entire message flow, including updating the UI,
   * sending API requests, and handling audio playback.
   * 
   * @function
   * @returns {Promise<void>}
   */
  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { sender: 'User', text: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/chat', { message: input });
      const gandalfReply: Message = { 
        sender: 'Gandalf', 
        text: response.data.reply, 
        audioFileUrl: response.data.audioFileUrl 
      };
      
      setMessages([...newMessages, gandalfReply]);
      setConversationHistory([
        ...conversationHistory, 
        { sender: 'User', text: input }, 
        gandalfReply
      ]);

      if (audioEnabled && gandalfReply.audioFileUrl) {
        const audio = await playAudio(gandalfReply.audioFileUrl);
        setCurrentAudio(audio);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Error sending message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Plays an audio file from the provided URL.
   * This function handles stopping any currently playing audio,
   * cleaning up previous audio files, and managing audio playback events.
   * 
   * @function
   * @param {string} audioFileUrl - The URL of the audio file to play
   * @returns {Promise<HTMLAudioElement>} The audio element that was created
   */
  const playAudio = async (audioFileUrl: string) => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;

      try {
        const previousAudioFileName = extractFileName(currentAudio.src);
        if (previousAudioFileName !== extractFileName(audioFileUrl)) {
          await axios.delete(`/api/delete-audio?file=${previousAudioFileName}`);
        }
      } catch (error) {
        console.error('Error deleting previous audio file:', error);
      }
    }

    const audio = new Audio(audioFileUrl);
    audio.play();

    audio.onended = async () => {
      try {
        const currentAudioFileName = extractFileName(audioFileUrl);
        await axios.delete(`/api/delete-audio?file=${currentAudioFileName}`);
      } catch (error) {
        console.error('Error deleting audio file:', error);
      }
    };

    setCurrentAudio(audio);
    return audio;
  };

  /**
   * Toggles the audio playback functionality on and off.
   * When toggled off, it stops any currently playing audio and cleans up resources.
   */
  const handleAudioToggle = () => {
    setAudioEnabled(!audioEnabled);

    if (currentAudio && audioEnabled) {
      // Pause and reset the current audio
      currentAudio.pause();
      currentAudio.currentTime = 0;

      // Delete the current audio file
      const currentAudioFileName = extractFileName(currentAudio.src);
      axios.delete(`/api/delete-audio?file=${currentAudioFileName}`).catch((error) => {
        console.error('Error deleting current audio file:', error);
      });

      // Clear the current audio state
      setCurrentAudio(null);
    }
  };

  /**
   * Extracts the file name from a URL.
   * Parses the URL and extracts the 'file' query parameter.
   * 
   * @param {string} url - The full URL of the file
   * @returns {string} The extracted file name or empty string if not found
   */
  const extractFileName = (url: string): string => {
    const parsedUrl = new URL(url, window.location.origin);
    return parsedUrl.searchParams.get('file') || '';
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

  return (
    <div className="container mt-4">
      <div className="text-center mb-4">
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
      <div className="chat-box border rounded p-3 mb-3" ref={chatBoxRef}>
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}
      </div>
      <div className="spinner-container">
        {loading && <Image src="/ring.gif" alt="Loading..." width={40} height={40} unoptimized data-testid="loading-indicator" />}
      </div>
      {error && <div className="alert alert-danger" data-testid="error-message">{error}</div>}
      <div className="card-footer">
        <div className="input-group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            className="form-control"
            placeholder="Type in your message here..."
            ref={inputRef}
            disabled={loading}
            autoFocus
          />
          <div className="input-group-append">
            <button
              onClick={sendMessage}
              className={`btn ${loading ? 'btn-secondary' : 'btn-primary'}`}
              disabled={loading}
            >
              {loading ? 'HOLD' : 'Send'}
            </button>
          </div>
        </div>
        <div className="mt-3 text-center">
          <div className="toggle-container">
            <ToggleSwitch
              checked={audioEnabled}
              onChange={handleAudioToggle}
            />
            <span className="toggle-label">Audio</span>
          </div>
        </div>
      </div>
      <div className="icon-container mt-3 text-center">
        <a href="https://mastodon.world/@AndyLacroce" target="_blank" rel="noopener noreferrer">
          <Image src="/mastodon.png" alt="Mastodon" width={50} height={50} />
        </a>
        <a href="https://www.andylacroce.com/" target="_blank" rel="noopener noreferrer">
          <Image src="/dexter.webp" alt="Dexter" width={50} height={50} />
        </a>
      </div>
    </div>
  );
};

export default ChatPage;