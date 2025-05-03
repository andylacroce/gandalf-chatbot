/**
 * Rendering and basic UI tests for ChatPage
 */
import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import ChatPage from "../../../app/components/ChatPage";

describe("ChatPage", () => {
  describe("Rendering", () => {
    beforeAll(() => {
      // Mock scrollIntoView for all elements
      window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });

    it("renders ChatPage component with all key elements", () => {
      const { getByPlaceholderText, getByAltText, container } = render(<ChatPage />);
      
      // Check for input field
      expect(getByPlaceholderText("Type in your message here...")).toBeInTheDocument();
      
      // Check for Gandalf image
      expect(getByAltText("Gandalf")).toBeInTheDocument();
      
      // Check for main structural elements
      expect(container.querySelector(".chat-layout")).toBeInTheDocument();
      expect(container.querySelector(".chat-header")).toBeInTheDocument();
      expect(container.querySelector(".chat-messages-container")).toBeInTheDocument();
      expect(container.querySelector(".chat-messages")).toBeInTheDocument();
      expect(container.querySelector(".chat-input-area")).toBeInTheDocument();
      expect(container.querySelector(".chat-status-area")).toBeInTheDocument();
    });
  });
});
