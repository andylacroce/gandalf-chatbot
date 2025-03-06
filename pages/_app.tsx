import React, { useEffect } from 'react';
import { AppProps } from 'next/app';
import '@vercel/speed-insights';
import { Analytics } from '@vercel/analytics/react';
import ReactDOM from 'react-dom/client';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize Vercel Speed Insights
    if (typeof window !== 'undefined') {
      import('@vercel/speed-insights').then((module) => {
        module.injectSpeedInsights();
      });

      // Dynamically append SpeedInsights to the body
      const speedInsightsElement = document.createElement('div');
      document.body.appendChild(speedInsightsElement);
      import('@vercel/speed-insights/next').then(({ SpeedInsights }) => {
        const root = ReactDOM.createRoot(speedInsightsElement);
        root.render(<SpeedInsights />);
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