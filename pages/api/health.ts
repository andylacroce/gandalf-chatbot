import "openai/shims/node";
import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import textToSpeech, { protos } from "@google-cloud/text-to-speech";
import fs from "fs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  let openaiStatus = "ok";
  let openaiError = null;
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OpenAI API key");
    const openai = new OpenAI({ apiKey });
    const result = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
      temperature: 0,
      response_format: { type: "text" },
    });
    if (!result || !result.choices || !result.choices[0]?.message?.content) {
      throw new Error("No valid OpenAI response");
    }
  } catch (err: any) {
    openaiStatus = "error";
    openaiError = err.message || String(err);
    if (process.env.NODE_ENV !== "production") {
      console.error("[HealthCheck] OpenAI error:", err);
    }
  }

  let ttsStatus = "ok";
  let ttsError = null;
  try {
    let creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!creds) throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON");
    if (!creds.trim().startsWith("{")) {
      creds = fs.readFileSync(creds, "utf8");
    }
    const ttsClient = new textToSpeech.TextToSpeechClient({
      credentials: JSON.parse(creds),
    });
    const [response] = await ttsClient.synthesizeSpeech({
      input: { text: "ping" },
      voice: {
        languageCode: "en-GB",
        name: "en-GB-Wavenet-D",
        ssmlGender: protos.google.cloud.texttospeech.v1.SsmlVoiceGender.MALE,
      },
      audioConfig: {
        audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
      },
    });
    if (!response || !response.audioContent) {
      throw new Error("No audio content from TTS");
    }
  } catch (err: any) {
    ttsStatus = "error";
    ttsError = err.message || String(err);
    if (process.env.NODE_ENV !== "production") {
      console.error("[HealthCheck] Google TTS error:", err);
    }
  }

  if (openaiStatus === "ok" && ttsStatus === "ok") {
    if (process.env.NODE_ENV !== "production")
      console.log("[HealthCheck] All services healthy");
    return res.status(200).json({ status: "ok" });
  }
  if (process.env.NODE_ENV !== "production")
    console.error("[HealthCheck] Service error", {
      openaiStatus,
      openaiError,
      ttsStatus,
      ttsError,
    });
  return res.status(500).json({
    status: "error",
    openai: { status: openaiStatus, error: openaiError },
    tts: { status: ttsStatus, error: ttsError },
  });
}
