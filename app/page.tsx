/**
 * Main page component that serves as the entry point for the application.
 * @module Home
 */

import React from "react";
import ChatPage from "./components/ChatPage";

/**
 * Home component that renders the ChatPage component.
 * This is the main page component that gets rendered at the root route.
 *
 * @function
 * @returns {JSX.Element} The rendered Home component with ChatPage
 */
const Home = () => {
  return <ChatPage />;
};

export default Home;
