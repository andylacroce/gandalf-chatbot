import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { synthesizeSpeechToFile } from "../../src/utils/tts";
import { getReplyCache } from "../../src/utils/cache";
import OpenAI from "openai";
import logger from "../../src/utils/logger";
import { v4 as uuidv4 } from "uuid";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const SYSTEM_PROMPT = `You are Gandalf the Grey, wizard of Middle-earth. Speak with wisdom, warmth, and a touch of playful forgetfulness. Never reference the modern world. Use poetic, old-world language, and occasionally tease or offer roundabout advice as Gandalf would. Stay in character at all times. Respond in no more than 50 words. Do not start every response with the same word or phrase. Vary your sentence openings and avoid overusing 'Ah,' or similar interjections.`;

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
  req: import("next").NextApiRequest,
  res: import("next").NextApiResponse,
) {
  const { file, text: expectedText } = req.query;
  if (!file || typeof file !== "string") {
    logger.info(`[Audio API] 400 Bad Request: File parameter is required`);
    return res.status(400).json({ error: "File parameter is required" });
  }
  // Only allow filename, not path
  const sanitizedFile = path.basename(file);
  const audioFilePath = path.resolve("/tmp", sanitizedFile);
  const localFilePath = path.resolve("public", sanitizedFile);
  const txtFilePath = audioFilePath.replace(/\.mp3$/, ".txt");
  const checkFileExists = (filePath: string) =>
    fs.existsSync(filePath) ? fs.realpathSync(filePath) : "";
  let normalizedAudioFilePath = checkFileExists(audioFilePath);
  let normalizedLocalFilePath = checkFileExists(localFilePath);
  let found = false;
  let triedRegenerate = false;
  let regenError: any = null;

  // --- ALWAYS use the text param if present ---
  if (typeof expectedText === "string") {
    // Check if .txt file exists and matches expectedText
    let txtContent: string | null = null;
    if (fs.existsSync(txtFilePath)) {
      txtContent = fs.readFileSync(txtFilePath, "utf8");
    }
    if (typeof txtContent === "string" && txtContent.trim() === expectedText.trim()) {
      // .txt matches, serve existing audio if present
      normalizedAudioFilePath = checkFileExists(audioFilePath);
      normalizedLocalFilePath = checkFileExists(localFilePath);
      found = !!normalizedAudioFilePath || !!normalizedLocalFilePath;
      // No need to regenerate audio
    } else {
      // .txt missing or does not match, regenerate audio and update .txt
      try {
        await synthesizeSpeechToFile({
          text: `<speak><prosody pitch=\"-13st\" rate=\"80%\"> ${expectedText} </prosody></speak>`,
          filePath: audioFilePath,
          ssml: true,
        });
        fs.writeFileSync(txtFilePath, expectedText, "utf8");
        normalizedAudioFilePath = checkFileExists(audioFilePath);
        found = !!normalizedAudioFilePath;
        triedRegenerate = true;
      } catch (err) {
        logger.error(`[AUDIO] Failed to synthesize audio from text param for ${sanitizedFile}:`, err);
        regenError = err;
      }
    }
  } else {
    // --- NEW: Check .txt file matches expected text if provided ---
    let txtContent: string | null = null;
    if (normalizedAudioFilePath || normalizedLocalFilePath) {
      // Try to find the .txt file in /tmp or /public
      const txtPathTmp = txtFilePath;
      const txtPathPublic = path.resolve("public", sanitizedFile.replace(/\.mp3$/, ".txt"));
      if (fs.existsSync(txtPathTmp)) {
        txtContent = fs.readFileSync(txtPathTmp, "utf8");
      } else if (fs.existsSync(txtPathPublic)) {
        txtContent = fs.readFileSync(txtPathPublic, "utf8");
      }
      // If expectedText is provided, compare
      // Fix: ensure txtContent is always string before calling trim, and expectedText is string
      if (
        typeof expectedText === "string" &&
        typeof txtContent === "string" &&
        (txtContent as string).trim() !== (expectedText as string).trim()
      ) {
        logger.info(`[Audio API] Detected text mismatch for ${sanitizedFile}, regenerating audio and .txt file.`);
        try {
          await synthesizeSpeechToFile({
            text: `<speak><prosody pitch=\"-13st\" rate=\"80%\"> ${expectedText} </prosody></speak>`,
            filePath: audioFilePath,
            ssml: true,
          });
          fs.writeFileSync(txtFilePath, expectedText, "utf8");
          normalizedAudioFilePath = checkFileExists(audioFilePath);
          found = !!normalizedAudioFilePath;
          txtContent = expectedText;
          triedRegenerate = true;
        } catch (err) {
          logger.error(`[AUDIO] Failed to regenerate audio for text mismatch for ${sanitizedFile}:`, err);
          regenError = err;
        }
      }
    }

    if (!found) {
      // Only wait for file if we just tried to regenerate it
      triedRegenerate = false;
      regenError = null;

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
            logger.error(`[AUDIO] Failed to regenerate audio from cached text for ${sanitizedFile}:`, err);
            regenError = err;
          }
        }
        // If still not found, try full OpenAI+TTS regen up to 3 times
        if (!found) {
          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) {
            logger.error("[AUDIO] Missing OPENAI_API_KEY for regen");
          } else {
            const openai = new OpenAI({ apiKey });
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                logger.info(`[AUDIO] Attempting OpenAI+TTS regen for ${sanitizedFile}, attempt ${attempt}`);
                // Use the filename (without .mp3) as the user message if possible
                const userMessage = sanitizedFile.replace(/\.mp3$/, "");
                const messages: ChatCompletionMessageParam[] = [
                  { role: "system", content: SYSTEM_PROMPT },
                  { role: "user", content: userMessage },
                ];
                const result = await openai.chat.completions.create({
                  model: "gpt-4o",
                  messages,
                  max_tokens: 200,
                  temperature: 0.8,
                  response_format: { type: "text" },
                });
                const gandalfReply = result.choices[0]?.message?.content?.trim() ?? "";
                if (!gandalfReply) throw new Error("OpenAI returned empty message");
                // Save .txt for future regen
                const txtFilePath = audioFilePath.replace(/\.mp3$/, ".txt");
                fs.writeFileSync(txtFilePath, gandalfReply, "utf8");
                // Now TTS
                await synthesizeSpeechToFile({
                  text: `<speak><prosody pitch=\"-13st\" rate=\"80%\"> ${gandalfReply} </prosody></speak>`,
                  filePath: audioFilePath,
                  ssml: true,
                });
                normalizedAudioFilePath = checkFileExists(audioFilePath);
                if (normalizedAudioFilePath) {
                  logger.info(`[AUDIO] Successfully regenerated audio for ${sanitizedFile} on attempt ${attempt}`);
                  found = true;
                  break;
                }
              } catch (err) {
                logger.error(`[AUDIO] OpenAI+TTS regen failed for ${sanitizedFile} on attempt ${attempt}:`, err);
                regenError = err;
              }
            }
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
    logger.info(`[Audio API] 403 Forbidden: Access forbidden for file ${sanitizedFile}`);
    return res.status(403).json({ error: "Access forbidden" });
  }
  const filePath = normalizedAudioFilePath || normalizedLocalFilePath;
  if (!filePath || !fs.existsSync(filePath)) {
    logger.info(`[Audio API] 404 Not Found: File not found after all regen attempts for ${sanitizedFile}`);
    logger.error(`[AUDIO] File not found after all regen attempts: ${sanitizedFile}`, { regenError });
    return res.status(404).json({ error: "File not found after all regeneration attempts" });
  }
  let audioContent;
  try {
    audioContent = fs.readFileSync(filePath);
  } catch (err) {
    logger.info(`[Audio API] 500 Internal Server Error: Error reading file ${filePath}`);
    logger.error(`[AUDIO] Error reading file ${filePath}:`, err);
    return res.status(500).json({ error: "Error reading file" });
  }
  logger.info(`[Audio API] 200 OK: Audio file sent for ${sanitizedFile}`);
  res.setHeader("Content-Type", "audio/mpeg");
  res.send(audioContent);
}
