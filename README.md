# Gandalf AI Chatbot

A Next.js chatbot using ChatGPT and Google Text-to-Speech (TTS).

Live: https://gandalf-chatbot.vercel.app/

---

## Features

- Voice responses via Google TTS
- Chat powered by OpenAI's ChatGPT
- Built with Next.js 15.3.0 & TypeScript
- Rate limiting with LRU Cache
- Testing with Jest and React Testing Library
- Analytics via Vercel Analytics and Speed Insights
- Fully documented with TypeDoc
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

```text
.env.local
config/gcp-key.json
```

### Run Locally

```bash
npm run dev
```

The application uses Turbopack for faster development experience.

### Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode during development:

```bash
npm run test:watch
```

### Documentation

Generate documentation:

```bash
npm run docs
```

---

## Technologies

- **Frontend**: React 19, Next.js 15.3
- **API**: OpenAI API (v4.93.0), Google Cloud Text-to-Speech
- **Development**: TypeScript, ESLint, Autoprefixer, PostCSS
- **Testing**: Jest, React Testing Library
- **Logging**: Winston
- **Other**: UUID, Axios, LRU Cache

---

## Deployment

1. Push to GitHub
2. Connect the repo to Vercel
3. Add environment variables:
   - `OPENAI_API_KEY`
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON` (Paste full JSON)
4. Deploy
