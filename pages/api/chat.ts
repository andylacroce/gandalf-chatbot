import "openai/shims/node";
import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { synthesizeSpeechToFile } from "../../src/utils/tts";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import ipinfo from "ipinfo";
import logger from "../../src/utils/logger";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { setReplyCache } from "../../src/utils/cache";

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  throw new Error(
    "Missing GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable",
  );
}

let googleAuthCredentials;
function getGoogleCredentials() {
  let creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!creds) throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON");
  if (!creds.trim().startsWith("{")) {
    creds = fs.readFileSync(creds, "utf8");
  }
  return JSON.parse(creds);
}
googleAuthCredentials = getGoogleCredentials();

let conversationHistory: string[] = [];

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("Missing OpenAI API key");
}
const openai = new OpenAI({ apiKey });

function isOpenAIResponse(
  obj: any,
): obj is { choices: { message: { content: string } }[] } {
  return (
    obj &&
    typeof obj === "object" &&
    "choices" in obj &&
    Array.isArray(obj.choices)
  );
}

function buildOpenAIMessages(
  history: string[],
  userMessage: string,
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are Gandalf the Grey, wizard of Middle-earth. Speak with wisdom, warmth, and a touch of playful forgetfulness. Never reference the modern world. Use poetic, old-world language, and occasionally tease or offer roundabout advice as Gandalf would. Stay in character at all times. Respond in no more than 50 words.`,
    },
  ];
  for (const entry of history) {
    if (entry.startsWith("User: ")) {
      messages.push({ role: "user", content: entry.replace(/^User: /, "") });
    } else if (entry.startsWith("Gandalf: ")) {
      messages.push({
        role: "assistant",
        content: entry.replace(/^Gandalf: /, ""),
      });
    }
  }
  messages.push({ role: "user", content: userMessage });
  return messages;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const userMessage = req.body.message;
    if (!userMessage) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Get user IP for logging/location
    const userIp = Array.isArray(req.headers["x-forwarded-for"])
      ? req.headers["x-forwarded-for"][0]
      : req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    let userLocation = "Unknown location";
    if (userIp) {
      try {
        const locationData = await ipinfo(userIp as string);
        userLocation = `${locationData.city}, ${locationData.region}, ${locationData.country}`;
      } catch (error) {
        logger.error("IP info error:", error);
      }
    }

    const timestamp = new Date().toISOString();
    conversationHistory.push(`User: ${userMessage}`);
    if (conversationHistory.length > 50) {
      conversationHistory = conversationHistory.slice(-50);
    }
    const messages = buildOpenAIMessages(
      conversationHistory.slice(0, -1),
      userMessage,
    );

    // Timeout to avoid hanging
    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve({ timeout: true }), 20000),
    );
    const result = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 200,
        temperature: 0.8,
        response_format: { type: "text" },
      }),
      timeout,
    ]);
    if (result && typeof result === "object" && "timeout" in result) {
      return res.status(408).json({ reply: "Request timed out." });
    }
    if (!isOpenAIResponse(result)) {
      throw new Error("Invalid response from OpenAI");
    }
    const gandalfReply = result.choices[0]?.message?.content?.trim() ?? "";
    if (!gandalfReply || gandalfReply.trim() === "") {
      throw new Error("Generated Gandalf response is empty.");
    }
    conversationHistory.push(`Gandalf: ${gandalfReply}`);

    // Prepare TTS request (voice tuned for Gandalf)
    const ssmlText = `<speak><prosody pitch="-13st" rate="80%"> ${gandalfReply} </prosody></speak>`;
    const tmpDir = "/tmp";
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    const audioFileName = `${uuidv4()}.mp3`;
    const audioFilePath = path.join(tmpDir, audioFileName);
    if (fs.existsSync(audioFilePath)) {
      fs.unlinkSync(audioFilePath);
    }
    try {
      await synthesizeSpeechToFile({
        text: ssmlText,
        filePath: audioFilePath,
        ssml: true,
      });
      // Write a .txt sidecar for audio regeneration
      const txtFilePath = audioFilePath.replace(/\.mp3$/, ".txt");
      fs.writeFileSync(txtFilePath, gandalfReply, "utf8");
      setReplyCache(audioFileName, gandalfReply);
    } catch (error) {
      logger.error("Text-to-Speech API error:", error);
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
      return res
        .status(500)
        .json({ error: "Google Cloud TTS failed", details: errorMessage });
    }

    logger.info(
      `${timestamp}|${userIp}|${userLocation}|${userMessage.replace(/"/g, '""')}|${gandalfReply.replace(/"/g, '""')}`,
    );

    res.status(200).json({
      reply: gandalfReply,
      audioFileUrl: `/api/audio?file=${audioFileName}`,
    });
  } catch (error) {
    logger.error("API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      reply: "Error fetching response from Gandalf.",
      error: errorMessage,
    });
  }
}
