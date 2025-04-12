/**
 * @fileoverview Test suite for the rate limiter middleware.
 * Tests request limiting functionality, IP address detection, and time-based reset.
 * @module tests/rateLimiter
 */

import rateLimiter from '../src/middleware/rateLimiter';
import { NextApiRequest, NextApiResponse } from 'next';
import { Socket } from 'net';

// Import Jest's mock types
import { Mock } from 'jest-mock';

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
    /**
     * Helper function to create test objects
     * Returns isolated request, response, and next function for each test
     */
    const createTestObjects = () => {
        const req: Partial<NextApiRequest> = {
            headers: {}, // Ensure headers is always initialized
            socket: { remoteAddress: '127.0.0.1' } as Socket, // Cast to Socket type
        };
        const res: Partial<NextApiResponse> = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
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
        headers: { 'x-forwarded-for': ip },
        socket: { remoteAddress: ip } as Socket,
    });

    /**
     * Test normal request flow
     * Should allow requests when the rate limit is not exceeded
     */
    it('should allow the request if rate limit is not exceeded', async () => {
        const { res, next } = createTestObjects();
        const testIp = '192.168.1.1';
        const req = createRequestWithIp(testIp);

        await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    /**
     * Test rate limit enforcement
     * Should block requests when the rate limit is exceeded
     */
    it('should block the request if rate limit is exceeded', async () => {
        jest.useFakeTimers();
        const { res, next } = createTestObjects();
        const testIp = '192.168.1.2';
        const req = createRequestWithIp(testIp);

        // Make exactly the maximum number of requests (100)
        for (let i = 0; i < 100; i++) {
            await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);
        }

        next.mockClear();
        jest.mocked(res.status).mockClear();
        jest.mocked(res.json).mockClear();

        // The 101st request should be blocked
        await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);

        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: 'Too many requests, please try again later.',
        }));
        expect(next).not.toHaveBeenCalled();
        
        jest.useRealTimers();
    });

    /**
     * Test IP address validation
     * Should handle missing IP addresses gracefully with appropriate error
     */
    it('should handle missing IP address gracefully', async () => {
        const { req, res, next } = createTestObjects();
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
        // Reset the module state to clear any previous rate limit data
        jest.resetModules();
        const resetRateLimiter = require('../src/middleware/rateLimiter').default;
        
        jest.useFakeTimers();
        const { res, next } = createTestObjects();
        const testIp = '192.168.1.3';
        const req = createRequestWithIp(testIp);

        // Make 100 requests (reaching the limit)
        for (let i = 0; i < 100; i++) {
            await resetRateLimiter(req as NextApiRequest, res as NextApiResponse, next);
        }

        // Clear mocks to test the next request
        next.mockClear();
        if (res.status) {
            jest.mocked(res.status).mockClear();
        }
        if (res.json) {
            jest.mocked(res.json).mockClear();
        }
        
        // Simulate TTL expiration (15 minutes and 1 second to be safe)
        jest.advanceTimersByTime(15 * 60 * 1000 + 1000); 

        // This should work as the counter should be reset
        await resetRateLimiter(req as NextApiRequest, res as NextApiResponse, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        
        jest.useRealTimers();
    });

    /**
     * Tests multiple scenarios with different IPs in parallel
     */
    describe('concurrent IP tests', () => {
        it.each([
            ['10.0.0.1', 5],
            ['10.0.0.2', 10],
            ['10.0.0.3', 15],
            ['10.0.0.4', 20],
        ])('should handle multiple requests from IP %s', async (ipAddress, requestCount) => {
            const testReq = createRequestWithIp(ipAddress);
            const testRes: Partial<NextApiResponse> = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            const testNext = jest.fn();

            // Make multiple requests (less than limit)
            for (let i = 0; i < requestCount; i++) {
                await rateLimiter(testReq as NextApiRequest, testRes as NextApiResponse, testNext);
            }

            expect(testNext).toHaveBeenCalledTimes(requestCount);
            expect(testRes.status).not.toHaveBeenCalled();
        });
    });
});