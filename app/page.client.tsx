import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import Image from 'next/image';

interface Message {
  text: string;
  sender: string;
}

const ChatMessage = ({ message }: { message: Message }) => {
  const messageClass = message.sender === 'User' ? 'user-message' : 'gandalf-message';
  const senderClass = message.sender === 'User' ? 'user-sender' : 'gandalf-sender';

  return (
    <div className={`my-2 ${messageClass}`}>
      <div className="rounded p-2 text-sm">
        <div className={`mb-1 ${senderClass}`}>
          {message.sender === 'User' ? 'Me' : 'Gandalf'}
        </div>
        {message.text}
      </div>
    </div>
  );
};

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { sender: 'User', text: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/chat', { message: input });
      setMessages([...newMessages, { sender: 'Gandalf', text: response.data.reply }]);
      setConversationHistory([...conversationHistory, { sender: 'User', text: input }, { sender: 'Gandalf', text: response.data.reply }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Error sending message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

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
      <div className="chat-box border rounded p-3 mb-3" style={{ height: '400px', overflowY: 'scroll' }} ref={chatBoxRef}>
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}
      </div>
      <div className="spinner-container">
        {loading && <Image src="/ring.gif" alt="Loading..." width={40} height={40} unoptimized />}
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
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
    </div>
  );
};

export default ChatPage;