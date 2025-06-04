import { NextApiRequest, NextApiResponse } from "next";
import audioHandler from "../../pages/api/audio";

describe("Audio API Handler - Error Handling", () => {
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

  it("should return 403 if the file path is not within /tmp or public", async () => {
    const { req, res } = createTestObjects();
    req.query = { file: "invalid.mp3" };
    jest.spyOn(require("fs"), "existsSync").mockReturnValue(true);
    jest.spyOn(require("fs"), "existsSync").mockImplementation((filePath) => {
      if (filePath && typeof filePath === "string" && filePath.endsWith("invalid.mp3")) return true;
      if (filePath && typeof filePath === "string" && filePath.endsWith("invalid.txt")) return false;
      return false;
    });
    jest.spyOn(require("fs"), "realpathSync").mockReturnValue("/invalid/path/invalid.mp3");
    jest.spyOn(require("fs"), "readFileSync").mockImplementation((filePath) => {
      if (filePath && typeof filePath === "string" && filePath.endsWith("invalid.mp3")) return Buffer.from("audio content");
      throw new Error("ENOENT");
    });
    await audioHandler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Access forbidden" });
  });

  it("should return 500 if there is an error reading the file", async () => {
    const { req, res } = createTestObjects();
    req.query = { file: "existing.mp3" };
    jest.spyOn(require("fs"), "existsSync").mockReturnValue(true);
    jest.spyOn(require("fs"), "existsSync").mockImplementation((filePath) => {
      if (filePath && typeof filePath === "string" && filePath.endsWith("existing.mp3")) return true;
      if (filePath && typeof filePath === "string" && filePath.endsWith("existing.txt")) return false;
      return false;
    });
    jest.spyOn(require("fs"), "realpathSync").mockReturnValue(require("path").resolve("/tmp", "existing.mp3"));
    jest.spyOn(require("fs"), "readFileSync").mockImplementation((filePath) => {
      if (filePath && typeof filePath === "string" && filePath.endsWith("existing.mp3")) throw new Error("Error reading file");
      throw new Error("ENOENT");
    });
    await audioHandler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error reading file" });
  });
});
