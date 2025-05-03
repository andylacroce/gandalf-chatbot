import textToSpeech, { protos } from "@google-cloud/text-to-speech";
import fs from "fs";
import path from "path";

/**
 * Loads Google Cloud credentials from environment or file.
 * Throws if credentials are missing or invalid.
 * @returns {object} Google credentials object
 * @internal
 */
function getGoogleAuthCredentials() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable");
  }
  if (process.env.VERCEL_ENV) {
    return JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  } else {
    const credentialsPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    return JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  }
}

let ttsClient: import("@google-cloud/text-to-speech").TextToSpeechClient | null = null;

/**
 * Returns a singleton Google Text-to-Speech client instance.
 * @returns {TextToSpeechClient}
 * @internal
 */
function getTTSClient() {
  if (!ttsClient) {
    ttsClient = new textToSpeech.TextToSpeechClient({
      credentials: getGoogleAuthCredentials(),
    });
  }
  return ttsClient;
}

/**
 * Synthesize speech from text or SSML and write to a file.
 * @param {object} params - Synthesis parameters
 * @param {string} params.text - The text or SSML to synthesize
 * @param {string} params.filePath - The output file path (MP3)
 * @param {boolean} [params.ssml=false] - If true, treat text as SSML
 * @param {protos.google.cloud.texttospeech.v1.IVoice} [params.voice] - Voice configuration
 * @param {protos.google.cloud.texttospeech.v1.IAudioConfig} [params.audioConfig] - Audio config
 * @returns {Promise<void>} Resolves when file is written
 * @example
 * await synthesizeSpeechToFile({ text: 'Hello', filePath: '/tmp/hello.mp3' });
 */
export async function synthesizeSpeechToFile({
  text,
  filePath,
  ssml = false,
  voice = {
    languageCodes: ["en-GB"],
    name: "en-GB-Wavenet-D",
    ssmlGender: protos.google.cloud.texttospeech.v1.SsmlVoiceGender.MALE,
  },
  audioConfig = {
    audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
  },
}: {
  text: string;
  filePath: string;
  ssml?: boolean;
  voice?: protos.google.cloud.texttospeech.v1.IVoice;
  audioConfig?: protos.google.cloud.texttospeech.v1.IAudioConfig;
}): Promise<void> {
  const input = ssml ? { ssml: text } : { text };
  // The API expects languageCode, not languageCodes
  const apiVoice = {
    ...voice,
    languageCode: (voice.languageCodes && voice.languageCodes[0]) || "en-GB",
  };
  delete apiVoice.languageCodes;
  const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
    input,
    voice: apiVoice,
    audioConfig,
  };
  const client = getTTSClient();
  const [response] = await client.synthesizeSpeech(request);
  if (!response || !response.audioContent) {
    throw new Error("TTS API response is missing audioContent");
  }
  fs.writeFileSync(filePath, response.audioContent, "binary");
}
