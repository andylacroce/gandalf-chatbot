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
    } as Partial<NextApiRequest>;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as NextApiResponse;

    return { req, res };
  };

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
    const handlerPromise = audioHandler(req as NextApiRequest, res as NextApiResponse);
    await jest.runAllTimersAsync();
    await handlerPromise;
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "File not found" });
  });

  describe("file retrieval tests", () => {
    it("should return the audio file if it exists in /tmp", async () => {
      const { req, res } = createTestObjects();
      req.query = { file: "existing.mp3" };
      const audioContent = Buffer.from("audio content");
      jest.spyOn(require("fs"), "existsSync").mockImplementation((filePath) => filePath === require("path").resolve("/tmp", "existing.mp3"));
      jest.spyOn(require("fs"), "realpathSync").mockReturnValue(require("path").resolve("/tmp", "existing.mp3"));
      jest.spyOn(require("fs"), "readFileSync").mockReturnValue(audioContent);
      await audioHandler(req as NextApiRequest, res as NextApiResponse);
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "audio/mpeg");
      expect(res.send).toHaveBeenCalledWith(audioContent);
    });

    it("should return the audio file if it exists in public", async () => {
      const { req, res } = createTestObjects();
      req.query = { file: "existing.mp3" };
      const audioContent = Buffer.from("audio content");
      jest.spyOn(require("fs"), "existsSync").mockImplementation((filePath) => filePath === require("path").resolve("public", "existing.mp3"));
      jest.spyOn(require("fs"), "realpathSync").mockReturnValue(require("path").resolve("public", "existing.mp3"));
      jest.spyOn(require("fs"), "readFileSync").mockReturnValue(audioContent);
      // Simulate /tmp not existing
      jest.spyOn(require("fs"), "existsSync").mockImplementation((filePath) => filePath === require("path").resolve("public", "existing.mp3"));
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
      jest.spyOn(require("fs"), "realpathSync").mockReturnValue("/invalid/path/invalid.mp3");
      await audioHandler(req as NextApiRequest, res as NextApiResponse);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "Access forbidden" });
    });

    it("should return 500 if there is an error reading the file", async () => {
      const { req, res } = createTestObjects();
      req.query = { file: "existing.mp3" };
      jest.spyOn(require("fs"), "existsSync").mockReturnValue(true);
      jest.spyOn(require("fs"), "realpathSync").mockReturnValue(require("path").resolve("/tmp", "existing.mp3"));
      jest.spyOn(require("fs"), "readFileSync").mockImplementation(() => { throw new Error("Error reading file"); });
      await audioHandler(req as NextApiRequest, res as NextApiResponse);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Error reading file" });
    });
  });
});

afterAll(() => {
  jest.useRealTimers();
});

jest.mock("../../src/utils/tts", () => ({
  synthesizeSpeechToFile: jest.fn().mockResolvedValue(undefined),
}));
