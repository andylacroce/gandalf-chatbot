import { NextApiRequest, NextApiResponse } from "next";
import { put, head } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

// Helper to get location from IP (reuse or import if needed)
async function getLocationFromIp(ip: string): Promise<{ city: string; region: string; country: string } | null> {
  if (!ip) return null;
  try {
    // Use a free tier or provide your token if needed
    const response = await fetch(`https://ipinfo.io/${ip}/json`);
    if (!response.ok) {
      console.error(`[ipinfo] Failed to fetch location for IP ${ip}: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return {
      city: data.city || 'UnknownCity',
      region: data.region || 'UnknownRegion',
      country: data.country || 'UnknownCountry',
    };
  } catch (error) {
    console.error(`[ipinfo] Error fetching location for IP ${ip}:`, error);
    return null;
  }
}

// Helper to escape HTML special characters to prevent XSS in logs
function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, function (tag) {
    const chars: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return chars[tag] || tag;
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { sender, text, sessionId, sessionDatetime } = req.body;
    if (!sender || typeof text === 'undefined' || !sessionId || !sessionDatetime) {
      return res.status(400).json({ error: "Sender, text, sessionId, and sessionDatetime required" });
    }

    // Sanitize sender and text to prevent XSS in logs
    const safeSender = escapeHtml(sender);
    const safeText = escapeHtml(text);

    // Validate input types and lengths
    if (typeof sender !== 'string' || sender.length > 100) {
      return res.status(400).json({ error: "Invalid sender" });
    }
    if (typeof text !== 'string' || text.length > 2000) {
      return res.status(400).json({ error: "Invalid text" });
    }
    if (typeof sessionId !== 'string' || sessionId.length > 100) {
      return res.status(400).json({ error: "Invalid sessionId" });
    }
    if (typeof sessionDatetime !== 'string' || sessionDatetime.length > 30) {
      return res.status(400).json({ error: "Invalid sessionDatetime" });
    }

    // Prevent log injection by removing newlines and control characters
    const cleanSender = safeSender.replace(/[\r\n\t\0\x0B\f]/g, '');
    const cleanText = safeText.replace(/[\r\n\t\0\x0B\f]/g, '');

    // --- Get IP and Location ---
    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim() || 'UnknownIP';
    const location = await getLocationFromIp(ip);
    const locationString = location ? `${location.city}-${location.region}-${location.country}` : 'UnknownLocation';
    // --- End IP and Location ---

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${ip}] [${locationString}] ${cleanSender}: ${cleanText}\n`;

    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // --- Determine Log Filename ---
    // Sanitize filename to prevent directory traversal
    const safeSessionDatetime = sessionDatetime.replace(/[^a-zA-Z0-9_-]/g, '');
    const safeShortSessionId = sessionId.slice(0, 8).replace(/[^a-zA-Z0-9]/g, '');
    let logFilename: string = `${safeSessionDatetime}_session_${safeShortSessionId}.log`;
    console.log(`[Log API] Using session ID for filename: ${logFilename}`);
    // --- End Determine Log Filename ---

    // --- Append to Log ---
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Append to Vercel Blob (Read, Append, Write)
      try {
        let existingContent = '';
        try {
          // Check if blob exists and get its content
          const blobInfo = await head(logFilename); // Check if file exists
          if (blobInfo && blobInfo.url) {
            const response = await fetch(blobInfo.url + `?cachebust=${Date.now()}`); // Bypass CDN cache
            if (response.ok) {
              existingContent = await response.text();
            } else {
              console.warn(`[Log API] Could not fetch existing blob content for ${logFilename}, status: ${response.status}`);
            }
          } else {
            console.log(`[Log API] Blob info not found for ${logFilename}.`);
          }
        } catch (error) {
          if (typeof error === 'object' && error !== null && 'status' in error && (error as any).status !== 404) { // Ignore 404 errors (file doesn't exist yet)
            console.error(`[Log API] Error checking/fetching blob ${logFilename}:`, error);
          } else {
            console.log(`[Log API] Blob ${logFilename} not found, creating new one.`);
          }
        }

        const newContent = existingContent + logEntry;

        // Write the log content directly (no explicit UTF-8 conversion)
        await put(logFilename, newContent, {
          access: 'public', // Or 'private'
          allowOverwrite: true, // Allow overwriting the existing blob
        });
        console.log(`[Log API] Appended to Vercel Blob: ${logFilename}`);

      } catch (error) {
        console.error(`[Log API] Error appending to Vercel Blob ${logFilename}:`, error);
      }
    } else {
      // Append to local file
      console.log("[Log API - Local] Attempting to log locally."); // Added log
      try {
        const logDir = path.resolve(process.cwd(), 'tmp', 'logs');
        const filePath = path.join(logDir, logFilename);
        console.log(`[Log API - Local] Target directory: ${logDir}`); // Added log
        console.log(`[Log API - Local] Target file path: ${filePath}`); // Added log

        console.log("[Log API - Local] Ensuring directory exists..."); // Added log
        fs.mkdirSync(logDir, { recursive: true });
        console.log("[Log API - Local] Directory ensured."); // Added log

        console.log("[Log API - Local] Appending to file..."); // Added log
        fs.appendFileSync(filePath, logEntry, 'utf8');
        console.log(`[Log API - Local] Appended to local log: ${filePath}`);
      } catch (error) {
        console.error(`[Log API - Local] Error appending to local log ${logFilename}:`, error); // Enhanced error log
      }
    }
    // --- End Append to Log ---

    res.status(200).json({ success: true });

  } catch (error) {
    console.error("[Log API] Internal Server Error:", error);
    // Only return generic error messages to client
    res.status(500).json({ error: "Internal Server Error" });
  }
}
