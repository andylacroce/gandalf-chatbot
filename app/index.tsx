import React from 'react';
import dynamic from 'next/dynamic';

const ChatPage = dynamic(() => import('../app/components/ChatPage'), { ssr: true });

const Home = () => {
  return <ChatPage />;
};

export default Home;