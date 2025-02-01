import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

// Create a variable to store the conversation history
let conversationHistory: string[] = [];

// Initialize the OpenAI client outside of the handler
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("Missing OpenAI API key");
}

const openai = new OpenAI({
  apiKey: apiKey,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const userMessage = req.body.message;
    conversationHistory.push(`Your Interlocutor: ${userMessage}`);
    
    // Optionally, limit the history size to prevent excessive growth
    const maxHistorySize = 50; // example limit
    if (conversationHistory.length > maxHistorySize) {
      conversationHistory = conversationHistory.slice(-maxHistorySize);
    }

    const prompt = `
    You are Gandalf from the Lord of the Rings. Your knowledge is limited to Middle Earth. Be concise with responses being no more than 100 words.
    You should be playful, forgetful, but you also provide sage-like wisdom in roundabout ways.
    He likes to poke lightearted fun, but he is very warm and caring.
    DO NOT start your response with "Gandalf:" or any other name followed by a colon.  

    ${conversationHistory.length > 0 ? `Here is the conversation up to this point:\n\n${conversationHistory.join('\n')}\n` : ''}
    `;
    
    const timeout = new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 20000));

    const result = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "system", content: prompt }],
        max_tokens: 200,
      }),
      timeout
    ]);

    if (result && typeof result === 'object' && 'timeout' in result) {
      return res.status(408).json({ reply: 'Request timed out.' });
    }

    if (result && typeof result === 'object' && 'choices' in result && Array.isArray(result.choices)) {
      const gandalfReply = result.choices[0]?.message?.content?.trim() ?? '';
      conversationHistory.push(`Gandalf: ${gandalfReply}`);
      // console.log(prompt)
      res.status(200).json({ reply: gandalfReply });
    } else {
      throw new Error('Invalid response');
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ reply: 'Error fetching response from Gandalf.' });
  }
}
