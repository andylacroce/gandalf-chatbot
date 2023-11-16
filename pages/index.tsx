import dynamic from 'next/dynamic';

const PageClient = dynamic(() => import('../app/page.client'), { ssr: false });

const Home = () => {
  return <PageClient />;
};

export default Home;