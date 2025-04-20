/**
 * API endpoint for deleting temporary audio files.
 * This file handles cleanup of audio files after they've been played to prevent disk space issues.
 * @module delete-audio-api
 */

import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs/promises";
import path from "path";

/**
 * API handler for deleting audio files that are no longer needed.
 * This endpoint validates the file parameter, ensures security constraints,
 * and removes the specified file from the temporary directory.
 *
 * @function
 * @param {NextApiRequest} req - The Next.js API request object containing the file parameter
 * @param {NextApiResponse} res - The Next.js API response object
 * @returns {Promise<void>}
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Extract and validate the file parameter
  const { file } = req.query;

  // Security validation to prevent directory traversal attacks
  if (
    !file ||
    typeof file !== "string" ||
    file.includes("..") ||
    path.isAbsolute(file)
  ) {
    return res.status(400).json({ error: "Invalid file specified" });
  }

  // Construct full file path in the temporary directory
  const filePath = path.join("/tmp", file);

  try {
    // Check if the file exists before attempting deletion
    await fs.access(filePath);

    // Delete the file from the filesystem
    await fs.unlink(filePath);

    // Respond with success message
    return res.status(200).json({ message: "File deleted" });
  } catch (error: any) {
    // Handle case where file is already deleted
    if (error.code === "ENOENT") {
      return res.status(200).json({ message: "File already deleted" });
    }

    // Handle other errors (permissions, etc.)
    return res.status(500).json({ error: "Error deleting file" });
  }
}
