import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Image from 'next/image';

// Interface for messages
interface Message {
  text: string;
  sender: string;
}

// Chat message component
const ChatMessage = ({ message }: { message: Message }) => {
  const messageClass = message.sender === 'User' ? 'user-message' : 'gandalf-message';
  const senderClass = message.sender === 'User' ? 'user-sender' : 'gandalf-sender';

  return (
    <div className={`my-2 ${messageClass}`}>
      <div className={`rounded p-2 text-sm`}>
        <div className={`mb-1 ${senderClass}`}>
          {message.sender === 'User' ? 'Me' : 'Gandalf'}
        </div>
        {message.text}
      </div>
    </div>
  );
};

// Main Page component
const Page: React.FC = () => {
  // State declarations
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState<boolean>(false);

  // Refs for scrolling and input focus
  const chatWindowRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Refocus on the input field after messages update
  useEffect(() => {
    chatWindowRef.current?.scrollTo(0, chatWindowRef.current.scrollHeight);
    inputRef.current?.focus(); // Set focus on the input field
  }, [messages]);

  // Effect to scroll chat window
  useEffect(() => {
    chatWindowRef.current?.scrollTo(0, chatWindowRef.current.scrollHeight);
  }, [messages]);

  // Handlers for input change and key down events
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  // Function to send a message
  const sendMessage = async () => {
    if (input.trim() === '' || isWaitingForResponse) return;

    setIsWaitingForResponse(true);

    const userMessage: Message = { text: input, sender: 'User' };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');

    try {
      const response = await axios.post('/api/chat', { message: input });
      const gandalfResponse: Message = { text: response.data.reply, sender: 'Gandalf' };
      setMessages((prevMessages) => [...prevMessages, gandalfResponse]);
    } catch (error) {
      console.error('Error fetching Gandalf response:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: 'Sorry, I was choking on my pipe.  Try again, please.', sender: 'Gandalf' },
      ]);
    } finally {
      setIsWaitingForResponse(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="container mt-5">
      <center>
        <Image
          src="/gandalf.jpg" // Assuming the image is in the 'public' folder
          alt="Image of Gandalf"
          width={150}
          height={180}
          layout="fixed" // Optional: you can specify different layout modes
        /><br /><br />
        <div className="card">
          <div className="card-body">
            <div className="chatbox-messages" ref={chatWindowRef} style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
            </div>
          </div>
          <div className="card-footer">
            <div className="input-group">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                className="form-control"
                placeholder={isWaitingForResponse ? 'Please wait...' : 'Type your message here...'}
                disabled={isWaitingForResponse}
                ref={inputRef}
              />
              <div className="input-group-append">
                <button
                  onClick={sendMessage}
                  className={`btn ${isWaitingForResponse ? 'btn-secondary' : 'btn-primary'}`}
                  disabled={isWaitingForResponse}
                >
                  {isWaitingForResponse ? 'HOLD' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </center>
    </div>
  );
};

export default Page;
