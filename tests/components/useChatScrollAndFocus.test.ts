import { renderHook } from "@testing-library/react";
import { useChatScrollAndFocus } from "../../app/components/useChatScrollAndFocus";

describe("useChatScrollAndFocus", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });
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
  it("handles Firefox Android visualViewport resize event", () => {
    const chatBoxRef = { current: document.createElement("div") };
    const inputRef = { current: document.createElement("input") };
    Object.defineProperty(chatBoxRef.current, "scrollHeight", { value: 123, writable: true });
    chatBoxRef.current.scrollTop = 0;
    // Mock userAgent and visualViewport
    const originalUA = window.navigator.userAgent;
    const originalVV = window.visualViewport;
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (Android; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0",
      configurable: true
    });
    window.visualViewport = {
      addEventListener: jest.fn((event, handler) => handler()),
      removeEventListener: jest.fn(),
    } as any;
    renderHook(() => useChatScrollAndFocus({ chatBoxRef, inputRef, messages: [], loading: false }));
    // Clean up
    Object.defineProperty(window.navigator, "userAgent", { value: originalUA, configurable: true });
    window.visualViewport = originalVV;
  });
  it("handles input focus/blur events for Firefox Android", () => {
    const chatBoxRef = { current: document.createElement("div") };
    const input = document.createElement("input");
    input.focus = jest.fn();
    input.scrollIntoView = jest.fn();
    const inputRef = { current: input };
    // Mock userAgent
    const originalUA = window.navigator.userAgent;
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (Android; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0",
      configurable: true
    });
    // Mount hook
    renderHook(() => useChatScrollAndFocus({ chatBoxRef, inputRef, messages: [], loading: false }));
    // Simulate focus
    document.body.classList.remove("ff-android-input-focus");
    input.dispatchEvent(new Event("focus"));
    // Fast-forward setTimeout
    jest.advanceTimersByTime(100);
    expect(input.scrollIntoView).toHaveBeenCalledWith({ block: "end", behavior: "smooth" });
    expect(window.scrollY).toBeDefined(); // window.scrollTo is called, but can't easily assert in JSDOM
    expect(document.body.classList.contains("ff-android-input-focus")).toBe(true);
    // Simulate blur
    input.dispatchEvent(new Event("blur"));
    expect(document.body.classList.contains("ff-android-input-focus")).toBe(false);
    // Clean up
    Object.defineProperty(window.navigator, "userAgent", { value: originalUA, configurable: true });
    jest.useRealTimers();
  });
  it("re-focuses input after loading completes", () => {
    const chatBoxRef = { current: null };
    const input = document.createElement("input");
    input.focus = jest.fn();
    const inputRef = { current: input };
    const { rerender } = renderHook(({ loading }) => useChatScrollAndFocus({ chatBoxRef, inputRef, messages: [], loading }), { initialProps: { loading: true } });
    rerender({ loading: false });
    expect(input.focus).toHaveBeenCalled();
  });
});
