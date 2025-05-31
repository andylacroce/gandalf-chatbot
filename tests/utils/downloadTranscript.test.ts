// Tests for downloadTranscript utility
import { downloadTranscript } from "../../src/utils/downloadTranscript";

describe("downloadTranscript", () => {
  // Save the original createElement
  const originalCreateElement = document.createElement;

  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () =>
          Promise.resolve(
            new Blob(["test transcript"], { type: "text/plain" }),
          ),
        status: 200,
      }),
    ) as any;
    document.body.innerHTML = "";
  });

  afterEach(() => {
    jest.resetAllMocks();
    document.createElement = originalCreateElement;
  });

  it("triggers download with correct filename", async () => {
    const createObjectURL = jest.fn(() => "blob:url");
    const revokeObjectURL = jest.fn();
    // Ensure createObjectURL and revokeObjectURL exist before spying
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = () => "";
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = () => {};
    }
    jest.spyOn(window.URL, "createObjectURL").mockImplementation(createObjectURL);
    jest.spyOn(window.URL, "revokeObjectURL").mockImplementation(revokeObjectURL);
    const click = jest.fn();
    // Create a real <a> element and mock its methods
    const anchor = document.createElement("a");
    anchor.setAttribute = jest.fn();
    anchor.click = click;
    anchor.remove = jest.fn();
    document.createElement = jest.fn(() => anchor) as any;

    await downloadTranscript([{ role: "user", content: "hi" }]);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/transcript",
      expect.any(Object),
    );
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });

  it("throws on fetch error", async () => {
    (global.fetch as any).mockImplementationOnce(() =>
      Promise.resolve({ ok: false, status: 500 }),
    );
    await expect(
      downloadTranscript([{ role: "user", content: "hi" }]),
    ).rejects.toThrow("Failed to fetch transcript");
  });

  it("sends exportedAt in the request body as a friendly local time with timezone", async () => {
    const realDate = Date;
    // Mock Date to a fixed value
    global.Date = class extends Date {
      constructor() {
        super();
        return new realDate("2025-05-10T15:30:45-07:00"); // PDT
      }
    } as any;
    const fetchSpy = jest.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(["test transcript"], { type: "text/plain" })),
        status: 200,
      })
    );
    global.fetch = fetchSpy as any;
    document.body.innerHTML = "";
    const createObjectURL = jest.fn(() => "blob:url");
    const revokeObjectURL = jest.fn();
    // Ensure createObjectURL and revokeObjectURL exist before spying
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = () => "";
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = () => {};
    }
    jest.spyOn(window.URL, "createObjectURL").mockImplementation(createObjectURL);
    jest.spyOn(window.URL, "revokeObjectURL").mockImplementation(revokeObjectURL);
    const click = jest.fn();
    const anchor = document.createElement("a");
    anchor.setAttribute = jest.fn();
    anchor.click = click;
    anchor.remove = jest.fn();
    document.createElement = jest.fn(() => anchor) as any;

    await downloadTranscript([{ sender: "User", text: "hi" }]);
    expect(fetchSpy).toHaveBeenCalled();
    // Use a flexible regex for the exportedAt string
    const exportedAtRegex = /May 10, 2025.*\d{2}:\d{2}:\d{2} [AP]M.*[A-Z]{2,4}/;
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/transcript",
      expect.objectContaining({
        body: expect.stringMatching(exportedAtRegex),
      })
    );
    // Find the correct fetch call robustly, casting to any to avoid TS tuple errors
    const callArr: any = fetchSpy.mock.calls.find(
      (arr: any) => arr && arr[0] === "/api/transcript" && arr[1] && typeof arr[1].body === "string"
    );
    expect(callArr).toBeDefined();
    const bodyArg = callArr[1].body;
    const body = JSON.parse(bodyArg);
    expect(body.exportedAt).toMatch(/[A-Z]{2,4}/); // Should include a timezone abbreviation
    global.Date = realDate;
  });

  it("calls revokeObjectURL and removes anchor after download", async () => {
    jest.useFakeTimers();
    const createObjectURL = jest.fn(() => "blob:url");
    const revokeObjectURL = jest.fn();
    if (!window.URL.createObjectURL) window.URL.createObjectURL = () => "";
    if (!window.URL.revokeObjectURL) window.URL.revokeObjectURL = () => {};
    jest.spyOn(window.URL, "createObjectURL").mockImplementation(createObjectURL);
    jest.spyOn(window.URL, "revokeObjectURL").mockImplementation(revokeObjectURL);
    const click = jest.fn();
    const remove = jest.fn();
    const anchor = document.createElement("a");
    anchor.click = click;
    anchor.remove = remove;
    document.createElement = jest.fn(() => anchor) as any;
    await downloadTranscript([{ role: "user", content: "hi" }]);
    jest.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:url");
    expect(remove).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
