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
        // Also mock the delete method to return a resolved promise
        jest.mocked(axios.delete).mockResolvedValue({ data: { status: "ok" } });
        // Mock scrollIntoView for all elements
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
      });
      
      it("plays audio when a reply with an audio URL is received", async () => {
        const audioPlayMock = jest.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
        jest.mocked(axios.post).mockResolvedValue({
          data: { reply: "You shall not pass!", audioFileUrl: "/api/audio?file=gandalf_reply.mp3" },
        });
        
        const { getByPlaceholderText, container } = render(<ChatPage />);
        const input = getByPlaceholderText("Type in your message here...");
        const sendButton = container.querySelector(".chat-send-button");
        expect(sendButton).toBeInTheDocument();
        
        fireEvent.change(input, { target: { value: "Hello, Gandalf!" } });
        fireEvent.click(sendButton!);
        
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
            const audioMock = { 
              src: src ?? "", 
              currentTime: 0, 
              _paused: false, 
              play: jest.fn().mockImplementation(() => {
                // Return a real Promise with a catch method
                return Promise.resolve();
              }),
              pause: pauseMock, 
              addEventListener: jest.fn(), 
              removeEventListener: jest.fn() 
            };
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
          const { getByPlaceholderText, container } = render(<ChatPage />);
          const input = getByPlaceholderText("Type in your message here...");
          const sendButton = container.querySelector(".chat-send-button");
          expect(sendButton).toBeInTheDocument();
          
          jest.mocked(axios.post)
            .mockResolvedValueOnce({ data: { reply: "First reply", audioFileUrl: "/api/audio?file=first.mp3" } })
            .mockResolvedValueOnce({ data: { reply: "Second reply", audioFileUrl: "/api/audio?file=second.mp3" } });
          
          // Send first message
          fireEvent.change(input, { target: { value: "Hello" } });
          fireEvent.click(sendButton!);
          
          await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
          
          // Send second message
          fireEvent.change(input, { target: { value: "Hi again" } });
          fireEvent.click(sendButton!);
          
          await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));
          
          // Validate proper audio behavior
          expect(audioInstances.length).toBe(2);
          expect(pauseMock).toHaveBeenCalledTimes(1);
          expect(audioInstances[1]._paused).toBe(false);
        });
        
        it("should toggle audio playback when the audio toggle is clicked", async () => {
          // Render the component
          const { container, getByText } = render(<ChatPage />);
          
          // Find the toggle container by its class name
          const toggleContainer = container.querySelector(".toggle-container");
          expect(toggleContainer).not.toBeNull();
          
          // Find the toggle label using getByLabelText for reliability
          const audioLabel = getByText("Audio");
          expect(audioLabel).toBeInTheDocument();
          
          // Find the actual toggle switch component within the container
          const toggleElement = toggleContainer!.querySelector("[class*='toggle-switch']");
          expect(toggleElement).not.toBeNull();
          
          // Create a mock audio first
          jest.mocked(axios.post)
            .mockResolvedValueOnce({ data: { reply: "Test reply", audioFileUrl: "/api/audio?file=test.mp3" } });
          
          const input = container.querySelector('.chat-input') as HTMLInputElement;
          const sendButton = container.querySelector(".chat-send-button");
          
          // Send message to create audio
          fireEvent.change(input, { target: { value: "Hello" } });
          fireEvent.click(sendButton!);
          
          await waitFor(() => expect(audioInstances.length).toBe(1));
          
          // Toggle audio off by clicking the toggle element
          fireEvent.click(toggleElement!);
          
          // Send another message
          fireEvent.change(input, { target: { value: "Another message" } });
          fireEvent.click(sendButton!);
          
          // No new audio should be created
          await waitFor(() => {
            expect(axios.post).toHaveBeenCalledTimes(2);
            expect(audioInstances.length).toBe(1); // Still just the first one
          });
        });
      });
    });
  });
});