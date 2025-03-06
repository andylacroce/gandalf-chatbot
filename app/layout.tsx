import React, { useEffect } from 'react';
import '@vercel/speed-insights';
import { Analytics } from '@vercel/analytics/react';
import ReactDOM from 'react-dom/client';
import '../globals.css';

const RootLayout = ({ children }: { children: React.ReactNode }) => {
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
    <html lang="en">
      <head>
        <title>Gandalf Chatbot</title>
      </head>
      <body>
        {children}
        <Analytics />
        <div id="speed-insights-container"></div>
      </body>
    </html>
  );
};

export default RootLayout;