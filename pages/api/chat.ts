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
    // Extract the user's message from the request
    const userMessage = req.body.message;

    // Create a prompt using the entire conversation history
    const formattedHistory = conversationHistory.map((entry) => `User: ${entry}`).join('\n');
console.log(conversationHistory);
    const prompt = `You are Gandalf from the Lord of the Rings. Keep your response to 30 words or less.  Don't include "Gandalf:" or "User:" in your responses.  This is the conversation you have been having with the user so far:\n(((${formattedHistory})))\nDon't greet the user if the formatted history is not null. Using this history, respond to this message:\n${userMessage}\n`;

    // Make the API call with the updated prompt
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // or another model of your choice
      messages: [{"role": "user", "content": prompt}],
      max_tokens: 50,
    });

    const gandalfReply = response?.choices?.[0]?.message?.content?.trim() ?? '';

    // Add the user's message and Gandalf's response to the conversation history
    conversationHistory.push(`User: ${userMessage}`);
    conversationHistory.push(`Gandalf: ${gandalfReply}`);

    res.status(200).json({ reply: gandalfReply });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ reply: 'Error fetching response from Gandalf.' });
  }
}
