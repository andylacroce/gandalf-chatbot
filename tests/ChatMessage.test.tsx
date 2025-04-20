/**
 * @fileoverview Test suite for the ChatMessage component.
 * Tests rendering and display behavior of chat messages.
 * @module tests/ChatMessage
 */

import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import ChatMessage from "../app/components/ChatMessage";

describe("ChatMessage Component", () => {
  /**
   * Test to check if the ChatMessage component renders user messages correctly.
   * Verifies that the message text and sender information are displayed properly.
   */
  test("renders user message correctly", () => {
    const message = { text: "Hello, World!", sender: "User" };
    const { getByText } = render(<ChatMessage message={message} />);

    // Check if message text is rendered
    const messageElement = getByText(/Hello, World!/i);
    expect(messageElement).toBeInTheDocument();

    // Check if sender is displayed as "Me" for User messages
    expect(getByText("Me")).toBeInTheDocument();
  });

  /**
   * Test to check if the ChatMessage component renders Gandalf messages correctly.
   * Verifies that the message text and sender information are displayed properly.
   */
  test("renders Gandalf message correctly", () => {
    const message = { text: "You shall not pass!", sender: "Gandalf" };
    const { getByText } = render(<ChatMessage message={message} />);

    // Check if message text is rendered
    const messageElement = getByText(/You shall not pass!/i);
    expect(messageElement).toBeInTheDocument();

    // Check if sender is displayed as "Gandalf"
    expect(getByText("Gandalf")).toBeInTheDocument();
  });

  /**
   * Test to check if the ChatMessage component handles invalid messages gracefully.
   * Verifies that the component doesn't crash when passed invalid data.
   */
  test("handles invalid message gracefully", () => {
    // @ts-ignore - Deliberately testing with invalid input
    const { container } = render(<ChatMessage message={null} />);

    // Component should render nothing for invalid input
    expect(container.firstChild).toBeNull();
  });
});
