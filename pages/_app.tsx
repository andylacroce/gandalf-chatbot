import React, { useEffect } from 'react';
import { AppProps } from 'next/app';
import '@vercel/speed-insights';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

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
      <SpeedInsights />
    </>
  );
}

export default MyApp;