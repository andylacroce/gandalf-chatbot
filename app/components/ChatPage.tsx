"use client";

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../globals.css';
import Image from 'next/image';
import ChatMessage from './ChatMessage';

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
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

      if (gandalfReply.audioFileUrl) {
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
        await axios.delete(currentAudio.src);
      } catch (error) {
        console.error('Error deleting previous audio file:', error);
      }
    }

    const audio = new Audio(audioFileUrl);
    audio.play();

    audio.onended = async () => {
      try {
        await axios.delete(audioFileUrl);
      } catch (error) {
        console.error('Error deleting audio file:', error);
      }
    };

    return audio;
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