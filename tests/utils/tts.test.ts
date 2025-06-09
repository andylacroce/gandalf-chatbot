import fs from "fs";
import path from "path";
import { getGoogleAuthCredentials, getTTSClient, synthesizeSpeechToFile } from "../../src/utils/tts";

jest.mock("@google-cloud/text-to-speech", () => {
  const actual = jest.requireActual("@google-cloud/text-to-speech");
  return {
    ...actual,
    protos: actual.protos,
    TextToSpeechClient: jest.fn().mockImplementation(() => ({
      synthesizeSpeech: jest.fn().mockResolvedValue([{ audioContent: Buffer.from("fake audio") }]),
    })),
  };
});

describe("synthesizeSpeechToFile", () => {
  const tmpDir = path.resolve("/tmp/test-tts");
  const filePath = path.join(tmpDir, "test.mp3");

  beforeAll(() => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON.stringify({
      client_email: "test@test.com",
      private_key: "dummy",
      project_id: "dummy",
    });
    process.env.VERCEL_ENV = "1";
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  });
  afterAll(() => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir, { recursive: true });
  });

  it("writes synthesized audio to file", async () => {
    await synthesizeSpeechToFile({ text: "hello", filePath });
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath);
    expect(content.equals(Buffer.from("fake audio"))).toBe(true);
  });

  it("retries on failure and throws after 3 attempts", async () => {
    // Patch the synthesizeSpeech method on the TTS client instance
    const originalClient = getTTSClient();
    const origSynthesize = originalClient.synthesizeSpeech;
    originalClient.synthesizeSpeech = jest.fn().mockRejectedValue(new Error("fail"));
    await expect(synthesizeSpeechToFile({ text: "fail", filePath })).rejects.toThrow("fail");
    originalClient.synthesizeSpeech = origSynthesize;
  });

  it("cleans up old mp3 files except the new one", async () => {
    const oldFile = path.join(tmpDir, "old.mp3");
    fs.writeFileSync(oldFile, "old");
    await synthesizeSpeechToFile({ text: "cleanup", filePath });
    expect(fs.existsSync(oldFile)).toBe(false);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("handles missing GOOGLE_APPLICATION_CREDENTIALS_JSON", () => {
    const orig = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    expect(() => getGoogleAuthCredentials()).toThrow();
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = orig;
  });
});

describe("getGoogleAuthCredentials edge cases", () => {
  it("should read credentials from file if VERCEL_ENV is not set", () => {
    jest.resetModules();
    const fs = require("fs");
    const path = require("path");
    const creds = { client_email: "file@test.com", private_key: "dummy", project_id: "dummy" };
    const tmpPath = path.join(__dirname, "gcp-key.json");
    fs.writeFileSync(tmpPath, JSON.stringify(creds));
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = tmpPath;
    delete process.env.VERCEL_ENV;
    const { getGoogleAuthCredentials } = require("../../src/utils/tts");
    expect(getGoogleAuthCredentials()).toEqual(creds);
    fs.unlinkSync(tmpPath);
  });
  it("should throw if credentials file is invalid JSON", () => {
    jest.resetModules();
    const fs = require("fs");
    const path = require("path");
    const tmpPath = path.join(__dirname, "gcp-key-bad.json");
    fs.writeFileSync(tmpPath, "not-json");
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = tmpPath;
    delete process.env.VERCEL_ENV;
    const { getGoogleAuthCredentials } = require("../../src/utils/tts");
    expect(() => getGoogleAuthCredentials()).toThrow();
    fs.unlinkSync(tmpPath);
  });
});

