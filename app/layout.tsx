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
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
};

export default RootLayout;
