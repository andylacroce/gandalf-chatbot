/**
 * @fileoverview Test suite for the rate limiter middleware.
 * Tests request limiting functionality, IP address detection, time-based reset, and response headers.
 *
 * The rate limiter middleware now sets the following headers on all responses:
 *   - X-RateLimit-Limit: Maximum requests allowed per window
 *   - X-RateLimit-Remaining: Requests remaining in the current window
 *   - X-RateLimit-Reset: Unix timestamp (seconds) when the window resets
 *   - Retry-After: (on 429) Seconds until the next allowed request
 *
 * 429 responses are logged for monitoring/abuse detection.
 *
 * @module tests/rateLimiter
 */

import rateLimiter from "../../src/middleware/rateLimiter";
import { NextApiRequest, NextApiResponse } from "next";
import { Socket } from "net";

// Import Jest's mock types
import { Mock } from "jest-mock";

// Mock logger to avoid actual logging during tests
jest.mock("../../src/utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

/**
 * Test suite for the rate limiter middleware
 * Tests the request limiting functionality in various scenarios
 */
describe("rateLimiter middleware", () => {
  /**
   * Helper function to create test objects
   * Returns isolated request, response, and next function for each test
   */
  const createTestObjects = () => {
    const req: Partial<NextApiRequest> = {
      headers: {}, // Ensure headers is always initialized
      socket: { remoteAddress: "127.0.0.1" } as Socket, // Cast to Socket type
    };
    const res: Partial<NextApiResponse> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(), // Mock setHeader for rate limit headers
    };
    const next = jest.fn();
    return { req, res, next };
  };

  /**
   * Cleanup after all tests
   */
  afterAll(() => {
    jest.restoreAllMocks();
  });

  /**
   * Helper function to create distinct request objects with different IPs
   * This helps in running tests independently in parallel
   */
  const createRequestWithIp = (ip: string): Partial<NextApiRequest> => ({
    headers: { "x-forwarded-for": ip },
    socket: { remoteAddress: ip } as Socket,
  });

  /**
   * Test normal request flow
   * Should allow requests when the rate limit is not exceeded
   */
  it("should allow the request if rate limit is not exceeded", async () => {
    const { res, next } = createTestObjects();
    const testIp = "192.168.1.1";
    const req = createRequestWithIp(testIp);

    await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  /**
   * Test rate limit enforcement
   * Should block requests when the rate limit is exceeded
   */
  it("should block the request if rate limit is exceeded", async () => {
    jest.useFakeTimers();
    const { res, next } = createTestObjects();
    const testIp = "192.168.1.2";
    const req = createRequestWithIp(testIp);

    // Make exactly the maximum number of requests (100)
    for (let i = 0; i < 100; i++) {
      await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);
    }

    next.mockClear();
    if (res.status) {
      jest.mocked(res.status).mockClear();
    }
    if (res.json) {
      jest.mocked(res.json).mockClear();
    }

    // The 101st request should be blocked
    await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Too many requests, please try again later.",
      }),
    );
    expect(next).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  /**
   * Test IP address validation
   * Should handle missing IP addresses gracefully with appropriate error
   */
  it("should handle missing IP address gracefully", async () => {
    const { res, next } = createTestObjects();
    const req: any = { headers: {}, socket: {} };
    await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should handle malformed x-forwarded-for header", async () => {
    const { res, next } = createTestObjects();
    const req: any = {
      headers: { "x-forwarded-for": "" },
      socket: { remoteAddress: undefined },
    };
    await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  /**
   * Test response headers
   * Should set rate limit headers on all responses
   */
  it("should set rate limit headers on all responses", async () => {
    const { res, next } = createTestObjects();
    const testIp = "10.0.0.1";
    const req = createRequestWithIp(testIp);

    await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      "X-RateLimit-Limit",
      expect.any(Number),
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "X-RateLimit-Remaining",
      expect.any(Number),
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "X-RateLimit-Reset",
      expect.any(Number),
    );
  });

  /**
   * Test time-based rate limit reset
   * Should reset the rate limit after the time window expires
   */
  it("should reset window after time passes", async () => {
    jest.useFakeTimers();
    const { res, next } = createTestObjects();
    const testIp = "10.0.0.2";
    const req = createRequestWithIp(testIp);

    // Hit the limit
    for (let i = 0; i < 100; i++) {
      await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);
    }

    // Blocked
    await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);
    expect(res.status).toHaveBeenCalledWith(429);

    // Advance time by 16 minutes (window is 15 min)
    jest.advanceTimersByTime(16 * 60 * 1000);

    // Should allow again
    next.mockClear();
    if (res.status) jest.mocked(res.status).mockClear();
    if (res.json) jest.mocked(res.json).mockClear();
    await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);
    expect(next).toHaveBeenCalled();

    jest.useRealTimers();
  });

  /**
   * Test independent tracking of separate IPs
   * Should not interfere with each other's rate limits
   */
  it("should track separate IPs independently", async () => {
    const { res: res1, next: next1 } = createTestObjects();
    const { res: res2, next: next2 } = createTestObjects();
    const req1 = createRequestWithIp("1.1.1.1");
    const req2 = createRequestWithIp("2.2.2.2");

    await rateLimiter(req1 as NextApiRequest, res1 as NextApiResponse, next1);
    await rateLimiter(req2 as NextApiRequest, res2 as NextApiResponse, next2);

    expect(next1).toHaveBeenCalled();
    expect(next2).toHaveBeenCalled();
  });

  /**
   * Test logging of 429 responses
   * Should log details for monitoring and abuse detection
   */
  it("logs 429 responses for monitoring/abuse detection", async () => {
    const logger = require("../../src/utils/logger");
    const { res, next } = createTestObjects();
    const testIp = "3.3.3.3";
    const req = createRequestWithIp(testIp);

    // Hit the limit
    for (let i = 0; i < 100; i++) {
      await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);
    }

    next.mockClear();
    await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("429"),
      expect.objectContaining({ ip: testIp }),
    );
  });

  /**
   * Tests multiple scenarios with different IPs in parallel
   */
  describe("concurrent IP tests", () => {
    it.each([
      ["10.0.0.1", 5],
      ["10.0.0.2", 10],
      ["10.0.0.3", 15],
      ["10.0.0.4", 20],
    ])(
      "should handle multiple requests from IP %s",
      async (ipAddress, requestCount) => {
        const testReq = createRequestWithIp(ipAddress);
        const testRes: Partial<NextApiResponse> = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
          setHeader: jest.fn(), // Mock setHeader for rate limit headers
        };
        const testNext = jest.fn();

        // Make multiple requests (less than limit)
        for (let i = 0; i < requestCount; i++) {
          await rateLimiter(
            testReq as NextApiRequest,
            testRes as NextApiResponse,
            testNext,
          );
        }

        expect(testNext).toHaveBeenCalledTimes(requestCount);
        expect(testRes.status).not.toHaveBeenCalled();
      },
    );
  });
});
