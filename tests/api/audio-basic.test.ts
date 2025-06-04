import { NextApiRequest, NextApiResponse } from "next";
import audioHandler from "../../pages/api/audio";

describe("Audio API Handler - Basic", () => {
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
    expect(res.json).toHaveBeenCalledWith({ error: "File parameter is required" });
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
    expect(res.json).toHaveBeenCalledWith({ error: "File not found after all regeneration attempts" });
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
      await audioHandler(req as NextApiRequest, res as NextApiResponse);
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "audio/mpeg");
      expect(res.send).toHaveBeenCalledWith(audioContent);
    });
  });
});
