import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { synthesizeSpeechToFile } from "../../src/utils/tts";
import { getReplyCache } from "../../src/utils/cache";

function getOriginalTextForAudio(sanitizedFile: string): string | null {
  const txtFile = sanitizedFile.replace(/\.mp3$/, ".txt");
  const txtPathTmp = path.resolve("/tmp", txtFile);
  const txtPathPublic = path.resolve("public", txtFile);
  if (fs.existsSync(txtPathTmp)) {
    return fs.readFileSync(txtPathTmp, "utf8");
  }
  if (fs.existsSync(txtPathPublic)) {
    return fs.readFileSync(txtPathPublic, "utf8");
  }
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { file } = req.query;
  if (!file || typeof file !== "string") {
    return res.status(400).json({ error: "File parameter is required" });
  }
  // Only allow filename, not path
  const sanitizedFile = path.basename(file);
  const audioFilePath = path.resolve("/tmp", sanitizedFile);
  const localFilePath = path.resolve("public", sanitizedFile);
  const checkFileExists = (filePath: string) =>
    fs.existsSync(filePath) ? fs.realpathSync(filePath) : "";
  let normalizedAudioFilePath = checkFileExists(audioFilePath);
  let normalizedLocalFilePath = checkFileExists(localFilePath);
  let found = false;

  // Only wait for file if we just tried to regenerate it
  let triedRegenerate = false;
  if (!normalizedAudioFilePath && !normalizedLocalFilePath) {
    let originalText = getOriginalTextForAudio(sanitizedFile);
    if (!originalText) {
      originalText = getReplyCache(sanitizedFile);
    }
    if (originalText) {
      try {
        await synthesizeSpeechToFile({
          text: `<speak><prosody pitch=\"-13st\" rate=\"80%\"> ${originalText} </prosody></speak>`,
          filePath: audioFilePath,
          ssml: true,
        });
        triedRegenerate = true;
        normalizedAudioFilePath = checkFileExists(audioFilePath);
        found = !!normalizedAudioFilePath;
      } catch (err) {
        return res
          .status(500)
          .json({ error: "Failed to regenerate audio via TTS" });
      }
    }
  }
  // If we just regenerated, wait for file to appear (retry up to 5 times)
  if (triedRegenerate && !normalizedAudioFilePath) {
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      normalizedAudioFilePath = checkFileExists(audioFilePath);
      if (normalizedAudioFilePath) break;
    }
  }

  // Security: only allow files in /tmp or /public
  const allowedTmp = path.resolve("/tmp");
  const allowedPublic = path.resolve("public");
  if (
    normalizedAudioFilePath &&
    !normalizedAudioFilePath.startsWith(allowedTmp) &&
    normalizedLocalFilePath &&
    !normalizedLocalFilePath.startsWith(allowedPublic)
  ) {
    return res.status(403).json({ error: "Access forbidden" });
  }
  const filePath = normalizedAudioFilePath || normalizedLocalFilePath;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }
  let audioContent;
  try {
    audioContent = fs.readFileSync(filePath);
  } catch (err) {
    return res.status(500).json({ error: "Error reading file" });
  }
  res.setHeader("Content-Type", "audio/mpeg");
  res.send(audioContent);
}
