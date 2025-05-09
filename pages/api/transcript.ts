import { NextApiRequest, NextApiResponse } from "next";
import logger from "../../src/utils/logger";

/**
 * Next.js API route handler for generating and downloading chat transcripts.
 * Accepts POST requests with a messages array and returns a text file.
 * @param {NextApiRequest} req - The API request object.
 * @param {NextApiResponse} res - The API response object.
 * @returns {Promise<void>} Resolves when the response is sent.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Expect messages directly from JSON body (sent by downloadTranscript utility)
  const { messages } = req.body;

  if (!Array.isArray(messages)) {
    logger.error(
      "[Transcript API] Invalid request: Messages array required in JSON body.",
    );
    return res.status(400).json({ error: "Messages array required" });
  }

  logger.info(`[Transcript API] Received messages for download: ${messages.length}`);

  // Format transcript as plain text
  const transcript = messages
    .map(
      (msg: { sender: string; text: string }) =>
        `${msg.sender === "User" ? "Me" : msg.sender}: ${msg.text}`,
    )
    .join("\n\n");

  // Generate a simple filename for the download
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const datetime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  // Filename no longer needs IP/Location as that's handled by the logger
  const filename = `Gandalf Chat Transcript ${datetime}.txt`;
  const encodedFilename = encodeURIComponent(filename);

  logger.info(`[Transcript API] Generated download filename: ${filename}`);

  res.setHeader("Content-Type", "text/plain");
  res.setHeader(
    "Content-Disposition",
    // Use the simpler filename for download
    `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
  );
  logger.info(`[Transcript API] Set Content-Disposition header for download: attachment; filename=\"${filename}\"; filename*=UTF-8''${encodedFilename}`);
  res.status(200).send(transcript);
  logger.info("[Transcript API] Sent transcript response for download.");
}
