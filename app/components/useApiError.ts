import { useState, useCallback } from "react";

/**
 * Custom hook to handle API error state and user-friendly messages.
 * Returns error, setError, and a handler for API errors.
 */
export function useApiError() {
  const [error, setError] = useState("");

  // Handles different error types and sets a user-friendly message
  const handleApiError = useCallback((err: unknown) => {
    if (!err) {
      setError("");
      return;
    }
    // Always show a user-friendly message for generic, network, or unknown errors
    const genericErrorMsg = "Error sending message. Please try again.";
    if (typeof err === "string") {
      setError(genericErrorMsg);
    } else if (err && typeof err === "object") {
      const anyErr = err as any;
      if (anyErr.response) {
        if (anyErr.response.status === 429) {
          setError("You are sending messages too quickly. Please wait and try again.");
        } else if (anyErr.response.status === 408) {
          setError("The server took too long to respond. Please try again.");
        } else if (anyErr.response.status >= 500) {
          setError(genericErrorMsg);
        } else if (anyErr.response.data && typeof anyErr.response.data.error === "string") {
          setError(anyErr.response.data.error);
        } else {
          setError(genericErrorMsg);
        }
      } else if (anyErr.message && typeof anyErr.message === "string") {
        setError(genericErrorMsg);
      } else {
        setError(genericErrorMsg);
      }
    } else {
      setError(genericErrorMsg);
    }
  }, []);

  return { error, setError, handleApiError };
}
