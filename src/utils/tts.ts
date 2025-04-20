import textToSpeech, { protos } from "@google-cloud/text-to-speech";
import fs from "fs";
import path from "path";

// Loads Google credentials from environment or file (same logic as chat.ts)
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

const ttsClient = new textToSpeech.TextToSpeechClient({
  credentials: getGoogleAuthCredentials(),
});

export async function synthesizeSpeechToFile({
  text,
  filePath,
  ssml = false,
  voice = {
    languageCodes: ["en-GB"], // for type safety
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
  const [response] = await ttsClient.synthesizeSpeech(request);
  if (!response || !response.audioContent) {
    throw new Error("TTS API response is missing audioContent");
  }
  fs.writeFileSync(filePath, response.audioContent, "binary");
}
