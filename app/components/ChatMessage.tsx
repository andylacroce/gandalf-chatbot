/**
 * Component for rendering individual chat messages in the conversation.
 * @module ChatMessage
 */

import React from 'react';

/**
 * Interface representing a chat message's structure.
 * @interface Message
 * @property {string} text - The content of the message.
 * @property {string} sender - The sender of the message ('User' or 'Gandalf').
 */
export interface Message {
  text: string;
  sender: string;
}

/**
 * ChatMessage component that displays a single message in the chat interface.
 * This component handles the styling and formatting of messages based on the sender.
 * 
 * @function
 * @param {Object} props - The component props
 * @param {Message} props.message - The message object containing text and sender information
 * @returns {JSX.Element|null} The rendered chat message or null if message is invalid
 */
const ChatMessage = ({ message }: { message: Message }) => {
  // Validate message object to prevent rendering errors
  if (!message || typeof message.text !== 'string' || typeof message.sender !== 'string') {
    console.error('Invalid message object:', message);
    return null; // Render nothing if the message is invalid
  }

  // Determine CSS classes based on message sender
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