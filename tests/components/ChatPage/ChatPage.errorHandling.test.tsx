import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import ChatPage from "../../../app/components/ChatPage";
jest.mock("axios");

describe("ChatPage", () => {
  describe("Error Handling", () => {
    beforeEach(() => { jest.resetAllMocks(); });
    it("displays an error message when the API call fails", async () => {
      jest.mocked(axios.post).mockRejectedValue(new Error("API call failed"));
      const { getByPlaceholderText, getByRole, getByText } = render(<ChatPage />);
      const input = getByPlaceholderText("Type in your message here...");
      const sendButton = getByRole("button", { name: /Send/i });
      fireEvent.change(input, { target: { value: "Hello, Gandalf!" } });
      fireEvent.click(sendButton);
      await waitFor(() => {
        expect(getByText("Error sending message. Please try again.")).toBeInTheDocument();
      });
    });
    it("handles network errors gracefully", async () => {
      jest.mocked(axios.post).mockRejectedValue(new Error("Network Error"));
      const { getByPlaceholderText, getByRole, getByText } = render(<ChatPage />);
      const input = getByPlaceholderText("Type in your message here...");
      const sendButton = getByRole("button", { name: /Send/i });
      fireEvent.change(input, { target: { value: "Hello, Gandalf!" } });
      fireEvent.click(sendButton);
      await waitFor(() => {
        expect(getByText("Error sending message. Please try again.")).toBeInTheDocument();
      });
    });
  });
});