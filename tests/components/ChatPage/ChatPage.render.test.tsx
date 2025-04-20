/**
 * Rendering and basic UI tests for ChatPage
 */
import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import ChatPage from "../../../app/components/ChatPage";

describe("ChatPage", () => {
  describe("Rendering", () => {
    it("renders ChatPage component", () => {
      const { getByPlaceholderText, getByAltText } = render(<ChatPage />);
      expect(getByPlaceholderText("Type in your message here...")).toBeInTheDocument();
      expect(getByAltText("Gandalf")).toBeInTheDocument();
    });
  });
});
