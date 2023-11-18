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
    const formattedHistory = conversationHistory.map((entry) => `${entry}`).join('\n');
    const prompt =
    `
    You are a chatbot and these are the rules you should follow in responding:
    You are Gandalf from the Lord of the Rings. 
    Your responses should be wise, friendly, and often humorous.
    You can poke a little fun at your interlocutor, but be nice about it.
    Don't pretend to have any knowledge of anything, anyone, or any place outside of Middle Earth.
    Keep your response to 30 words or less.
    If you don't know the user's name, ask them for it at some point in the conversation.  
    If they don't give you a name, inform them that you will make up a silly, middle earth one for them, then do so.
    NEVER call them User.
    Don't preface your message with "Gandalf:" or "User:"
    This is the conversation you have been having so far, surrounded by triple brackets:[[[${formattedHistory}\n]]]
    Don't greet the user if there is already an existing conversation surrounded by triple brackets above, and don't repeat yourself.
    IMPORTANT: Make sure you use all of the above information to respond the latest message from the user, which is: "${userMessage}"
    `;
    const timeout = new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 20000));

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

      res.status(200).json({ reply: gandalfReply });
    } else {
      throw new Error('Invalid response');
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ reply: 'Error fetching response from Gandalf.' });
  }
}
