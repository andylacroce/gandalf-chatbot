import { useState, useEffect, useRef } from 'react';
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
  const inputRef = useRef<HTMLInputElement | null>(null); // Create a ref for the input field

  useEffect(() => {
    // Scroll to the latest message when messages change
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent the default behavior (e.g., form submission)
      sendMessage();
    }
  };

  const sendMessage = async () => {
    if (isWaitingForResponse) {
      // Inform the user to continue waiting
      const waitingMessage: Message = {
        text: 'Please wait for Gandalf to respond...',
        sender: 'System',
      };
      setMessages((messages) => [...messages, waitingMessage]);
      return; // Don't accept new requests while waiting for Gandalf's reply
    }

    const userMessage: Message = { text: input, sender: 'User' };
    setMessages((messages) => [...messages, userMessage]);
    setInput('');
    setIsWaitingForResponse(true);

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
      setIsWaitingForResponse(false);
      inputRef.current?.focus(); // Set focus back to the input field after Gandalf responds
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
            placeholder="Type your message here..."
            disabled={isWaitingForResponse}
            ref={inputRef} // Assign the ref to the input field
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600"
            disabled={isWaitingForResponse}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Page;
