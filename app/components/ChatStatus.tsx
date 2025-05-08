import React from "react";

interface ChatStatusProps {
  error: string;
}

const ChatStatus: React.FC<ChatStatusProps> = ({ error }) => (
  <div className="chat-status-area" data-testid="chat-status-area">
    {error && (
      <div className="alert alert-danger" data-testid="error-message">
        {error}
      </div>
    )}
  </div>
);

export default ChatStatus;
