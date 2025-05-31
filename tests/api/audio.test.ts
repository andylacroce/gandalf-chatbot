/**
 * @fileoverview Test suite for the audio API endpoint.
 * Tests file retrieval, security checks, and error handling.
 * @module tests/audio
 */

import { NextApiRequest, NextApiResponse } from "next";
import audioHandler from "../../pages/api/audio";

/**
 * Test suite for the Audio API handler
 * Tests all possible paths and edge cases for audio file retrieval
 */
describe("Audio API Handler", () => {
  const createTestObjects = () => {
    const req = {
      query: {},
      headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET },
    } as Partial<NextApiRequest>;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as NextApiResponse;

    return { req, res };
  };

  beforeEach(() => {
    process.env.INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || "test-secret";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return 400 if file parameter is missing", async () => {
    const { req, res } = createTestObjects();
    await audioHandler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "File parameter is required",
    });
  });

  jest.useFakeTimers();

  it("should return 404 if file does not exist", async () => {
    const { req, res } = createTestObjects();
    req.query = { file: "nonexistent.mp3" };
    jest.spyOn(require("fs"), "existsSync").mockReturnValue(false);
    const handlerPromise = audioHandler(
      req as NextApiRequest,
      res as NextApiResponse,
    );
    await jest.runAllTimersAsync();
    await handlerPromise;
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "File not found after all regeneration attempts" });
  });

  describe("file retrieval tests", () => {
    it("should return the audio file if it exists in /tmp", async () => {
      const { req, res } = createTestObjects();
      req.query = { file: "existing.mp3" };
      const audioContent = Buffer.from("audio content");
      jest
        .spyOn(require("fs"), "existsSync")
        .mockImplementation(
          (filePath) =>
            filePath === require("path").resolve("/tmp", "existing.mp3"),
        );
      jest
        .spyOn(require("fs"), "realpathSync")
        .mockReturnValue(require("path").resolve("/tmp", "existing.mp3"));
      jest.spyOn(require("fs"), "readFileSync").mockReturnValue(audioContent);
      await audioHandler(req as NextApiRequest, res as NextApiResponse);
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "audio/mpeg");
      expect(res.send).toHaveBeenCalledWith(audioContent);
    });

    it("should return the audio file if it exists in public", async () => {
      const { req, res } = createTestObjects();
      req.query = { file: "existing.mp3" };
      const audioContent = Buffer.from("audio content");
      jest
        .spyOn(require("fs"), "existsSync")
        .mockImplementation(
          (filePath) =>
            filePath === require("path").resolve("public", "existing.mp3"),
        );
      jest
        .spyOn(require("fs"), "realpathSync")
        .mockReturnValue(require("path").resolve("public", "existing.mp3"));
      jest.spyOn(require("fs"), "readFileSync").mockReturnValue(audioContent);
      // Simulate /tmp not existing
      jest
        .spyOn(require("fs"), "existsSync")
        .mockImplementation(
          (filePath) =>
            filePath === require("path").resolve("public", "existing.mp3"),
        );
      await audioHandler(req as NextApiRequest, res as NextApiResponse);
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "audio/mpeg");
      expect(res.send).toHaveBeenCalledWith(audioContent);
    });
  });

  describe("error handling tests", () => {
    it("should return 403 if the file path is not within /tmp or public", async () => {
      const { req, res } = createTestObjects();
      req.query = { file: "invalid.mp3" };
      jest.spyOn(require("fs"), "existsSync").mockReturnValue(true);
      jest
        .spyOn(require("fs"), "realpathSync")
        .mockReturnValue("/invalid/path/invalid.mp3");
      await audioHandler(req as NextApiRequest, res as NextApiResponse);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "Access forbidden" });
    });

    it("should return 500 if there is an error reading the file", async () => {
      const { req, res } = createTestObjects();
      req.query = { file: "existing.mp3" };
      jest.spyOn(require("fs"), "existsSync").mockReturnValue(true);
      jest
        .spyOn(require("fs"), "realpathSync")
        .mockReturnValue(require("path").resolve("/tmp", "existing.mp3"));
      jest.spyOn(require("fs"), "readFileSync").mockImplementation(() => {
        throw new Error("Error reading file");
      });
      await audioHandler(req as NextApiRequest, res as NextApiResponse);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Error reading file" });
    });
  });

  describe("OpenAI+TTS regeneration logic", () => {
    let originalEnv: NodeJS.ProcessEnv;
    beforeEach(() => {
      jest.useRealTimers(); // Ensure real timers for polling logic
      originalEnv = { ...process.env };
      process.env.OPENAI_API_KEY = "test-key";
    });
    afterEach(() => {
      process.env = { ...originalEnv };
      jest.restoreAllMocks();
      setOpenAIMock(undefined);
    });

    it("should attempt OpenAI+TTS regen and succeed on first try", async () => {
      const { req, res } = createTestObjects();
      req.query = { file: "regen.mp3" };
      // Track calls to existsSync and realpathSync
      let callCount = 0;
      jest.spyOn(require("fs"), "existsSync").mockImplementation(() => {
        callCount++;
        // First call: file does not exist, after regen: file exists
        return callCount > 1;
      });
      jest.spyOn(require("fs"), "realpathSync").mockReturnValue(require("path").resolve("/tmp", "regen.mp3"));
      setOpenAIMock({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({ choices: [{ message: { content: "Gandalf reply" } }] })
          }
        }
      });
      jest.spyOn(require("fs"), "writeFileSync").mockImplementation(() => {});
      jest.spyOn(require("../../src/utils/tts"), "synthesizeSpeechToFile").mockResolvedValue(undefined);
      jest.spyOn(require("fs"), "readFileSync").mockReturnValue(Buffer.from("audio content"));
      // Remove getReplyCache mock, only rely on .txt file for polling branch
      await audioHandler(req as NextApiRequest, res as NextApiResponse);
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "audio/mpeg");
      expect(res.send).toHaveBeenCalledWith(Buffer.from("audio content"));
    });

    it("should return 404 if OpenAI+TTS regen fails and file never appears", async () => {
      const { req, res } = createTestObjects();
      req.query = { file: "regenfail.mp3" };
      jest.spyOn(require("fs"), "existsSync").mockReturnValue(false);
      setOpenAIMock({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error("fail"))
          }
        }
      });
      jest.spyOn(require("fs"), "realpathSync").mockReturnValue("");
      jest.spyOn(require("fs"), "writeFileSync").mockImplementation(() => {});
      jest.spyOn(require("../../src/utils/tts"), "synthesizeSpeechToFile").mockRejectedValue(new Error("tts fail"));
      jest.spyOn(require("fs"), "readFileSync").mockImplementation(() => { throw new Error("not found"); });
      await audioHandler(req as NextApiRequest, res as NextApiResponse);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "File not found after all regeneration attempts" });
    });

    it("should return 404 if OPENAI_API_KEY is missing during regen", async () => {
      const { req, res } = createTestObjects();
      req.query = { file: "regenfail.mp3" };
      process.env.OPENAI_API_KEY = "";
      jest.spyOn(require("fs"), "existsSync").mockReturnValue(false);
      jest.spyOn(require("fs"), "realpathSync").mockReturnValue("");
      jest.spyOn(require("fs"), "writeFileSync").mockImplementation(() => {});
      jest.spyOn(require("../../src/utils/tts"), "synthesizeSpeechToFile").mockResolvedValue(undefined);
      jest.spyOn(require("fs"), "readFileSync").mockImplementation(() => { throw new Error("not found"); });
      await audioHandler(req as NextApiRequest, res as NextApiResponse);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "File not found after all regeneration attempts" });
    });

    it("should wait for file to appear after regen and succeed if file appears late", async () => {
      const { req, res } = createTestObjects();
      req.query = { file: "delayed.mp3" };
      // Simulate .txt file exists for getOriginalTextForAudio, then polling for .mp3
      const txtPath = require("path").resolve("/tmp", "delayed.txt");
      const mp3Path = require("path").resolve("/tmp", "delayed.mp3");
      let pollCount = 0;
      let mp3Exists = false;
      jest.spyOn(require("fs"), "existsSync").mockImplementation((...args) => {
        const filePath = args[0];
        if (filePath === txtPath) return true; // .txt exists
        if (filePath === mp3Path) {
          if (!mp3Exists && pollCount < 3) {
            pollCount++;
            return false;
          }
          mp3Exists = true;
          return true;
        }
        return false;
      });
      jest.spyOn(require("fs"), "realpathSync").mockImplementation((...args) => {
        const filePath = args[0];
        if (filePath === mp3Path && mp3Exists) {
          return mp3Path;
        } else if (filePath === txtPath) {
          return txtPath;
        } else {
          throw new Error("ENOENT");
        }
      });
      jest.spyOn(require("fs"), "readFileSync").mockImplementation((...args) => {
        const filePath = args[0];
        if (filePath === txtPath) return "Some Gandalf reply";
        if (filePath === mp3Path) return Buffer.from("audio content");
        throw new Error("ENOENT");
      });
      jest.spyOn(require("fs"), "writeFileSync").mockImplementation(() => {});
      jest.spyOn(require("../../src/utils/tts"), "synthesizeSpeechToFile").mockResolvedValue(undefined);
      await audioHandler(req as NextApiRequest, res as NextApiResponse);
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "audio/mpeg");
      expect(res.send).toHaveBeenCalledWith(Buffer.from("audio content"));
    }, 10000); // Increase timeout for this test
  });
});

afterAll(() => {
  jest.useRealTimers();
});

jest.mock("../../src/utils/tts", () => ({
  synthesizeSpeechToFile: jest.fn().mockResolvedValue(undefined),
}));

// Patch OpenAI to allow browser env for tests (global for all tests in this file)
(global as any).__OPENAI_MOCK__ = undefined;
jest.mock("openai", () => {
  return function (opts: any) {
    if (opts && typeof opts === "object") {
      opts.dangerouslyAllowBrowser = true;
    }
    // The actual mock implementation will be replaced in each test as needed
    return (global as any).__OPENAI_MOCK__ || {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({ choices: [{ message: { content: "Gandalf reply" } }] })
        }
      }
    };
  };
});

// Helper to set the OpenAI mock for a test
function setOpenAIMock(mockImpl: any) {
  (global as any).__OPENAI_MOCK__ = mockImpl;
}
