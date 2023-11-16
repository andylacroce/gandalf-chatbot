import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './globals.css';

interface Message {
  text: string;
  sender: string;
}

const Page: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  const chatWindowRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = async () => {
    if (isWaitingForResponse) {
      // User is waiting for Gandalf's response
      return;
    }

    // Disable input and send button while waiting for Gandalf's response
    setIsWaitingForResponse(true);

    const userMessage: Message = { text: input, sender: 'User' };
    setMessages((messages) => [...messages, userMessage]);
    setInput('');

    try {
      const response = await axios.post('/api/chat', { message: input });
      const gandalfResponse: Message = { text: response.data.reply, sender: 'Gandalf' };
      setMessages((messages) => [...messages, gandalfResponse]);
    } catch (error) {
      console.error('Error fetching Gandalf response:', error);
      setMessages((messages) => [
        ...messages,
        { text: 'I am unable to answer at the moment.', sender: 'Gandalf' },
      ]);
    } finally {
      // Re-enable input and send button after Gandalf responds
      setIsWaitingForResponse(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="container">
      <h1>Gandalf Chatbot</h1>
      <div className="chatbox">
        <div className="chatbox-messages" ref={chatWindowRef}>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`my-2 ${
                message.sender === 'User' ? 'user-message' : 'gandalf-message'
              }`}
            >
              <div className={`rounded p-2 text-sm`}>
                <div className={`mb-1 ${message.sender === 'User' ? 'user-sender' : 'gandalf-sender'}`}>
                  {message.sender}
                </div>
                {message.text}
              </div>
            </div>
          ))}
        </div>
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            className="flex-grow p-2 border rounded-l-lg focus:outline-none focus:border-blue-300"
            placeholder={isWaitingForResponse ? 'Please wait...' : 'Type your message here...'}
            disabled={isWaitingForResponse}
            ref={inputRef}
          />
          <button
            onClick={sendMessage}
            className={`${
              isWaitingForResponse ? 'bg-gray-400 text-gray-800' : 'bg-blue-500 text-white'
            } px-4 py-2 rounded-r-lg hover:bg-blue-600`}
            disabled={isWaitingForResponse}
          >
            {isWaitingForResponse ? '\u00A0' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Page;
