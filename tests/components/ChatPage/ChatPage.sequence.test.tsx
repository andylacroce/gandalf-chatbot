import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import ChatPage from "../../../app/components/ChatPage";

jest.mock("axios");

describe("ChatPage", () => {
  describe("Sequence", () => {
    let messageCount = 0;

    beforeEach(() => {
      jest.resetAllMocks();
      messageCount = 0;

      // API health check always passes
      jest.mocked(axios.get).mockResolvedValue({ data: { status: "ok" } });

      // POST mock: only respond to actual user messages
      jest.mocked(axios.post).mockImplementation((url, body: any) => {
        if (
          typeof body === "object" &&
          body?.message?.includes("First message")
        ) {
          messageCount++;
          return Promise.resolve({
            data: {
              reply: "First response",
              audioFileUrl: "/api/audio?file=first.mp3",
            },
          });
        }
        if (
          typeof body === "object" &&
          body?.message?.includes("Second message")
        ) {
          messageCount++;
          return Promise.resolve({
            data: {
              reply: "Second response",
              audioFileUrl: "/api/audio?file=second.mp3",
            },
          });
        }

        // Log unexpected post calls (like logging or analytics)
        console.warn("Unexpected POST call:", body);
        return Promise.resolve({ data: { reply: "Extra", audioFileUrl: "" } });
      });

      window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });

    it("renders messages in correct order (oldest at top, newest at bottom)", async () => {
      const { getByPlaceholderText, queryAllByRole } = render(<ChatPage />);
      const input = await waitFor(() =>
        getByPlaceholderText("Type in your message here..."),
      );
      const sendButton = document.querySelector(".chat-send-button");

      // Send first message
      fireEvent.change(input, { target: { value: "First message" } });
      fireEvent.click(sendButton!);

      await waitFor(() => {
        const articles = queryAllByRole("article");
        expect(articles).toHaveLength(2);
        expect(articles[0].textContent).toContain("First message");
        expect(articles[1].textContent).toContain("First response");
      });

      // Send second message
      fireEvent.change(input, { target: { value: "Second message" } });
      fireEvent.click(sendButton!);

      await waitFor(() => {
        const articles = queryAllByRole("article");
        expect(articles).toHaveLength(4);
        expect(articles[0].textContent).toContain("First message");
        expect(articles[1].textContent).toContain("First response");
        expect(articles[2].textContent).toContain("Second message");
        expect(articles[3].textContent).toContain("Second response");
      });
    });
  });
});
