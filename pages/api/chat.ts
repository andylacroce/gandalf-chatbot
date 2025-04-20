/**
 * API endpoint for handling chat interactions with Gandalf AI.
 * This file manages communication with OpenAI's GPT API and Google's Text-to-Speech service.
 * @module chat-api
 */

import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import textToSpeech, { protos } from "@google-cloud/text-to-speech";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import ipinfo from "ipinfo";
import logger from "../../src/utils/logger"; // corrected path

/**
 * Validate required environment variables and initialize credentials
 * @throws {Error} If GOOGLE_APPLICATION_CREDENTIALS_JSON is missing
 */
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  throw new Error(
    "Missing GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable",
  );
}

/**
 * Google authentication credentials object loaded from environment
 * @type {object}
 */
let googleAuthCredentials;

if (process.env.VERCEL_ENV) {
  // Parse credentials directly from environment variable in production
  googleAuthCredentials = JSON.parse(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
  );
} else {
  // Load credentials from file in development
  const credentialsPath = path.resolve(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
  );
  googleAuthCredentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
}

/**
 * Stores conversation history with Gandalf
 * Limited to 50 messages for context window management
 * @type {string[]}
 */
let conversationHistory: string[] = [];

/**
 * OpenAI API key loaded from environment
 * @throws {Error} If OPENAI_API_KEY is missing
 */
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("Missing OpenAI API key");
}

/**
 * OpenAI client instance for generating responses
 * @type {OpenAI}
 */
const openai = new OpenAI({ apiKey });

/**
 * Google Text-to-Speech client for converting text to speech
 * @type {textToSpeech.TextToSpeechClient}
 */
const ttsClient = new textToSpeech.TextToSpeechClient({
  credentials: googleAuthCredentials,
});

/**
 * Type guard to check if the response is from OpenAI
 * Used to ensure type safety when working with OpenAI responses
 *
 * @param {any} obj - The object to check
 * @returns {boolean} True if the object is an OpenAI response with expected structure
 */
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

/**
 * API handler for the chat endpoint
 * Processes user messages, generates Gandalf responses, and creates audio files
 *
 * @function
 * @param {NextApiRequest} req - The API request object containing the user message
 * @param {NextApiResponse} res - The API response object for returning Gandalf's reply
 * @returns {Promise<void>}
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Validate HTTP method
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Extract and validate user message
    const userMessage = req.body.message;
    if (!userMessage) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Get user IP and location for logging
    const userIp = Array.isArray(req.headers["x-forwarded-for"])
      ? req.headers["x-forwarded-for"][0]
      : req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    let userLocation = "Unknown location";

    // Try to get location data from IP
    if (userIp) {
      try {
        const locationData = await ipinfo(userIp as string);
        userLocation = `${locationData.city}, ${locationData.region}, ${locationData.country}`;
      } catch (error) {
        logger.error("IP info error:", error);
      }
    }

    // Prepare conversation data
    const timestamp = new Date().toISOString();
    conversationHistory.push(`User: ${userMessage}`);

    // Limit conversation history to prevent token overflow
    if (conversationHistory.length > 50) {
      conversationHistory = conversationHistory.slice(-50);
    }

    // Construct prompt for OpenAI with Gandalf persona
    const prompt = `
You are Gandalf the Grey from *The Lord of the Rings*. You speak with the wisdom of a centuries-old wizard, yet your mind sometimes wanders playfully. 

Your knowledge is limited to the world of Middle-earth—its history, lands, creatures, and lore. Avoid references to modern events, technology, or real-world topics beyond Middle-earth. 

Your responses should:
- Be **concise** (no more than 50-100 words).
- Maintain a **warm and caring tone**.
- Use **playful forgetfulness** and **roundabout wisdom** when offering advice.
- Occasionally add **lighthearted teasing** in the spirit of Gandalf's personality.
- Use a **slightly formal, old-world** speech style fitting for a wise and legendary figure.

Keep responses immersive as if Gandalf himself is speaking.

${conversationHistory.length > 0 ? `Here is the conversation up to this point:\n\n${conversationHistory.join("\n")}\n` : ""}`;

    // Set timeout for API request to prevent hanging
    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve({ timeout: true }), 20000),
    );

    // Race API request against timeout
    const result = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
      }),
      timeout,
    ]);

    // Handle timeout case
    if (result && typeof result === "object" && "timeout" in result) {
      return res.status(408).json({ reply: "Request timed out." });
    }

    // Validate OpenAI response
    if (!isOpenAIResponse(result)) {
      throw new Error("Invalid response from OpenAI");
    }

    // Extract Gandalf's reply text
    const gandalfReply = result.choices[0]?.message?.content?.trim() ?? "";
    if (!gandalfReply || gandalfReply.trim() === "") {
      throw new Error("Generated Gandalf response is empty.");
    }

    // Update conversation history
    conversationHistory.push(`Gandalf: ${gandalfReply}`);

    // Prepare text-to-speech request with voice tuned for Gandalf
    const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest =
      {
        input: {
          ssml: `<speak><prosody pitch="-13st" rate="80%"> ${gandalfReply} </prosody></speak>`,
        },
        voice: {
          languageCode: "en-GB",
          name: "en-GB-Wavenet-D",
          ssmlGender: protos.google.cloud.texttospeech.v1.SsmlVoiceGender.MALE,
        },
        audioConfig: {
          audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
        },
      };

    // Validate TTS request
    if (!request || typeof request !== "object") {
      throw new Error("Invalid Text-to-Speech request: Payload is malformed");
    }

    // Generate speech from text
    let response;
    try {
      [response] = await ttsClient.synthesizeSpeech(request);
      if (!response || !response.audioContent) {
        throw new Error("TTS API response is missing audioContent");
      }
    } catch (error) {
      logger.error("Text-to-Speech API error:", error);
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
      return res
        .status(500)
        .json({ error: "Google Cloud TTS failed", details: errorMessage });
    }

    // Ensure temporary directory exists
    const tmpDir = "/tmp";
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Create unique filename for audio file
    const audioFileName = `${uuidv4()}.mp3`;
    const audioFilePath = path.join(tmpDir, audioFileName);

    // Remove existing file if it exists
    if (fs.existsSync(audioFilePath)) {
      fs.unlinkSync(audioFilePath);
    }

    // Write audio content to file
    fs.writeFileSync(audioFilePath, response.audioContent, "binary");

    // Log interaction details
    logger.info(
      `${timestamp}|${userIp}|${userLocation}|${userMessage.replace(/"/g, '""')}|${gandalfReply.replace(/"/g, '""')}`,
    );

    // Return successful response with reply and audio URL
    res.status(200).json({
      reply: gandalfReply,
      audioFileUrl: `/api/audio?file=${audioFileName}`,
    });
  } catch (error) {
    // Log and return error
    logger.error("API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      reply: "Error fetching response from Gandalf.",
      error: errorMessage,
    });
  }
}