describe("tts utility edge cases", () => {
  const fakeCreds = { client_email: "x", private_key: "x", project_id: "x" };

  function requireFreshTTSWithCredsMock() {
    jest.resetModules();
    const tts = require("../../src/utils/tts");
    tts.__resetSingletonsForTest(() => fakeCreds);
    return tts;
  }

  it("should handle file write errors gracefully", async () => {
    const tts = requireFreshTTSWithCredsMock();
    const fs = require("fs");
    const origWriteFileSync = fs.writeFileSync;
    fs.writeFileSync = jest.fn(() => { throw new Error("Disk full"); });
    await expect(tts.tts("hello", "en")).rejects.toThrow("Disk full");
    fs.writeFileSync = origWriteFileSync;
    tts.__resetSingletonsForTest(null);
  });

  it("should retry on temporary errors with correct timing", async () => {
    jest.useFakeTimers();
    const tts = requireFreshTTSWithCredsMock();
    const setTimeoutSpy = jest.spyOn(global, "setTimeout");
    const fetch = jest.fn()
      .mockRejectedValueOnce(new Error("Temporary error"))
      .mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    jest.doMock("node-fetch", () => fetch);
    const promise = tts.tts("retry", "en");
    await Promise.resolve();
    jest.advanceTimersByTime(500);
    await jest.runOnlyPendingTimersAsync();
    await promise;
    expect(setTimeoutSpy).toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
    jest.useRealTimers();
    tts.__resetSingletonsForTest(null);
  });

  it("should clean up multiple temp files", async () => {
    jest.resetModules();
    const fs = require("fs");
    const unlinkSync = jest.fn();
    fs.unlinkSync = unlinkSync;
    const { cleanupTempFiles } = require("../../src/utils/tts");
    cleanupTempFiles(["file1.mp3", "file2.mp3"]);
    expect(unlinkSync).toHaveBeenCalledWith("file1.mp3");
    expect(unlinkSync).toHaveBeenCalledWith("file2.mp3");
  });

  it("should skip non-mp3 files in cleanup", async () => {
    jest.resetModules();
    const fs = require("fs");
    const unlinkSync = jest.fn();
    fs.unlinkSync = unlinkSync;
    const { cleanupTempFiles } = require("../../src/utils/tts");
    cleanupTempFiles(["file1.txt", "file2.wav", "file3.mp3"]);
    expect(unlinkSync).toHaveBeenCalledWith("file3.mp3");
    expect(unlinkSync).not.toHaveBeenCalledWith("file1.txt");
    expect(unlinkSync).not.toHaveBeenCalledWith("file2.wav");
  });

  it("should throw on invalid or empty text input", async () => {
    jest.resetModules();
    const { tts } = require("../../src/utils/tts");
    await expect(tts("", "en")).rejects.toThrow();
    await expect(tts(null, "en")).rejects.toThrow();
    await expect(tts(undefined, "en")).rejects.toThrow();
  });

  it("should throw on invalid language code", async () => {
    jest.resetModules();
    const { tts } = require("../../src/utils/tts");
    await expect(tts("hello", "")).rejects.toThrow();
    await expect(tts("hello", null)).rejects.toThrow();
    await expect(tts("hello", undefined)).rejects.toThrow();
  });
  it("should throw if mkdirSync fails", async () => {
    const tts = requireFreshTTSWithCredsMock();
    const fs = require("fs");
    const path = require("path");
    const tmpDir = path.resolve(process.env.TTS_TMP_DIR || '/tmp/test-tts');
    if (fs.existsSync(tmpDir)) {
      fs.rmdirSync(tmpDir, { recursive: true });
    }
    const origMkdirSync = fs.mkdirSync;
    fs.mkdirSync = jest.fn(() => { throw new Error("mkdir fail"); });
    await expect(tts.tts("hello", "en")).rejects.toThrow("mkdir fail");
    fs.mkdirSync = origMkdirSync;
    tts.__resetSingletonsForTest(null);
  });
  it("should log a warning if cleanupTempFiles fails to delete", () => {
    jest.resetModules();
    const fs = require("fs");
    // Patch logger.warn to be a jest.fn()
    jest.doMock("../../src/utils/logger", () => ({
      __esModule: true,
      default: {
        info: jest.fn(),
        warn: jest.fn(),
      },
    }));
    const logger = require("../../src/utils/logger").default;
    const origUnlinkSync = fs.unlinkSync;
    const warnSpy = jest.spyOn(logger, "warn");
    fs.unlinkSync = jest.fn(() => {
      throw new Error("unlink fail");
    });
    const { cleanupTempFiles } = require("../../src/utils/tts");
    cleanupTempFiles(["fail.mp3"]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to delete file"), expect.any(Error));
    fs.unlinkSync = origUnlinkSync;
    warnSpy.mockRestore();
    jest.dontMock("../../src/utils/logger");
  });
});
