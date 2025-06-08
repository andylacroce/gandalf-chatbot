/**
 * Root layout component that provides the HTML structure and analytics for the application.
 * @module RootLayout
 */

import React from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

/**
 * Root layout component that wraps the entire application.
 * Provides the HTML document structure, includes Vercel Analytics and Speed Insights,
 * and renders children components within the body.
 *
 * @function
 * @param {Object} props - The component props
 * @param {React.ReactNode} props.children - The child components to render inside the layout
 * @returns {JSX.Element} The HTML document structure with analytics components
 */
const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" className="">
      <head>
        <title>Gandalf Chatbot</title>
        <meta name="description" content="Chat with Gandalf the Grey, powered by AI and Google TTS. Enjoy a magical, voice-enabled chat experience!" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Gandalf Chatbot" />
        <meta property="og:description" content="Chat with Gandalf the Grey, powered by AI and Google TTS." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/gandalf.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Gandalf Chatbot" />
        <meta name="twitter:description" content="Chat with Gandalf the Grey, powered by AI and Google TTS." />
        <meta name="twitter:image" content="/gandalf.jpg" />
      </head>
      <body>
        {/* Removed .container wrapper to allow sticky positioning to work */}
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
};

export default RootLayout;
