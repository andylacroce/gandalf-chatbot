import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import { useAudioPlayer } from "../../app/components/useAudioPlayer";

describe("useAudioPlayer", () => {
  let originalAudio: any;
  beforeAll(() => {
    originalAudio = global.Audio;
  });
  afterAll(() => {
    global.Audio = originalAudio;
  });

  function setupAudioMock() {
    const play = jest.fn();
    const pause = jest.fn();
    const addEventListener = jest.fn();
    const removeEventListener = jest.fn();
    const audioMock: any = {
      play,
      pause,
      addEventListener,
      removeEventListener,
      currentTime: 0,
      _paused: false,
    };
    global.Audio = jest.fn(() => audioMock);
    return { play, pause, addEventListener, removeEventListener, audioMock };
  }

  it("does nothing if audioEnabledRef.current is false", async () => {
    const audioEnabledRef = { current: false };
    const { result } = renderHook(() => useAudioPlayer(audioEnabledRef));
    const { play } = setupAudioMock();
    await act(async () => {
      await result.current.playAudio("test.mp3");
    });
    expect(play).not.toHaveBeenCalled();
  });

  it("pauses and resets previous audio before playing new audio", async () => {
    const audioEnabledRef = { current: true };
    const { result } = renderHook(() => useAudioPlayer(audioEnabledRef));
    const { play, pause, audioMock } = setupAudioMock();
    // Simulate previous audio
    result.current.audioRef.current = audioMock;
    await act(async () => {
      await result.current.playAudio("test.mp3");
    });
    expect(pause).toHaveBeenCalled();
    expect(audioMock.currentTime).toBe(0);
    expect(play).toHaveBeenCalled();
  });

  it("sets _paused to false if present on audio", async () => {
    const audioEnabledRef = { current: true };
    const { result } = renderHook(() => useAudioPlayer(audioEnabledRef));
    const { audioMock } = setupAudioMock();
    audioMock._paused = true;
    await act(async () => {
      await result.current.playAudio("test.mp3");
    });
    expect(audioMock._paused).toBe(false);
  });

  it("does not set _paused if property is undefined", async () => {
    const audioEnabledRef = { current: true };
    const { result } = renderHook(() => useAudioPlayer(audioEnabledRef));
    const { audioMock } = setupAudioMock();
    delete audioMock._paused;
    await act(async () => {
      await result.current.playAudio("test.mp3");
    });
    // Should not throw or set _paused
    expect(audioMock._paused).toBeUndefined();
  });

  it("removes event listener and clears ref on audio end", async () => {
    const audioEnabledRef = { current: true };
    const { result } = renderHook(() => useAudioPlayer(audioEnabledRef));
    const { audioMock } = setupAudioMock();
    let playHandler: any;
    audioMock.addEventListener = jest.fn((event, handler) => {
      if (event === "play") playHandler = handler;
    });
    audioMock.removeEventListener = jest.fn();
    await act(async () => {
      await result.current.playAudio("test.mp3");
    });
    // Simulate audio end
    await act(async () => {
      await audioMock.onended();
    });
    expect(audioMock.removeEventListener).toHaveBeenCalledWith("play", playHandler);
    expect(result.current.audioRef.current).toBe(null);
  });

  it("stops audio if audioEnabledRef is toggled off during play event", async () => {
    const audioEnabledRef = { current: true };
    const { result } = renderHook(() => useAudioPlayer(audioEnabledRef));
    const { audioMock } = setupAudioMock();
    let playHandler: any;
    audioMock.addEventListener = jest.fn((event, handler) => {
      if (event === "play") playHandler = handler;
    });
    await act(async () => {
      await result.current.playAudio("test.mp3");
    });
    // Toggle audio off and trigger play event
    audioEnabledRef.current = false;
    playHandler();
    expect(audioMock.pause).toHaveBeenCalled();
    expect(audioMock.currentTime).toBe(0);
  });

  it("returns the audio object when played", async () => {
    const audioEnabledRef = { current: true };
    const { result } = renderHook(() => useAudioPlayer(audioEnabledRef));
    const { audioMock } = setupAudioMock();
    let returnedAudio;
    await act(async () => {
      returnedAudio = await result.current.playAudio("test.mp3");
    });
    expect(returnedAudio).toBe(audioMock);
  });

  it("returns early if audioEnabledRef.current is toggled off after audio is created", async () => {
    const audioEnabledRef = { current: true };
    const { result } = renderHook(() => useAudioPlayer(audioEnabledRef));
    const { audioMock } = setupAudioMock();
    // Simulate toggling off after audio is created but before event listeners
    (global.Audio as any) = jest.fn(() => {
      // Toggle off right after audio is constructed
      audioEnabledRef.current = false;
      return audioMock;
    });
    let returnedAudio;
    await act(async () => {
      returnedAudio = await result.current.playAudio("test.mp3");
    });
    expect(returnedAudio).toBeUndefined();
    // Should not add event listeners or play
    expect(audioMock.addEventListener).not.toHaveBeenCalled();
    expect(audioMock.play).not.toHaveBeenCalled();
  });
});
