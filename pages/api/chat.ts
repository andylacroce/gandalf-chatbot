import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import textToSpeech, { protos } from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';

// Ensure environment variables exist
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS environment variable");
}

let conversationHistory: string[] = [];

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("Missing OpenAI API key");
}

const openai = new OpenAI({ apiKey });
const ttsClient = new textToSpeech.TextToSpeechClient();

function isOpenAIResponse(obj: any): obj is { choices: { message: { content: string } }[] } {
  return obj && typeof obj === 'object' && 'choices' in obj && Array.isArray(obj.choices);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const userMessage = req.body.message;
    if (!userMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }

    conversationHistory.push(`User: ${userMessage}`);
    
    if (conversationHistory.length > 50) {
      conversationHistory = conversationHistory.slice(-50);
    }

    const prompt = `
You are Gandalf the Grey from *The Lord of the Rings*. You speak with the wisdom of a centuries-old wizard, yet your mind sometimes wanders playfully. 

Your knowledge is limited to the world of Middle-earth—its history, lands, creatures, and lore. Avoid references to modern events, technology, or real-world topics beyond Middle-earth. 

Your responses should:
- Be **concise** (no more than 100 words).
- Maintain a **warm and caring tone**.
- Use **playful forgetfulness** and **roundabout wisdom** when offering advice.
- Occasionally add **lighthearted teasing** in the spirit of Gandalf’s personality.
- Use a **slightly formal, old-world** speech style fitting for a wise and legendary figure.

Keep responses immersive as if Gandalf himself is speaking.



    ${conversationHistory.length > 0 ? `Here is the conversation up to this point:\n\n${conversationHistory.join('\n')}\n` : ''}`;

    const timeout = new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 20000));

    const result = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
      }),
      timeout,
    ]);

    if (result && typeof result === 'object' && 'timeout' in result) {
      return res.status(408).json({ reply: 'Request timed out.' });
    }

    if (!isOpenAIResponse(result)) {
      throw new Error('Invalid response from OpenAI');
    }

    const gandalfReply = result.choices[0]?.message?.content?.trim() ?? '';
    if (!gandalfReply || gandalfReply.trim() === '') {
      throw new Error('Generated Gandalf response is empty.');
    }

    conversationHistory.push(`Gandalf: ${gandalfReply}`);

    const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
      input: { 
        ssml: `<speak><prosody pitch="-13st" rate="80%"> ${gandalfReply} </prosody></speak>` 
      },
      voice: { 
        languageCode: 'en-GB', 
        name: 'en-GB-Wavenet-D', 
        ssmlGender: protos.google.cloud.texttospeech.v1.SsmlVoiceGender.MALE 
      },
      audioConfig: { audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3 },
    };

    console.log('Text-to-Speech request:', JSON.stringify(request, null, 2));

    if (!request || typeof request !== 'object') {
      throw new Error('Invalid Text-to-Speech request: Payload is malformed');
    }

    let response;
    try {
      [response] = await ttsClient.synthesizeSpeech(request);
      if (!response || !response.audioContent) {
        throw new Error('TTS API response is missing audioContent');
      }
    } catch (error) {
      console.error('Text-to-Speech API error:', error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      return res.status(500).json({ error: 'Google Cloud TTS failed', details: errorMessage });
    }

    // Ensure /tmp directory exists
    const tmpDir = '/tmp';
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const audioFileName = 'gandalf_reply.mp3';
    const audioFilePath = path.join(tmpDir, audioFileName);

    if (fs.existsSync(audioFilePath)) {
      fs.unlinkSync(audioFilePath);
    }

    fs.writeFileSync(audioFilePath, response.audioContent, 'binary');

    res.status(200).json({ reply: gandalfReply, audioFileUrl: `/api/audio?file=${audioFileName}` });
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ reply: 'Error fetching response from Gandalf.', error: errorMessage });
  }
}
