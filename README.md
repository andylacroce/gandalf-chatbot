# Gandalf Chatbot

A Next.js app featuring a real-time chat interface, AI-powered Gandalf persona, and voice responses via Google Text-to-Speech.

## Features
- Voice responses via Google TTS
- Chat powered by OpenAI's ChatGPT
- Built with Next.js & React
- TypeScript
- Rate limiting
- Tested with Jest
- Responsive design

## Setup

1. **Clone & Install**
   ```bash
   git clone https://github.com/andylacroce/gandalf-chatbot.git
   cd gandalf-chatbot
   npm install
   ```
2. **Environment Variables**
   - Create `.env.local`:
     ```ini
     OPENAI_API_KEY=your_openai_api_key_here
     GOOGLE_APPLICATION_CREDENTIALS_JSON=config/gcp-key.json
     ```
   - For Vercel, paste the full JSON string for `GOOGLE_APPLICATION_CREDENTIALS_JSON` in the dashboard.

3. **Run Locally**
   ```bash
   npm run dev
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

## Project Structure
- `app/` - Next.js app & components
- `pages/api/` - API routes
- `src/` - Middleware, types, utils
- `tests/` - Test files

## License
NA
