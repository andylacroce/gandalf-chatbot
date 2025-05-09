import { useEffect, useCallback } from "react";

/**
 * Custom hook to handle chat scroll and input focus logic for the chat page.
 * @param chatBoxRef - Ref to the chat messages container
 * @param inputRef - Ref to the chat input field
 * @param messages - Array of chat messages
 */
export function useChatScrollAndFocus({
  chatBoxRef,
  inputRef,
  messages,
  loading
}: {
  chatBoxRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  messages: any[];
  loading: boolean;
}) {
  // Scroll to bottom utility
  const scrollToBottom = useCallback(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatBoxRef]);

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Scroll to bottom on window resize (e.g., mobile keyboard appears)
  useEffect(() => {
    const handleResize = () => {
      scrollToBottom();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [scrollToBottom]);

  // Focus input field on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  // Scroll to bottom when input is focused (mobile keyboard)
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const handleFocus = () => scrollToBottom();
    input.addEventListener("focus", handleFocus);
    return () => input.removeEventListener("focus", handleFocus);
  }, [inputRef, scrollToBottom]);

  // Re-focus input field after loading completes
  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading, inputRef]);
}
