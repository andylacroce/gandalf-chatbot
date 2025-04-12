"use client";

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../globals.css';
import Image from 'next/image';
import ChatMessage from './ChatMessage';
import Switch from 'react-switch'; // Importing a toggle switch library

interface Message {
  text: string;
  sender: string;
  audioFileUrl?: string;
}

/**
 * ChatPage component that handles the chat interface and interactions.
 * @returns {JSX.Element} The ChatPage component.
 */
const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true); // New state for audio toggle
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  /**
   * Sends a message to the server and handles the response.
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
      const gandalfReply: Message = { sender: 'Gandalf', text: response.data.reply, audioFileUrl: response.data.audioFileUrl };
      setMessages([...newMessages, gandalfReply]);
      setConversationHistory([...conversationHistory, { sender: 'User', text: input }, gandalfReply]);

      if (audioEnabled && gandalfReply.audioFileUrl) { // Respect audio toggle
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

  const handleAudioToggle = () => {
    setAudioEnabled(!audioEnabled);

    if (currentAudio && audioEnabled) {
      // Pause and reset the current audio
      currentAudio.pause();
      currentAudio.currentTime = 0;

      // Optionally delete the current audio file
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
   * @param url The full URL of the file.
   * @returns The file name.
   */
  const extractFileName = (url: string): string => {
    const parsedUrl = new URL(url, window.location.origin); // Parse the URL
    return parsedUrl.searchParams.get('file') || ''; // Extract the 'file' query parameter
  };

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading]);

  return (
    <div className="container mt-4">
      <div className="text-center mb-4">
        <Image src="/gandalf.jpg" alt="Gandalf" priority={true} width={200} height={200} />
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
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
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
            <Switch
              onChange={handleAudioToggle}
              checked={audioEnabled}
              className="react-switch"
              onColor="var(--send-button-bg)"
              offColor="var(--disabled-bg)"
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