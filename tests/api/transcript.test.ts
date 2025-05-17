import handler from "../../pages/api/transcript";
import { createMocks } from "node-mocks-http";

beforeEach(() => {
  process.env.INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || "test-secret";
  jest.resetModules();
  jest.mock("../../src/utils/logger", () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }));
});

describe("/api/transcript", () => {
  it(
    "should handle transcript",
    async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: {
          messages: [
            { sender: "User", text: "Hello" },
            { sender: "Gandalf", text: "You shall not pass!" },
          ],
          exportedAt: "2025-05-17 12:00:00 PDT",
        },
        headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
      });
      await handler(req as unknown as import("next").NextApiRequest, res as unknown as import("next").NextApiResponse);
      expect(res._getStatusCode()).toBe(200);
      expect(res._getData()).toContain("Gandalf Chatbot Transcript");
      expect(res._getData()).toContain("Me: Hello");
      expect(res._getData()).toContain("Gandalf: You shall not pass!");
    },
    10000 // 10 seconds timeout
  );
});