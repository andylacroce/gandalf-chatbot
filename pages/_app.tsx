import { AppProps } from 'next/app';
import { useEffect } from 'react';
import '@vercel/speed-insights';
import { Analytics } from "@vercel/analytics/react"

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize Vercel Speed Insights
    if (typeof window !== 'undefined') {
      import('@vercel/speed-insights').then((module) => {
        module.injectSpeedInsights();
      });
    }
  }, []);

  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}

export default MyApp;