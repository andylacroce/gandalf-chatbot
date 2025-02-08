import React from 'react';

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

export default ChatMessage;