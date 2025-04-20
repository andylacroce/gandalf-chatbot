import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import ChatPage from "../../../app/components/ChatPage";
jest.mock("axios");

describe("ChatPage", () => {
  describe("Send Message", () => {
    beforeEach(() => { jest.resetAllMocks(); });
    it("sends a message and receives a reply", async () => {
      jest.mocked(axios.post).mockResolvedValue({
        data: { reply: "You shall not pass!", audioFileUrl: "/api/audio?file=gandalf_reply.mp3" },
      });
      const { getByPlaceholderText, getByText, getByRole } = render(<ChatPage />);
      const input = getByPlaceholderText("Type in your message here...");
      const sendButton = getByRole("button", { name: /Send/i });
      fireEvent.change(input, { target: { value: "Hello, Gandalf!" } });
      fireEvent.click(sendButton);
      expect(axios.post).toHaveBeenCalledWith("/api/chat", { message: "Hello, Gandalf!" });
      await waitFor(() => {
        expect(getByText("Hello, Gandalf!")).toBeInTheDocument();
        expect(getByText("You shall not pass!")).toBeInTheDocument();
      });
    });
    it("clears the input after sending a message", async () => {
      jest.mocked(axios.post).mockResolvedValue({
        data: { reply: "You shall not pass!", audioFileUrl: "/api/audio?file=gandalf_reply.mp3" },
      });
      const { getByPlaceholderText, getByRole } = render(<ChatPage />);
      const input = getByPlaceholderText("Type in your message here...");
      const sendButton = getByRole("button", { name: /Send/i });
      fireEvent.change(input, { target: { value: "Hello, Gandalf!" } });
      fireEvent.click(sendButton);
      await waitFor(() => {
        expect((input as HTMLInputElement).value).toBe("");
      });
    });
    it("does not send a message when input is empty", () => {
      const { getByRole } = render(<ChatPage />);
      const sendButton = getByRole("button", { name: /Send/i });
      fireEvent.click(sendButton);
      expect(axios.post).not.toHaveBeenCalled();
    });
  });
});