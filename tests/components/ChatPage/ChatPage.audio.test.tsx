import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import ChatPage from "../../../app/components/ChatPage";
jest.mock("axios");

describe("ChatPage Audio Integration", () => {
  let playMock: jest.SpyInstance<Promise<void>, []>;
  let audioInstances: any[] = [];
  let originalAudio: any;

  beforeAll(() => {
    playMock = jest.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(function () { return Promise.resolve(); });
    originalAudio = window.Audio;
    window.Audio = function AudioMock(this: any, src?: string) {
      const audioMock = {
        src: src ?? "",
        currentTime: 0,
        _paused: false,
        play: jest.fn().mockImplementation(() => Promise.resolve()),
        pause: jest.fn(function (this: any) {
          this._paused = true;
        }),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      audioInstances.push(audioMock);
      return audioMock as unknown as HTMLAudioElement;
    } as any;
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  afterAll(() => {
    playMock.mockRestore();
    window.Audio = originalAudio;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(axios.get).mockResolvedValue({ data: { status: "ok" } });
    jest.mocked(axios.delete).mockResolvedValue({ data: { status: "ok" } });
    audioInstances.length = 0;
  });

  it("plays audio when a reply with an audio URL is received", async () => {
    jest.mocked(axios.post).mockResolvedValue({
      data: { reply: "You shall not pass!", audioFileUrl: "/api/audio?file=gandalf_reply.mp3" },
    });
    const { getByPlaceholderText, container } = render(<ChatPage />);
    const input = getByPlaceholderText("Type in your message here...");
    const sendButton = container.querySelector(".chat-send-button");
    fireEvent.change(input, { target: { value: "Hello, Gandalf!" } });
    fireEvent.click(sendButton!);
    await waitFor(() => {
      expect(audioInstances.length).toBe(1);
      expect(audioInstances[0].play).toHaveBeenCalled();
    });
  });

  it("stops previous audio before playing new audio", async () => {
    jest.mocked(axios.post)
      .mockImplementation(() => {
        // Always resolve with a successful reply and audioFileUrl
        if (!audioInstances.length) {
          return Promise.resolve({ data: { reply: "First reply", audioFileUrl: "/api/audio?file=first.mp3" } });
        }
        return Promise.resolve({ data: { reply: "Second reply", audioFileUrl: "/api/audio?file=second.mp3" } });
      });

    const { getByPlaceholderText, container, getByText, queryByTestId } = render(<ChatPage />);
    const input = getByPlaceholderText("Type in your message here...");
    const sendButton = container.querySelector(".chat-send-button");

    // Ensure audio is toggled ON if toggle exists
    const toggleContainer = container.querySelector(".toggle-container");
    if (toggleContainer) {
      const audioLabel = getByText("Audio");
      expect(audioLabel).toBeInTheDocument();
      const toggleElement = toggleContainer.querySelector("[class*='toggle-switch']");
      if (toggleElement && !toggleElement.className.includes("checked")) {
        fireEvent.click(toggleElement);
      }
    }

    // Send first message
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.click(sendButton!);

    await waitFor(() => {
      expect(audioInstances.length).toBe(1);
      expect(audioInstances[0].play).toHaveBeenCalled();
    });

    // If error message is shown, dismiss it before sending next message
    const errorMessage = queryByTestId?.("error-message");
    if (errorMessage) {
      // Optionally, simulate user dismissing the error if your UI allows
      // fireEvent.click(errorMessage); // Uncomment if dismissable
    }

    // Send second message
    fireEvent.change(input, { target: { value: "Hi again" } });
    fireEvent.click(sendButton!);

    await waitFor(() => {
      expect(audioInstances.length).toBe(2);
      expect(audioInstances[1].play).toHaveBeenCalled();
      expect(audioInstances[0].pause).toHaveBeenCalled();
      expect(audioInstances[0]._paused).toBe(true);
    });
  });

  it("does not play audio when audio is toggled off", async () => {
    jest.mocked(axios.post)
      .mockResolvedValueOnce({ data: { reply: "Test reply", audioFileUrl: "/api/audio?file=test.mp3" } })
      .mockResolvedValueOnce({ data: { reply: "Another reply", audioFileUrl: "/api/audio?file=another.mp3" } });
    const { container, getByText } = render(<ChatPage />);
    const input = container.querySelector('.chat-input') as HTMLInputElement;
    const sendButton = container.querySelector(".chat-send-button");
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.click(sendButton!);
    await waitFor(() => expect(audioInstances.length).toBe(1));
    // Toggle audio off
    const toggleContainer = container.querySelector(".toggle-container");
    const audioLabel = getByText("Audio");
    expect(toggleContainer).not.toBeNull();
    expect(audioLabel).toBeInTheDocument();
    const toggleElement = toggleContainer!.querySelector("[class*='toggle-switch']");
    fireEvent.click(toggleElement!);
    // Send another message
    fireEvent.change(input, { target: { value: "Another message" } });
    fireEvent.click(sendButton!);
    // No new audio should be created
    await waitFor(() => {
      expect(audioInstances.length).toBe(1);
    });
  });
});