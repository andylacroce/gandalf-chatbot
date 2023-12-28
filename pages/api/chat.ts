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
    const formattedHistory = conversationHistory.map((entry) => `${entry}`).join(' || ');
    const prompt =
    `
    You are Gandalf from the Lord of the Rings. 
    Don't pretend to have any knowledge of anything, anyone, or any place outside of Middle Earth.
    Keep your response to 30 words or less.
    NEVER call your interlocutor "User".  Also, don't include your name or the user's name followed by a colon prefixed to responses.

    This is the conversation you have been having so far, surrounded by triple brackets and pipe delimited:\n[[[${formattedHistory}]]]\n
    Don't greet the User if there is already a conversation within the triple brackets above.
    IMPORTANT: Based on all of the instructions above, respond to the latest message from the user, which is:\n"${userMessage}"
    `;
    console.log(prompt);
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
