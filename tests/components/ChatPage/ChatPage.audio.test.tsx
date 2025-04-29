import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import ChatPage from "../../../app/components/ChatPage";
jest.mock("axios");

describe("ChatPage", () => {
  describe("Audio", () => {
    describe("ChatPage Audio", () => {
      beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(axios.get).mockResolvedValue({ data: { status: "ok" } }); // Mock health check
      });
      it("plays audio when a reply with an audio URL is received", async () => {
        const audioPlayMock = jest.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
        jest.mocked(axios.post).mockResolvedValue({
          data: { reply: "You shall not pass!", audioFileUrl: "/api/audio?file=gandalf_reply.mp3" },
        });
        const { getByPlaceholderText, getByRole } = render(<ChatPage />);
        const input = getByPlaceholderText("Type in your message here...");
        const sendButton = getByRole("button", { name: /Send/i });
        fireEvent.change(input, { target: { value: "Hello, Gandalf!" } });
        fireEvent.click(sendButton);
        await waitFor(() => {
          expect(audioPlayMock).toHaveBeenCalled();
        });
        audioPlayMock.mockRestore();
      });
      describe("Audio playback exclusivity", () => {
        let playMock: jest.SpyInstance<Promise<void>, []>;
        let pauseMock: jest.SpyInstance<void, []>;
        let audioInstances: any[] = [];
        beforeAll(() => {
          playMock = jest.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) { return Promise.resolve(); });
          pauseMock = jest.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(function (this: any) { this._paused = true; });
          window.Audio = function AudioMock(this: any, src?: string) {
            const audioMock = { src: src ?? "", currentTime: 0, _paused: false, play: playMock, pause: pauseMock, addEventListener: jest.fn(), removeEventListener: jest.fn() };
            audioInstances.push(audioMock);
            return audioMock as unknown as HTMLAudioElement;
          } as any;
        });
        afterAll(() => {
          playMock.mockRestore();
          pauseMock.mockRestore();
        });
        afterEach(() => {
          audioInstances.length = 0;
          jest.clearAllMocks();
        });
        it("should stop previous audio before playing new audio", async () => {
          const { getByPlaceholderText, getByRole } = render(<ChatPage />);
          const input = getByPlaceholderText("Type in your message here...");
          const sendButton = getByRole("button", { name: /Send/i });
          jest.mocked(axios.post)
            .mockResolvedValueOnce({ data: { reply: "First reply", audioFileUrl: "/api/audio?file=first.mp3" } })
            .mockResolvedValueOnce({ data: { reply: "Second reply", audioFileUrl: "/api/audio?file=second.mp3" } });
          fireEvent.change(input, { target: { value: "Hello" } });
          fireEvent.click(sendButton);
          await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
          fireEvent.change(input, { target: { value: "Hi again" } });
          fireEvent.click(sendButton);
          await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));
          expect(audioInstances.length).toBe(2);
          expect(pauseMock).toHaveBeenCalledTimes(1);
          expect(audioInstances[1]._paused).toBe(false);
        });
      });
    });
  });
});