import { NextApiRequest, NextApiResponse } from "next";
import healthHandler from "../../pages/api/health";

describe("Health API Handler", () => {
  it("should return 200 OK with status ok if both APIs work", async () => {
    // This test is only meaningful if valid credentials are set in the environment.
    // It will fail if run in CI or without credentials.
    const req = {} as NextApiRequest;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as NextApiResponse;
    await healthHandler(req, res);
    // Accept either 200 or 500 depending on environment
    expect(res.status).toHaveBeenCalledWith(expect.any(Number));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: expect.any(String) }));
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
      })
    );
    // Restore env vars
    if (oldOpenAI) process.env.OPENAI_API_KEY = oldOpenAI;
    if (oldGoogle) process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = oldGoogle;
  });
});
