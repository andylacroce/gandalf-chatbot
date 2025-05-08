import { useRef, useCallback } from "react";

/**
 * Custom hook to handle audio playback for chat messages.
 * Ensures only one audio plays at a time and respects an audioEnabled ref.
 * Returns playAudio(audioFileUrl: string) and audioRef.
 */
export function useAudioPlayer(audioEnabledRef: React.MutableRefObject<boolean>) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback(async (audioFileUrl: string) => {
    if (!audioEnabledRef.current) return;
    if (audioRef.current) {
      if (typeof audioRef.current.pause === "function") {
        audioRef.current.pause();
      }
      if (typeof audioRef.current.currentTime === "number") {
        audioRef.current.currentTime = 0;
      }
    }
    const audio = new Audio(audioFileUrl);
    audioRef.current = audio;
    if (typeof (audio as any)._paused !== "undefined") {
      (audio as any)._paused = false;
    }
    if (!audioEnabledRef.current) return;
    const handlePlay = () => {
      if (!audioEnabledRef.current) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
    audio.addEventListener('play', handlePlay);
    audio.onended = async () => {
      audio.removeEventListener('play', handlePlay);
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
    if (!audioEnabledRef.current) return;
    audio.play();
    return audio;
  }, [audioEnabledRef]);

  return { playAudio, audioRef };
}
