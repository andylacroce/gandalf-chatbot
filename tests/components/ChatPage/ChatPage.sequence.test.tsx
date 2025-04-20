import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import ChatPage from "../../../app/components/ChatPage";
jest.mock("axios");

describe("ChatPage", () => {
  describe("Sequence", () => {
    beforeEach(() => { jest.resetAllMocks(); });
    it("handles multiple messages in sequence", async () => {
      jest.mocked(axios.post).mockResolvedValue({
        data: { reply: "You shall not pass!", audioFileUrl: "/api/audio?file=gandalf_reply.mp3" },
      });
      const { getByPlaceholderText, getByText, getByRole } = render(<ChatPage />);
      const input = getByPlaceholderText("Type in your message here...");
      const sendButton = getByRole("button", { name: /Send/i });
      fireEvent.change(input, { target: { value: "Hello, Gandalf!" } });
      fireEvent.click(sendButton);
      await waitFor(() => {
        expect(getByText("Hello, Gandalf!")).toBeInTheDocument();
        expect(getByText("You shall not pass!")).toBeInTheDocument();
      });
      fireEvent.change(input, { target: { value: "What is your name?" } });
      fireEvent.click(sendButton);
      await waitFor(() => {
        expect(getByText("What is your name?")).toBeInTheDocument();
        expect(getByText("You shall not pass!")).toBeInTheDocument();
      });
    });
  });
});