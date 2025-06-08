import { renderHook } from "@testing-library/react";
import { useChatScrollAndFocus } from "../../app/components/useChatScrollAndFocus";

describe("useChatScrollAndFocus", () => {
  function createInputMock(): HTMLInputElement {
    const input = document.createElement("input");
    input.focus = jest.fn();
    return input;
  }
  function createDivMock(): HTMLDivElement {
    const div = document.createElement("div");
    Object.defineProperty(div, "scrollHeight", { value: 100, writable: true });
    div.scrollTop = 0;
    return div;
  }
  it("scrolls to bottom when messages change", () => {
    const chatBoxRef = { current: createDivMock() };
    const inputRef = { current: createInputMock() };
    const messages: any[] = [1, 2];
    renderHook(() => useChatScrollAndFocus({ chatBoxRef, inputRef, messages, loading: false }));
    expect(chatBoxRef.current!.scrollTop).toBe(chatBoxRef.current!.scrollHeight);
  });
  it("focuses input on mount and after loading", () => {
    const chatBoxRef = { current: null };
    const inputRef = { current: createInputMock() };
    const messages: any[] = [];
    renderHook(() => useChatScrollAndFocus({ chatBoxRef, inputRef, messages, loading: false }));
    expect(inputRef.current!.focus).toHaveBeenCalled();
  });
  it("adds and removes resize event listener", () => {
    const chatBoxRef = { current: createDivMock() };
    const inputRef = { current: createInputMock() };
    const messages: any[] = [];
    const { unmount } = renderHook(() => useChatScrollAndFocus({ chatBoxRef, inputRef, messages, loading: false }));
    window.dispatchEvent(new Event("resize"));
    unmount();
  });
});
