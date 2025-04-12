/**
 * @fileoverview Test suite for the rate limiter middleware.
 * Tests request limiting functionality, IP address detection, and time-based reset.
 * @module tests/rateLimiter
 */

import rateLimiter from '../src/middleware/rateLimiter';
import { NextApiRequest, NextApiResponse } from 'next';
import { Socket } from 'net';

// Mock logger to avoid actual logging during tests
jest.mock('../src/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
}));

/**
 * Test suite for the rate limiter middleware
 * Tests the request limiting functionality in various scenarios
 */
describe('rateLimiter middleware', () => {
    // Test objects
    let req: Partial<NextApiRequest>;
    let res: Partial<NextApiResponse>;
    let next: jest.Mock;

    /**
     * Setup before each test
     * Initializes fake timers and mock request/response objects
     */
    beforeEach(() => {
        jest.useFakeTimers();
        req = {
            headers: {}, // Ensure headers is always initialized
            socket: { remoteAddress: '127.0.0.1' } as Socket, // Cast to Socket type
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
    });

    /**
     * Cleanup after each test
     * Resets mocks and restores real timers
     */
    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    /**
     * Test normal request flow
     * Should allow requests when the rate limit is not exceeded
     */
    it('should allow the request if rate limit is not exceeded', async () => {
        req.headers = { 'x-forwarded-for': '127.0.0.1' }; // Explicitly define headers in each test case

        await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    /**
     * Test rate limit enforcement
     * Should block requests when the rate limit is exceeded
     */
    it('should block the request if rate limit is exceeded', async () => {
        req.headers = { 'x-forwarded-for': '127.0.0.1' };

        // Generate enough requests to exceed the limit
        for (let i = 0; i < 100; i++) {
            await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);
        }

        // Clear mocks to test the next request clearly
        next.mockClear();
        (res.status as jest.Mock).mockClear();
        (res.json as jest.Mock).mockClear();

        // The 101st request should be blocked
        await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);

        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: 'Too many requests, please try again later.',
        }));
        expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test IP address validation
     * Should handle missing IP addresses gracefully with appropriate error
     */
    it('should handle missing IP address gracefully', async () => {
        req.headers = {}; // No IP address provided
        req.socket = { remoteAddress: undefined } as Socket; // Ensure socket address is also missing

        await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Unable to determine client IP address.' });
        expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test time-based rate limit reset
     * Should reset the rate limit after the time window expires
     */
    it('should reset rate limit after TTL expires', async () => {
        req.headers = { 'x-forwarded-for': '127.0.0.1' }; // Explicitly define headers in each test case

        // Make 100 requests (reaching the limit)
        for (let i = 0; i < 100; i++) {
            await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);
        }

        // Clear mocks to test the next request
        next.mockClear();
        (res.status as jest.Mock)?.mockClear();
        if (res.json) {
            (res.json as jest.Mock).mockClear();
        }
        
        // Simulate TTL expiration (15 minutes)
        jest.advanceTimersByTime(15 * 60 * 1000); 

        // This should work as the counter should be reset
        await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});