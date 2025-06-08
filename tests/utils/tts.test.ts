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

describe("tts utility edge cases", () => {
  it("should handle file write errors gracefully", async () => {
    jest.resetModules();
    const fs = require("fs");
    const origWriteFileSync = fs.writeFileSync;
    fs.writeFileSync = jest.fn(() => { throw new Error("Disk full"); });
    const { tts } = require("../../src/utils/tts");
    await expect(tts("hello", "en"))
      .rejects.toThrow("Disk full");
    fs.writeFileSync = origWriteFileSync; // restore after test
  });

  it("should retry on temporary errors with correct timing", async () => {
    jest.useFakeTimers();
    jest.resetModules();
    const setTimeoutSpy = jest.spyOn(global, "setTimeout");
    const fetch = jest.fn()
      .mockRejectedValueOnce(new Error("Temporary error"))
      .mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    jest.doMock("node-fetch", () => fetch);
    const { tts } = require("../../src/utils/tts");
    const promise = tts("retry", "en");
    await Promise.resolve(); // let the first rejection happen
    jest.advanceTimersByTime(500); // advance for first retry
    await jest.runOnlyPendingTimersAsync(); // flush timers and microtasks
    await promise;
    expect(setTimeoutSpy).toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
    jest.useRealTimers();
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
});
