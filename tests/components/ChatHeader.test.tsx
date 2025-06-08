import React from "react";
import { render, fireEvent } from "@testing-library/react";
import ChatHeader from "../../app/components/ChatHeader";

describe("ChatHeader", () => {
  it("renders header and all key elements", () => {
    const { getByTestId, getByLabelText, getAllByRole } = render(
      <ChatHeader
        onDownloadTranscript={jest.fn()}
      />
    );
    expect(getByTestId("chat-header")).toBeInTheDocument();
    expect(getByLabelText("Download chat transcript")).toBeInTheDocument();
    // Mastodon and Dexter links
    const links = getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it("calls onDownloadTranscript and onHeaderLinkClick when transcript button is clicked", () => {
    const onDownloadTranscript = jest.fn();
    const onHeaderLinkClick = jest.fn();
    const { getByLabelText } = render(
      <ChatHeader
        onDownloadTranscript={onDownloadTranscript}
        onHeaderLinkClick={onHeaderLinkClick}
      />
    );
    fireEvent.click(getByLabelText("Download chat transcript"));
    expect(onDownloadTranscript).toHaveBeenCalled();
    expect(onHeaderLinkClick).toHaveBeenCalled();
  });

  it("calls onHeaderLinkClick when Mastodon or Dexter links are clicked", () => {
    const onHeaderLinkClick = jest.fn();
    const { getAllByRole } = render(
      <ChatHeader
        onDownloadTranscript={jest.fn()}
        onHeaderLinkClick={onHeaderLinkClick}
      />
    );
    const links = getAllByRole("link");
    fireEvent.click(links[0]);
    fireEvent.click(links[1]);
    expect(onHeaderLinkClick).toHaveBeenCalledTimes(2);
  });
});
