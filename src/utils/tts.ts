import textToSpeech, { protos } from "@google-cloud/text-to-speech";
import fs from "fs";
import path from "path";

function getGoogleAuthCredentials() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    throw new Error(
      "Missing GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable",
    );
  }
  if (process.env.VERCEL_ENV) {
    return JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  } else {
    const credentialsPath = path.resolve(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    );
    return JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  }
}

let ttsClient:
  | import("@google-cloud/text-to-speech").TextToSpeechClient
  | null = null;
function getTTSClient() {
  if (!ttsClient) {
    ttsClient = new textToSpeech.TextToSpeechClient({
      credentials: getGoogleAuthCredentials(),
    });
  }
  return ttsClient;
}

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

  // Retry logic for TTS
  let lastError: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const [response] = await client.synthesizeSpeech(request);
      if (!response || !response.audioContent) {
        throw new Error("TTS API response is missing audioContent");
      }
      fs.writeFileSync(filePath, response.audioContent, "binary");
      console.log(`[AUDIO CREATE] Created audio file: ${filePath}`);
      // Clean up all other .mp3 files in /tmp except the one just created
      try {
        const tmpDir = path.dirname(filePath);
        const newFile = path.basename(filePath);
        const files = fs.readdirSync(tmpDir);
        for (const file of files) {
          if (file.endsWith('.mp3') && file !== newFile) {
            try {
              fs.unlinkSync(path.join(tmpDir, file));
              console.log(`[AUDIO CLEANUP] Deleted old audio file: ${file}`);
            } catch (err) {
              console.warn(`[AUDIO CLEANUP] Failed to delete file: ${file}`, err);
            }
          }
        }
      } catch (err) {
        console.warn('[AUDIO CLEANUP] Error during cleanup:', err);
      }
      return;
    } catch (err) {
      lastError = err;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }
  throw lastError;
}
