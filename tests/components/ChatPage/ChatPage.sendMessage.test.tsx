import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import ChatPage from "../../../app/components/ChatPage";
jest.mock("axios");

describe("ChatPage", () => {
  describe("Send Message", () => {
    beforeEach(() => {
      jest.resetAllMocks();
      jest.mocked(axios.get).mockResolvedValue({ data: { status: "ok" } }); // Mock health check
      // Mock scrollIntoView for all elements
      window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });
    
    it("sends a message and receives a reply", async () => {
      jest.mocked(axios.post).mockResolvedValue({
        data: { reply: "You shall not pass!", audioFileUrl: "/api/audio?file=gandalf_reply.mp3" },
      });
      const { getByPlaceholderText, getByText, container } = render(<ChatPage />);
      
      // Find input and send button using the new class names
      const input = getByPlaceholderText("Type in your message here...");
      const sendButton = container.querySelector(".chat-send-button");
      expect(sendButton).toBeInTheDocument();
      
      // Send message
      fireEvent.change(input, { target: { value: "Hello, Gandalf!" } });
      fireEvent.click(sendButton!);
      
      // Verify API call
      expect(axios.post).toHaveBeenCalledWith("/api/chat", { message: "Hello, Gandalf!" });
      
      // Check that both messages appear in the chat
      await waitFor(() => {
        expect(getByText("Hello, Gandalf!")).toBeInTheDocument();
        expect(getByText("You shall not pass!")).toBeInTheDocument();
      });
    });
    
    it("clears the input after sending a message", async () => {
      jest.mocked(axios.post).mockResolvedValue({
        data: { reply: "You shall not pass!", audioFileUrl: "/api/audio?file=gandalf_reply.mp3" },
      });
      const { getByPlaceholderText, container } = render(<ChatPage />);
      
      // Find input and send button
      const input = getByPlaceholderText("Type in your message here...");
      const sendButton = container.querySelector(".chat-send-button");
      expect(sendButton).toBeInTheDocument();
      
      // Send message and check input is cleared
      fireEvent.change(input, { target: { value: "Hello, Gandalf!" } });
      fireEvent.click(sendButton!);
      
      await waitFor(() => {
        expect((input as HTMLInputElement).value).toBe("");
      });
    });
    
    it("does not send a message when input is empty", () => {
      const { container } = render(<ChatPage />);
      const sendButton = container.querySelector(".chat-send-button");
      expect(sendButton).toBeInTheDocument();
      
      fireEvent.click(sendButton!);
      expect(axios.post).not.toHaveBeenCalled();
    });
    
    it("sends a message when pressing Enter key", async () => {
      jest.mocked(axios.post).mockResolvedValue({
        data: { reply: "You shall not pass!", audioFileUrl: "/api/audio?file=gandalf_reply.mp3" },
      });
      const { getByPlaceholderText, getByText } = render(<ChatPage />);
      
      const input = getByPlaceholderText("Type in your message here...");
      fireEvent.change(input, { target: { value: "Hello, Gandalf!" } });
      fireEvent.keyDown(input, { key: "Enter" });
      
      expect(axios.post).toHaveBeenCalledWith("/api/chat", { message: "Hello, Gandalf!" });
      
      await waitFor(() => {
        expect(getByText("Hello, Gandalf!")).toBeInTheDocument();
        expect(getByText("You shall not pass!")).toBeInTheDocument();
      });
    });
  });
});