import { NextApiRequest, NextApiResponse } from "next";
import audioHandler from "../../pages/api/audio";

describe("Audio API Handler - OpenAI+TTS Regeneration", () => {
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

  let originalEnv: NodeJS.ProcessEnv;
  beforeEach(() => {
    jest.useRealTimers();
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
    let callCount = 0;
    jest.spyOn(require("fs"), "existsSync").mockImplementation(() => {
      callCount++;
      return callCount > 1;
    });
    jest.spyOn(require("fs"), "realpathSync").mockReturnValue(require("path").resolve("/tmp", "regen.mp3"));
    setOpenAIMock({
      chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: "Gandalf reply" } }] }) } }
    });
    jest.spyOn(require("fs"), "writeFileSync").mockImplementation(() => {});
    jest.spyOn(require("../../src/utils/tts"), "synthesizeSpeechToFile").mockResolvedValue(undefined);
    jest.spyOn(require("fs"), "readFileSync").mockReturnValue(Buffer.from("audio content"));
    await audioHandler(req as NextApiRequest, res as NextApiResponse);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "audio/mpeg");
    expect(res.send).toHaveBeenCalledWith(Buffer.from("audio content"));
  });

  it("should return 404 if OpenAI+TTS regen fails and file never appears", async () => {
    const { req, res } = createTestObjects();
    req.query = { file: "regenfail.mp3" };
    jest.spyOn(require("fs"), "existsSync").mockReturnValue(false);
    setOpenAIMock({
      chat: { completions: { create: jest.fn().mockRejectedValue(new Error("fail")) } }
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
    const txtPath = require("path").resolve("/tmp", "delayed.txt");
    const mp3Path = require("path").resolve("/tmp", "delayed.mp3");
    let pollCount = 0;
    let mp3Exists = false;
    jest.spyOn(require("fs"), "existsSync").mockImplementation((...args) => {
      const filePath = args[0];
      if (filePath === txtPath) return true;
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
  }, 10000);

  it("should regenerate audio if .txt file exists but does not match expected text", async () => {
    const { req, res } = createTestObjects();
    req.query = { file: "existing.mp3", text: "EXPECTED REPLY" };
    const audioContent = Buffer.from("audio content");
    const txtPath = require("path").resolve("/tmp", "existing.txt");
    const mp3Path = require("path").resolve("/tmp", "existing.mp3");
    jest.spyOn(require("fs"), "existsSync").mockImplementation((filePath) => {
      if (filePath === mp3Path) return true;
      if (filePath === txtPath) return true;
      return false;
    });
    jest.spyOn(require("fs"), "realpathSync").mockImplementation((filePath) => {
      if (filePath === mp3Path) return mp3Path;
      if (filePath === txtPath) return txtPath;
      throw new Error("ENOENT");
    });
    jest.spyOn(require("fs"), "readFileSync").mockImplementation((filePath, encoding) => {
      if (filePath === txtPath) return "OLD REPLY";
      if (filePath === mp3Path) return audioContent;
      throw new Error("ENOENT");
    });
    const synthesizeSpy = jest.spyOn(require("../../src/utils/tts"), "synthesizeSpeechToFile").mockResolvedValue(undefined);
    const writeFileSyncSpy = jest.spyOn(require("fs"), "writeFileSync").mockImplementation(() => {});
    await audioHandler(req as NextApiRequest, res as NextApiResponse);
    expect(synthesizeSpy).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining("EXPECTED REPLY") }));
    expect(writeFileSyncSpy).toHaveBeenCalledWith(txtPath, "EXPECTED REPLY", "utf8");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "audio/mpeg");
    expect(res.send).toHaveBeenCalledWith(audioContent);
  });

  it("should not regenerate audio if .txt file matches expected text", async () => {
    const { req, res } = createTestObjects();
    req.query = { file: "existing.mp3", text: "MATCHING REPLY" };
    const audioContent = Buffer.from("audio content");
    const txtPath = require("path").resolve("/tmp", "existing.txt");
    const mp3Path = require("path").resolve("/tmp", "existing.mp3");
    jest.spyOn(require("fs"), "existsSync").mockImplementation((filePath) => {
      if (filePath === mp3Path) return true;
      if (filePath === txtPath) return true;
      return false;
    });
    jest.spyOn(require("fs"), "realpathSync").mockImplementation((filePath) => {
      if (filePath === mp3Path) return mp3Path;
      if (filePath === txtPath) return txtPath;
      throw new Error("ENOENT");
    });
    jest.spyOn(require("fs"), "readFileSync").mockImplementation((filePath, encoding) => {
      if (filePath === txtPath) return "MATCHING REPLY";
      if (filePath === mp3Path) return audioContent;
      throw new Error("ENOENT");
    });
    const synthesizeSpy = jest.spyOn(require("../../src/utils/tts"), "synthesizeSpeechToFile").mockResolvedValue(undefined);
    await audioHandler(req as NextApiRequest, res as NextApiResponse);
    const calls = synthesizeSpy.mock.calls.filter(call => {
      const arg = call[0] as any;
      return arg && typeof arg.filePath === "string" && arg.filePath.endsWith("existing.mp3") && arg.text && arg.text.includes("MATCHING REPLY");
    });
    expect(calls.length).toBe(0);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "audio/mpeg");
    expect(res.send).toHaveBeenCalledWith(audioContent);
  });

  it("should return 400 if file param is missing", async () => {
    const { req, res } = createTestObjects();
    req.query = {};
    await audioHandler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "File parameter is required" });
  });

  it("should return 403 if file path is outside allowed dirs", async () => {
    const { req, res } = createTestObjects();
    req.query = { file: "../hack.mp3" };
    jest.spyOn(require("fs"), "existsSync").mockReturnValue(true);
    jest.spyOn(require("fs"), "realpathSync").mockReturnValue("/etc/passwd");
    jest.spyOn(require("fs"), "readFileSync").mockImplementation((filePath) => {
      if (typeof filePath === "string" && filePath.endsWith("hack.mp3")) throw new Error("ENOENT");
      return "dummy";
    });
    await audioHandler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Access forbidden" });
  });

  it("should return 500 if reading the file throws", async () => {
    const { req, res } = createTestObjects();
    req.query = { file: "failread.mp3" };
    jest.spyOn(require("fs"), "existsSync").mockReturnValue(true);
    jest.spyOn(require("fs"), "realpathSync").mockReturnValue(require("path").resolve("/tmp", "failread.mp3"));
    jest.spyOn(require("fs"), "readFileSync").mockImplementation((filePath) => {
      if (typeof filePath === "string" && filePath.endsWith("failread.mp3")) throw new Error("fail");
      return "";
    });
    await audioHandler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error reading file" });
  });

  it("should return 404 if file not found after all regen attempts and forbidden path", async () => {
    const { req, res } = createTestObjects();
    req.query = { file: "notfound.mp3" };
    jest.spyOn(require("fs"), "existsSync").mockReturnValue(false);
    jest.spyOn(require("fs"), "realpathSync").mockReturnValue("/etc/passwd");
    await audioHandler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "File not found after all regeneration attempts" });
  });

  it("should handle OpenAI returning empty message", async () => {
    const { req, res } = createTestObjects();
    req.query = { file: "regen.mp3" };
    jest.spyOn(require("fs"), "existsSync").mockReturnValue(false);
    jest.spyOn(require("fs"), "realpathSync").mockReturnValue("");
    setOpenAIMock({
      chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: "" } }] }) } }
    });
    jest.spyOn(require("fs"), "writeFileSync").mockImplementation(() => {});
    jest.spyOn(require("../../src/utils/tts"), "synthesizeSpeechToFile").mockResolvedValue(undefined);
    jest.spyOn(require("fs"), "readFileSync").mockImplementation(() => { throw new Error("not found"); });
    await audioHandler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "File not found after all regeneration attempts" });
  });
});

afterAll(() => {
  jest.useRealTimers();
});

jest.mock("../../src/utils/tts", () => ({
  synthesizeSpeechToFile: jest.fn().mockResolvedValue(undefined),
}));

(global as any).__OPENAI_MOCK__ = undefined;
jest.mock("openai", () => {
  return function (opts: any) {
    if (opts && typeof opts === "object") {
      opts.dangerouslyAllowBrowser = true;
    }
    return (global as any).__OPENAI_MOCK__ || {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({ choices: [{ message: { content: "Gandalf reply" } }] })
        }
      }
    };
  };
});

function setOpenAIMock(mockImpl: any) {
  (global as any).__OPENAI_MOCK__ = mockImpl;
}
