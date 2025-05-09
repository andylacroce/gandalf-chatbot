/**
 * Component for rendering individual chat messages in the conversation.
 * @module ChatMessage
 */

import React from "react";
import styles from "./styles/ChatMessage.module.css";

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
const ChatMessage = React.memo(({ message }: { message: Message }) => {
  // Validate message object to prevent rendering errors
  if (
    !message ||
    typeof message.text !== "string" ||
    typeof message.sender !== "string"
  ) {
    console.error("Invalid message object:", message);
    return null; // Render nothing if the message is invalid
  }

  // Determine CSS classes based on message sender
  const isUser = message.sender === "User";
  const messageClass = isUser ? styles.userMessage : styles.gandalfMessage;
  const senderClass = isUser ? styles.sender : `${styles.sender} ${styles.gandalfSender}`;

  return (
    <div className={`${styles.message} ${messageClass} my-2`} role="article">
      <div className="rounded p-2 text-sm">
        <div className={`mb-1 ${senderClass} text-left`}>
          {isUser ? "Me" : "Gandalf"}
        </div>
        <div className="text-left">
          {message.text}
        </div>
      </div>
    </div>
  );
});

ChatMessage.displayName = "ChatMessage";

export default ChatMessage;
