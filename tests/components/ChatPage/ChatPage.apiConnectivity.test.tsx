import React from "react";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import ChatPage from "../../../app/components/ChatPage";
jest.mock("axios");

describe("ChatPage API connectivity", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("shows API connectivity error and disables chat if /api/health fails", async () => {
    jest.mocked(axios.get).mockRejectedValue(new Error("Network Error"));
    const { getByTestId, getByRole, container } = render(<ChatPage />);
    await waitFor(() => {
      expect(getByTestId("api-error-message")).toBeInTheDocument();
    });
    // The input is present and disabled, but has no placeholder when API is down
    const input = container.querySelector('input[type="text"]');
    expect(input).toBeDisabled();
    expect(getByRole("button", { name: /HOLD/i })).toBeDisabled();
  });

  it("does not show API error if /api/health succeeds", async () => {
    jest.mocked(axios.get).mockResolvedValue({ data: { status: "ok" } });
    const { queryByTestId, getByPlaceholderText, getByRole } = render(<ChatPage />);
    await waitFor(() => {
      expect(getByPlaceholderText("Type in your message here...")).not.toBeDisabled();
      expect(getByRole("button", { name: /Send/i })).not.toBeDisabled();
    });
    expect(queryByTestId("api-error-message")).not.toBeInTheDocument();
  });
});
