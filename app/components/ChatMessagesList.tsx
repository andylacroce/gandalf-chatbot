import React from "react";
import ChatMessage from "./ChatMessage";

interface ChatMessagesListProps {
  messages: Array<{
    text: string;
    sender: string;
    audioFileUrl?: string;
  }>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

const ChatMessagesList: React.FC<ChatMessagesListProps> = ({ messages, messagesEndRef, className }) => (
  <div className={className} data-testid="chat-messages-container" style={{ paddingTop: 20 }}>
    {messages.map((msg, index) => (
      <ChatMessage key={index} message={msg} />
    ))}
    <div ref={messagesEndRef} />
  </div>
);

export default ChatMessagesList;
