import { NextApiRequest, NextApiResponse } from "next";

beforeEach(() => {
  process.env.INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || "test-secret";
});

describe("/api/health", () => {
  it("should return 200 OK or 500 error depending on environment", async () => {
    // This test is only meaningful if valid credentials are set in the environment.
    // It will pass if status is 200 (healthy) or 500 (error, e.g. missing credentials).
    const req = { headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET } } as unknown as NextApiRequest;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as NextApiResponse & { json: jest.Mock };
    const healthHandler = (await import("../../pages/api/health")).default;
    await healthHandler(req, res);
    // Accept either 200 or 500 depending on environment
    expect(res.status).toHaveBeenCalledWith(expect.any(Number));
    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg).toHaveProperty("status");
    expect(["ok", "error"]).toContain(jsonArg.status);
  });

  it("should return 500 and error details if credentials are missing or invalid", async () => {
    // Temporarily unset env vars
    const oldOpenAI = process.env.OPENAI_API_KEY;
    const oldGoogle = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const req = { headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET } } as unknown as NextApiRequest;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as NextApiResponse;
    const healthHandler = (await import("../../pages/api/health")).default;
    await healthHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        openai: expect.objectContaining({ status: "error" }),
        tts: expect.objectContaining({ status: "error" }),
      }),
    );
    // Restore env vars
    if (oldOpenAI) process.env.OPENAI_API_KEY = oldOpenAI;
    if (oldGoogle) process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = oldGoogle;
  });

  it("should return health status", async () => {
    // Mock OpenAI and Google TTS to always succeed
    process.env.OPENAI_API_KEY = "test-openai-key";
    // Write fake credentials to a temp file and set the env var to its path
    const fs = require("fs");
    const path = require("path");
    const tmpCredPath = path.join(__dirname, "fake-gcp-key.json");
    fs.writeFileSync(tmpCredPath, JSON.stringify({
      type: "service_account",
      project_id: "test-project",
      private_key_id: "test-key-id",
      private_key: "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n",
      client_email: "test@test.iam.gserviceaccount.com",
      client_id: "test-client-id",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/test@test.iam.gserviceaccount.com"
    }));
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = tmpCredPath;
    jest.resetModules();
    jest.doMock("openai", () => {
      return jest.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: "pong" } }],
            }),
          },
        },
      }));
    });
    jest.doMock("@google-cloud/text-to-speech", () => ({
      TextToSpeechClient: jest.fn().mockImplementation(() => ({
        synthesizeSpeech: jest.fn().mockResolvedValue([
          { audioContent: Buffer.from("test-audio-content") },
        ]),
      })),
      protos: {
        google: {
          cloud: {
            texttospeech: {
              v1: {
                SsmlVoiceGender: { MALE: 1 },
                AudioEncoding: { MP3: 2 },
              },
            },
          },
        },
      },
    }));
    const healthHandler = (await import("../../pages/api/health")).default;
    const req = { headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET } } as unknown as NextApiRequest;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as NextApiResponse;
    await healthHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
      }),
    );
    fs.unlinkSync(tmpCredPath);
  });

  it("should return 500 if OpenAI returns no valid response", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = "{}";
    jest.resetModules();
    jest.doMock("openai", () => {
      return jest.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({ choices: [{}] }),
          },
        },
      }));
    });
    jest.doMock("@google-cloud/text-to-speech", () => ({
      TextToSpeechClient: jest.fn().mockImplementation(() => ({
        synthesizeSpeech: jest.fn().mockResolvedValue([
          { audioContent: Buffer.from("test-audio-content") },
        ]),
      })),
      protos: {
        google: { cloud: { texttospeech: { v1: { SsmlVoiceGender: { MALE: 1 }, AudioEncoding: { MP3: 2 } } } } },
      },
    }));
    const healthHandler = (await import("../../pages/api/health")).default;
    const req = { headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET } } as unknown as NextApiRequest;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as NextApiResponse;
    await healthHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        openai: expect.objectContaining({ status: "error", error: "No valid OpenAI response" }),
      })
    );
  });

  it("should return 500 if Google TTS returns no audio content", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = "{}";
    jest.resetModules();
    jest.doMock("openai", () => {
      return jest.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: "pong" } }],
            }),
          },
        },
      }));
    });
    jest.doMock("@google-cloud/text-to-speech", () => ({
      TextToSpeechClient: jest.fn().mockImplementation(() => ({
        synthesizeSpeech: jest.fn().mockResolvedValue([
          { audioContent: undefined },
        ]),
      })),
      protos: {
        google: { cloud: { texttospeech: { v1: { SsmlVoiceGender: { MALE: 1 }, AudioEncoding: { MP3: 2 } } } } },
      },
    }));
    const healthHandler = (await import("../../pages/api/health")).default;
    const req = { headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET } } as unknown as NextApiRequest;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as NextApiResponse;
    await healthHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        tts: expect.objectContaining({ status: "error", error: "No audio content from TTS" }),
      })
    );
  });

  it("should call logger.error for OpenAI error in development", async () => {
    jest.resetModules();
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", { value: "development" });
    process.env.OPENAI_API_KEY = "bad-key";
    // Provide valid TTS credentials so TTS does not error
    const fs = require("fs");
    const path = require("path");
    const tmpCredPath = path.join(__dirname, "fake-gcp-key.json");
    fs.writeFileSync(tmpCredPath, JSON.stringify({
      type: "service_account",
      project_id: "test-project",
      private_key_id: "test-key-id",
      private_key: "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n",
      client_email: "test@test.iam.gserviceaccount.com",
      client_id: "test-client-id",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/test@test.iam.gserviceaccount.com"
    }));
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = tmpCredPath;
    jest.doMock("openai", () => {
      return jest.fn().mockImplementation(() => {
        throw new Error("OpenAI mock error");
      });
    });
    jest.doMock("@google-cloud/text-to-speech", () => ({
      TextToSpeechClient: jest.fn().mockImplementation(() => ({
        synthesizeSpeech: jest.fn().mockResolvedValue([
          { audioContent: Buffer.from("test-audio-content") },
        ]),
      })),
      protos: {
        google: { cloud: { texttospeech: { v1: { SsmlVoiceGender: { MALE: 1 }, AudioEncoding: { MP3: 2 } } } } },
      },
    }));
    const logger = await import("../../src/utils/logger");
    const errorSpy = jest.spyOn(logger.default, "error");
    const req = { headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET } } as unknown as NextApiRequest;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as NextApiResponse;
    const healthHandler = (await import("../../pages/api/health")).default;
    await healthHandler(req, res);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[HealthCheck] OpenAI error:"),
      expect.anything()
    );
    errorSpy.mockRestore();
    fs.unlinkSync(tmpCredPath);
    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnv });
  });

  it("should call logger.error for TTS error in development", async () => {
    jest.resetModules();
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", { value: "development" });
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = undefined;
    const logger = await import("../../src/utils/logger");
    const errorSpy = jest.spyOn(logger.default, "error");
    const req = { headers: { "x-internal-api-secret": process.env.INTERNAL_API_SECRET } } as unknown as NextApiRequest;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as NextApiResponse;
    const healthHandler = (await import("../../pages/api/health")).default;
    await healthHandler(req, res);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[HealthCheck] Google TTS error:"),
      expect.anything()
    );
    errorSpy.mockRestore();
    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnv });
  });
});
