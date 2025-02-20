# Gandalf AI Chatbot

A Next.js chatbot using ChatGPT and Google Text-to-Speech (TTS).

Live: https://gandalf-chatbot.vercel.app/

---

## Features

- Voice responses via Google TTS
- Chat powered by OpenAI's ChatGPT
- Built with Next.js & TypeScript
- Hosted on Vercel

---

## Setup

### Clone the Repository

```bash
git clone https://github.com/andylacroce/gandalf-chatbot.git
cd gandalf-chatbot
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create `.env.local`:

```ini
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_APPLICATION_CREDENTIALS_PATH=./config/gcp-key.json
```

Ensure `.gitignore` includes:

```plaintext
.env.local
config/gcp-key.json
```

### Run Locally

```bash
npm run dev
```

---

## Deployment

1. Push to GitHub
2. Connect the repo to Vercel
3. Add environment variables:
   - `OPENAI_API_KEY`
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON` (Paste full JSON)
4. Deploy

---

## Notes

- Vercel uses `/tmp/` for audio storage; local saves to `public/audio/`.
- API keys must not be committed to the repo.
