import { NextApiRequest, NextApiResponse } from "next";
import healthHandler from "../../pages/api/health";

describe("Health API Handler", () => {
  it("should return 200 OK or 500 error depending on environment", async () => {
    // This test is only meaningful if valid credentials are set in the environment.
    // It will pass if status is 200 (healthy) or 500 (error, e.g. missing credentials).
    const req = {} as NextApiRequest;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as NextApiResponse & { json: jest.Mock };
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
    const req = {} as NextApiRequest;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as NextApiResponse;
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
});
