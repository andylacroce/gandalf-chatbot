import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import ChatPage from "../../../app/components/ChatPage";
jest.mock("axios");

describe("ChatPage", () => {
  describe("Sequence", () => {
    beforeEach(() => {
      jest.resetAllMocks();
      jest.mocked(axios.get).mockResolvedValue({ data: { status: "ok" } }); // Mock health check
      // Mock scrollIntoView for all elements
      window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });
    
    it("handles multiple messages in sequence", async () => {
      jest.mocked(axios.post).mockResolvedValue({
        data: { reply: "You shall not pass!", audioFileUrl: "/api/audio?file=gandalf_reply.mp3" },
      });
      
      const { getByPlaceholderText, getByText, container } = render(<ChatPage />);
      const input = getByPlaceholderText("Type in your message here...");
      const sendButton = container.querySelector(".chat-send-button");
      expect(sendButton).toBeInTheDocument();
      
      // First message
      fireEvent.change(input, { target: { value: "Hello, Gandalf!" } });
      fireEvent.click(sendButton!);
      
      await waitFor(() => {
        expect(getByText("Hello, Gandalf!")).toBeInTheDocument();
        expect(getByText("You shall not pass!")).toBeInTheDocument();
      });
      
      // Second message
      fireEvent.change(input, { target: { value: "What is your name?" } });
      fireEvent.click(sendButton!);
      
      await waitFor(() => {
        expect(getByText("What is your name?")).toBeInTheDocument();
        expect(getByText("You shall not pass!")).toBeInTheDocument();
      });
    });
    
    it("correctly maintains chat history and ordering of messages", async () => {
      // Use different responses for different messages
      jest.mocked(axios.post)
        .mockResolvedValueOnce({
          data: { reply: "First response", audioFileUrl: "/api/audio?file=first.mp3" },
        })
        .mockResolvedValueOnce({ 
          data: { reply: "Second response", audioFileUrl: "/api/audio?file=second.mp3" },
        });
      
      const { getByPlaceholderText, container, getAllByText } = render(<ChatPage />);
      
      const input = getByPlaceholderText("Type in your message here...");
      const sendButton = container.querySelector(".chat-send-button");
      
      // Send first message
      fireEvent.change(input, { target: { value: "First message" } });
      fireEvent.click(sendButton!);
      
      await waitFor(() => {
        expect(container.querySelector(".chat-messages")?.textContent).toContain("First message");
        expect(container.querySelector(".chat-messages")?.textContent).toContain("First response");
      });
      
      // Send second message
      fireEvent.change(input, { target: { value: "Second message" } });
      fireEvent.click(sendButton!);
      
      await waitFor(() => {
        // Scope to only the chat-messages container to avoid unrelated nodes
        const chatMessagesContainer = container.querySelector(".chat-messages");
        const messages = chatMessagesContainer?.querySelectorAll(".user-message, .gandalf-message") || [];
        expect(messages.length).toBe(4); // 2 user messages + 2 responses

        // Verify message ordering (bottom-up, so last message should be first in DOM)
        expect(messages[0].textContent).toContain("Second response");
        expect(messages[1].textContent).toContain("Second message");
        expect(messages[2].textContent).toContain("First response");
        expect(messages[3].textContent).toContain("First message");
      });
    });
  });
});