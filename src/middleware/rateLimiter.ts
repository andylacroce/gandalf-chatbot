import { NextApiRequest, NextApiResponse } from 'next';
import { LRUCache } from 'lru-cache';

const rateLimitOptions = {
  maxRequests: 100, // Limit each IP to 100 requests
  windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
};

// Define interface for rate limit data
interface RateLimitData {
  count: number;
  resetTime: number;
}

// Create cache without generic type parameters in the constructor
const rateLimiterCache = new LRUCache({
  max: 5000, // Maximum number of IPs to store in cache
  ttl: rateLimitOptions.windowMs, // Time-to-live for each entry
  allowStale: false, // Ensure stale items are not returned
});

const extractClientIp = (req: NextApiRequest): string | null => {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string') {
    return xForwardedFor.split(',')[0].trim(); // Extract the first IP
  }
  return req.socket?.remoteAddress || null;
};

const rateLimiter = async (
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) => {
  const ip = extractClientIp(req);

  if (!ip) {
    return res.status(400).json({ error: 'Unable to determine client IP address.' });
  }

  const currentTime = Date.now();
  let rateData = rateLimiterCache.get(ip);

  if (!rateData) {
    // Initialize rate data for new IP
    rateData = { count: 1, resetTime: currentTime + rateLimitOptions.windowMs };
    rateLimiterCache.set(ip, rateData);
    return next();
  }

  if (currentTime > rateData.resetTime) {
    // Reset count after the time window expires
    rateData.count = 1;
    rateData.resetTime = currentTime + rateLimitOptions.windowMs;
    rateLimiterCache.set(ip, rateData);
    return next();
  }

  if (rateData.count >= rateLimitOptions.maxRequests) {
    rateLimiterCache.set(ip, rateData); // Ensure the cache is updated before responding
    return res.status(429).json({
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil((rateData.resetTime - currentTime) / 1000), // Retry-After in seconds
    });
  }

  // Increment request count
  rateData.count += 1;
  rateLimiterCache.set(ip, rateData);
  next();
};

export default rateLimiter;
