// Hybrid cache for Gandalf replies: works on Vercel (in-memory) and locally (file-based)
import fs from "fs";
import path from "path";

const isVercel = !!process.env.VERCEL_ENV;
const CACHE_FILE = "/tmp/gandalf-reply-cache.json";

// In-memory cache for Vercel
const memoryCache: Record<string, string> = {};

/**
 * Loads the reply cache from a file on disk.
 * Used in local development mode (not on Vercel).
 * @returns {Record<string, string>} The cache object loaded from file, or empty object on error.
 * @internal
 */
function loadCacheFromFile(): Record<string, string> {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const data = fs.readFileSync(CACHE_FILE, "utf8");
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Saves the reply cache to a file on disk.
 * Used in local development mode (not on Vercel).
 * @param {Record<string, string>} cache - The cache object to save.
 * @internal
 */
function saveCacheToFile(cache: Record<string, string>) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), "utf8");
  } catch {}
}

/**
 * Set a Gandalf reply in the cache.
 * Uses in-memory cache on Vercel, file-based cache locally.
 * @param {string} key - The cache key (usually audio file name).
 * @param {string} value - The Gandalf reply text.
 * @example
 * setReplyCache('abc123.mp3', 'You shall not pass!');
 */
export function setReplyCache(key: string, value: string) {
  if (isVercel) {
    memoryCache[key] = value;
  } else {
    const cache = loadCacheFromFile();
    cache[key] = value;
    saveCacheToFile(cache);
  }
}

/**
 * Get a Gandalf reply from the cache.
 * @param {string} key - The cache key (usually audio file name).
 * @returns {string | null} The cached reply, or null if not found.
 * @example
 * const reply = getReplyCache('abc123.mp3');
 */
export function getReplyCache(key: string): string | null {
  if (isVercel) {
    return memoryCache[key] || null;
  } else {
    const cache = loadCacheFromFile();
    return cache[key] || null;
  }
}

/**
 * Delete a Gandalf reply from the cache.
 * @param {string} key - The cache key (usually audio file name).
 * @example
 * deleteReplyCache('abc123.mp3');
 */
export function deleteReplyCache(key: string) {
  if (isVercel) {
    delete memoryCache[key];
  } else {
    const cache = loadCacheFromFile();
    delete cache[key];
    saveCacheToFile(cache);
  }
}
