import React from "react";
import { render, fireEvent } from "@testing-library/react";
import ChatHeader from "../../app/components/ChatHeader";

jest.mock("@trendmicro/react-toggle-switch", () => (props: any) => (
  <button data-testid="mock-toggle" onClick={() => props.onChange && props.onChange()}>{props.checked ? "ON" : "OFF"}</button>
));

describe("ChatHeader", () => {
  it("renders header and all key elements", () => {
    const { getByTestId, getByText, getByLabelText, getAllByRole } = render(
      <ChatHeader
        audioEnabled={true}
        onAudioToggle={jest.fn()}
        onDownloadTranscript={jest.fn()}
      />
    );
    expect(getByTestId("chat-header")).toBeInTheDocument();
    expect(getByText("Audio")).toBeInTheDocument();
    expect(getByLabelText("Download chat transcript")).toBeInTheDocument();
    // Mastodon and Dexter links
    const links = getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it("calls onAudioToggle when toggle is clicked", () => {
    const onAudioToggle = jest.fn();
    const { getByTestId } = render(
      <ChatHeader
        audioEnabled={false}
        onAudioToggle={onAudioToggle}
        onDownloadTranscript={jest.fn()}
      />
    );
    fireEvent.click(getByTestId("mock-toggle"));
    expect(onAudioToggle).toHaveBeenCalled();
  });

  it("calls onDownloadTranscript and onHeaderLinkClick when transcript button is clicked", () => {
    const onDownloadTranscript = jest.fn();
    const onHeaderLinkClick = jest.fn();
    const { getByLabelText } = render(
      <ChatHeader
        audioEnabled={true}
        onAudioToggle={jest.fn()}
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
        audioEnabled={true}
        onAudioToggle={jest.fn()}
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
