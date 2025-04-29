// Hybrid cache for Gandalf replies: works on Vercel (in-memory) and locally (file-based)
import fs from "fs";
import path from "path";

const isVercel = !!process.env.VERCEL_ENV;
const CACHE_FILE = "/tmp/gandalf-reply-cache.json";

// In-memory cache for Vercel
const memoryCache: Record<string, string> = {};

function loadCacheFromFile() {
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

function saveCacheToFile(cache: Record<string, string>) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), "utf8");
  } catch {}
}

export function setReplyCache(key: string, value: string) {
  if (isVercel) {
    memoryCache[key] = value;
  } else {
    const cache = loadCacheFromFile();
    cache[key] = value;
    saveCacheToFile(cache);
  }
}

export function getReplyCache(key: string): string | null {
  if (isVercel) {
    return memoryCache[key] || null;
  } else {
    const cache = loadCacheFromFile();
    return cache[key] || null;
  }
}

export function deleteReplyCache(key: string) {
  if (isVercel) {
    delete memoryCache[key];
  } else {
    const cache = loadCacheFromFile();
    delete cache[key];
    saveCacheToFile(cache);
  }
}
