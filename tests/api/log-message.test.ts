// Polyfill TextDecoder for Node.js test environment
import { TextDecoder } from "util";
if (!global.TextDecoder) {
  // @ts-ignore
  global.TextDecoder = TextDecoder;
}

// Tests for the /api/log-message endpoint
import handler from "../../pages/api/log-message";
import { createMocks } from "node-mocks-http";

beforeEach(() => {
  process.env.INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || "test-secret";
});

describe("/api/log-message", () => {
  it("returns 200 for valid POST", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        sender: "user",
        text: "hello",
        sessionId: "abc12345",
        sessionDatetime: "2025-05-03T12-00-00",
      },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {}; // Add missing env property
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toHaveProperty("success", true);
  });

  it("returns 400 for missing fields", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: { sender: "user" },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {}; // Add missing env property
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
  });

  it("returns 405 for GET", async () => {
    const { req, res } = createMocks({
      method: "GET",
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {}; // Add missing env property
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(405);
  });

  it("returns 400 for invalid sender (not a string)", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        sender: 123,
        text: "hello",
        sessionId: "abc12345",
        sessionDatetime: "2025-05-03T12-00-00",
      },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {};
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData()).toContain("Invalid sender");
  });

  it("returns 400 for invalid sender (too long)", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        sender: "a".repeat(101),
        text: "hello",
        sessionId: "abc12345",
        sessionDatetime: "2025-05-03T12-00-00",
      },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {};
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData()).toContain("Invalid sender");
  });

  it("returns 400 for invalid text (not a string)", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        sender: "user",
        text: 123,
        sessionId: "abc12345",
        sessionDatetime: "2025-05-03T12-00-00",
      },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {};
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData()).toContain("Invalid text");
  });

  it("returns 400 for invalid text (too long)", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        sender: "user",
        text: "a".repeat(2001),
        sessionId: "abc12345",
        sessionDatetime: "2025-05-03T12-00-00",
      },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {};
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData()).toContain("Invalid text");
  });

  it("returns 400 for invalid sessionId (not a string)", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        sender: "user",
        text: "hello",
        sessionId: 123,
        sessionDatetime: "2025-05-03T12-00-00",
      },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {};
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData()).toContain("Invalid sessionId");
  });

  it("returns 400 for invalid sessionId (too long)", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        sender: "user",
        text: "hello",
        sessionId: "a".repeat(101),
        sessionDatetime: "2025-05-03T12-00-00",
      },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {};
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData()).toContain("Invalid sessionId");
  });

  it("returns 400 for invalid sessionDatetime (not a string)", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        sender: "user",
        text: "hello",
        sessionId: "abc12345",
        sessionDatetime: 123,
      },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {};
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData()).toContain("Invalid sessionDatetime");
  });

  it("returns 400 for invalid sessionDatetime (too long)", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        sender: "user",
        text: "hello",
        sessionId: "abc12345",
        sessionDatetime: "a".repeat(31),
      },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {};
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData()).toContain("Invalid sessionDatetime");
  });

  it("returns 500 for internal server error (blob)", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "1";
    const { req, res } = createMocks({
      method: "POST",
      body: {
        sender: "user",
        text: "hello",
        sessionId: "abc12345",
        sessionDatetime: "2025-05-03T12-00-00",
      },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {};
    // Mock put to throw
    jest.spyOn(require("@vercel/blob"), "put").mockImplementation(() => { throw new Error("fail"); });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(500);
    expect(res._getData()).toContain("Internal Server Error");
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it("returns 500 for internal server error (file)", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        sender: "user",
        text: "hello",
        sessionId: "abc12345",
        sessionDatetime: "2025-05-03T12-00-00",
      },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {};
    // Mock fs.appendFileSync to throw
    jest.spyOn(require("fs"), "appendFileSync").mockImplementation(() => { throw new Error("fail"); });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(500);
    expect(res._getData()).toContain("Internal Server Error");
    jest.restoreAllMocks();
  });

  it("handles non-404 error in blob head/fetch logic gracefully", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "1";
    const { req, res } = createMocks({
      method: "POST",
      body: {
        sender: "user",
        text: "hello",
        sessionId: "abc12345",
        sessionDatetime: "2025-05-03T12-00-00",
      },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {};
    // Mock head to throw a non-404 error
    jest.spyOn(require("@vercel/blob"), "head").mockImplementation(() => { const err: any = new Error("fail"); err.status = 500; throw err; });
    jest.spyOn(require("@vercel/blob"), "put").mockImplementation(() => {});
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    jest.restoreAllMocks();
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it("escapes HTML and strips control characters in logs", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        sender: "<script>alert('x')</script>\n\t",
        text: "<b>hello</b>\r\n",
        sessionId: "abc12345",
        sessionDatetime: "2025-05-03T12-00-00",
      },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {};
    let logged = "";
    jest.spyOn(require("fs"), "appendFileSync").mockImplementation((...args) => { logged = String(args[1]); });
    await handler(req as any, res as any);
    // Extract the message part from the log entry
    const match = logged.match(/\] \[.*?\] (.*?): (.*?)\n/);
    expect(match).toBeTruthy();
    const [ , sender, text ] = match!;
    expect(sender).toBe("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    expect(text).toBe("&lt;b&gt;hello&lt;/b&gt;");
    expect(sender).not.toMatch(/[\n\t\r]/);
    expect(text).not.toMatch(/[\n\t\r]/);
    jest.restoreAllMocks();
  });

  it("returns 500 for unexpected error at top of handler", async () => {
    // Simulate a request object that throws when accessing a property
    const { req, res } = createMocks({
      method: "POST",
      body: {
        sender: "user",
        text: "hello",
        sessionId: "abc12345",
        sessionDatetime: "2025-05-03T12-00-00",
      },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    Object.defineProperty(req, "body", {
      get() { throw new Error("fail"); },
    });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(500);
    expect(res._getData()).toContain("Internal Server Error");
  });

  it("handles blobInfo falsy branch", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "1";
    const { req, res } = createMocks({
      method: "POST",
      body: {
        sender: "user",
        text: "hello",
        sessionId: "abc12345",
        sessionDatetime: "2025-05-03T12-00-00",
      },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {};
    jest.spyOn(require("@vercel/blob"), "head").mockResolvedValue(undefined);
    jest.spyOn(require("@vercel/blob"), "put").mockImplementation(() => {});
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    jest.restoreAllMocks();
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it("handles blobInfo.url falsy branch", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "1";
    const { req, res } = createMocks({
      method: "POST",
      body: {
        sender: "user",
        text: "hello",
        sessionId: "abc12345",
        sessionDatetime: "2025-05-03T12-00-00",
      },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {};
    jest.spyOn(require("@vercel/blob"), "head").mockResolvedValue({});
    jest.spyOn(require("@vercel/blob"), "put").mockImplementation(() => {});
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    jest.restoreAllMocks();
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it("handles response.ok false branch in blob logic", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "1";
    const { req, res } = createMocks({
      method: "POST",
      body: {
        sender: "user",
        text: "hello",
        sessionId: "abc12345",
        sessionDatetime: "2025-05-03T12-00-00",
      },
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    });
    (req as any).env = {};
    jest.spyOn(require("@vercel/blob"), "head").mockResolvedValue({ url: "http://fake.url" });
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    jest.spyOn(require("@vercel/blob"), "put").mockImplementation(() => {});
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    jest.restoreAllMocks();
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });
});
