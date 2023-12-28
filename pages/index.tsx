import dynamic from 'next/dynamic';
import { SpeedInsights } from "@vercel/speed-insights/next"

const PageClient = dynamic(() => import('../app/page.client'), { ssr: false });

const Home = () => {
  return <PageClient />;
};

export default Home;