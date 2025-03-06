import React from 'react';
import dynamic from 'next/dynamic';

const ChatPage = dynamic(() => import('../app/components/ChatPage'), { ssr: true });

/**
 * Home component that renders the ChatPage.
 * @returns {JSX.Element} The Home component.
 */
const Home = (): JSX.Element => {
  return <ChatPage />;
};

export default Home;