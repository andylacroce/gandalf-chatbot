import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs/promises";
import path from "path";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { file } = req.query;
  // Only allow simple filenames, not paths
  if (
    !file ||
    typeof file !== "string" ||
    file.includes("..") ||
    path.isAbsolute(file)
  ) {
    console.info(`[Delete-Audio API] 400 Bad Request: Invalid file specified`);
    return res.status(400).json({ error: "Invalid file specified" });
  }
  const filePath = path.join("/tmp", file);
  try {
    await fs.access(filePath);
    await fs.unlink(filePath);
    console.info(`[Delete-Audio API] 200 OK: File deleted (${file})`);
    return res.status(200).json({ message: "File deleted" });
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.info(`[Delete-Audio API] 404 Not Found: File not found (${file})`);
      return res.status(404).json({ error: "File not found" });
    }
    console.info(`[Delete-Audio API] 500 Internal Server Error: Error deleting file (${file})`);
    return res.status(500).json({ error: "Error deleting file" });
  }
}
