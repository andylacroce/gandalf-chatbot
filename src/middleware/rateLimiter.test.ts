import rateLimiter from './rateLimiter';
import { NextApiRequest, NextApiResponse } from 'next';
import { Socket } from 'net';

// Mock logger to avoid actual logging during tests
jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
}));

describe('rateLimiter middleware', () => {
    let req: Partial<NextApiRequest>;
    let res: Partial<NextApiResponse>;
    let next: jest.Mock;

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

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    it('should allow the request if rate limit is not exceeded', async () => {
        req.headers = { 'x-forwarded-for': '127.0.0.1' }; // Explicitly define headers in each test case

        await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('should block the request if rate limit is exceeded', async () => {
        req.headers = { 'x-forwarded-for': '127.0.0.1' };

        for (let i = 0; i < 100; i++) {
            await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);
        }

        next.mockClear();
        (res.status as jest.Mock).mockClear();
        (res.json as jest.Mock).mockClear();

        await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);

        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: 'Too many requests, please try again later.',
        }));
        expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing IP address gracefully', async () => {
        req.headers = {}; // No IP address provided
        req.socket = { remoteAddress: undefined } as Socket; // Ensure socket address is also missing

        await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Unable to determine client IP address.' });
        expect(next).not.toHaveBeenCalled();
    });

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
        
        // Simulate TTL expiration
        jest.advanceTimersByTime(15 * 60 * 1000); 

        // This should work as the counter should be reset
        await rateLimiter(req as NextApiRequest, res as NextApiResponse, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});