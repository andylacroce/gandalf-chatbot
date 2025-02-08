import dynamic from 'next/dynamic';

const ChatPage = dynamic(() => import('../app/components/ChatPage'), { ssr: false });

const Home = () => {
  return <ChatPage />;
};

export default Home;