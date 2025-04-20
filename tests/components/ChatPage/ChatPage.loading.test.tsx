import React from "react";
import { render, fireEvent, waitFor, waitForElementToBeRemoved } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import ChatPage from "../../../app/components/ChatPage";
jest.mock("axios");
jest.useFakeTimers();

describe("ChatPage", () => {
  describe("Loading States", () => {
    beforeEach(() => { jest.resetAllMocks(); });
    it("disables the input and button while loading", async () => {
      const { getByPlaceholderText, getByRole } = render(<ChatPage />);
      const input = getByPlaceholderText("Type in your message here...");
      const sendButton = getByRole("button", { name: /Send/i });
      fireEvent.change(input, { target: { value: "Hello, Gandalf!" } });
      fireEvent.click(sendButton);
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
      await waitFor(() => {
        expect(input).not.toBeDisabled();
        expect(sendButton).not.toBeDisabled();
      });
    });
    it("displays a loading indicator while waiting for a reply", async () => {
      jest.mocked(axios.post).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { reply: "You shall not pass!", audioFileUrl: "/api/audio?file=gandalf_reply.mp3" } }), 1000)),
      );
      const { getByPlaceholderText, getByRole, getByTestId } = render(<ChatPage />);
      const input = getByPlaceholderText("Type in your message here...");
      const sendButton = getByRole("button", { name: /Send/i });
      fireEvent.change(input, { target: { value: "Hello, Gandalf!" } });
      fireEvent.click(sendButton);
      jest.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(getByTestId("loading-indicator")).toBeInTheDocument();
      });
      await waitForElementToBeRemoved(() => getByTestId("loading-indicator"), { timeout: 5000 });
    });
  });
});