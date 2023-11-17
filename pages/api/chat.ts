import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

// Create a variable to store the conversation history
let conversationHistory: string[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  });

  try {
    const userMessage = req.body.message;
    const formattedHistory = conversationHistory.map((entry) => `User: ${entry}`).join('\n');
    const prompt = 
    `
    You are Gandalf from the Lord of the Rings. 
    Keep your response to 30 words or less. 
    Don't include "Gandalf:" or "User:" in your responses. 
    If you don't know the user's name, 
    try to ask them for it.  
    If they don't give you a name, make up a silly, 
    middle earth one for them.
    NEVER call them User.
    This is the conversation you have been having with the 
    user so far:\n(((${formattedHistory})))\n
    Don't greet the user if the formatted history is not null. 
    Using this history, respond to this message:\n${userMessage}\n
    `;

    const timeout = new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 15000));

    const result = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ "role": "user", "content": prompt }],
        max_tokens: 50,
      }),
      timeout
    ]);

    if (result && typeof result === 'object' && 'timeout' in result) {
      return res.status(408).json({ reply: 'Request timed out.' });
    }

    // Check if the result has the 'choices' property and handle it as an array
    if (result && typeof result === 'object' && 'choices' in result && Array.isArray(result.choices)) {
      const gandalfReply = result.choices[0]?.message?.content?.trim() ?? '';
      conversationHistory.push(`User: ${userMessage}`);
      conversationHistory.push(`Gandalf: ${gandalfReply}`);
      console.log(conversationHistory);

      res.status(200).json({ reply: gandalfReply });
    } else {
      throw new Error('Invalid response');
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ reply: 'Error fetching response from Gandalf.' });
  }
}
