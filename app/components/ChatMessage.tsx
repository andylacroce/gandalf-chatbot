import React from 'react';
interface Message {
  text: string;
  sender: string;
}

/**
 * ChatMessage component that displays a single chat message.
 * @param {Object} props - The component props.
 * @param {Message} props.message - The message to display.
 * @returns {JSX.Element} The ChatMessage component.
 */
const ChatMessage = ({ message }: { message: Message }) => {
  if (!message || typeof message.text !== 'string' || typeof message.sender !== 'string') {
    console.error('Invalid message object:', message);
    return null; // Render nothing if the message is invalid
  }

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

export default ChatMessage;