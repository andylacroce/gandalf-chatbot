# Gandalf Chatbot

A Next.js app featuring a real-time chat interface, AI-powered Gandalf persona, and voice responses via Google Text-to-Speech. Modular, tested, and ready for deployment.

Live: https://gandalf-chatbot.vercel.app/

<div align="center">
  <img src="public/gandalf.jpg" alt="Gandalf" width="150" height="150" style="border-radius: 50%; object-fit: cover;" />
</div>

---

## Features

- Voice responses via Google TTS
- Chat powered by OpenAI's ChatGPT
- Built with Next.js 15.3 & React 19
- TypeScript for type safety
- Rate limiting with LRU Cache
- Testing with Jest and React Testing Library
- Analytics via Vercel Analytics and Speed Insights
- Fully documented with TypeDoc
- Responsive design for mobile and desktop
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

Create a `.env.local` file for local development:

```ini
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_APPLICATION_CREDENTIALS_JSON=config/gcp-key.json
```

- For local development, you can use a file path (e.g., `config/gcp-key.json`) or paste the full JSON string.
- For Vercel deployment, you **must** paste the full JSON string for `GOOGLE_APPLICATION_CREDENTIALS_JSON` in the Vercel dashboard (not a file path).

Ensure `.gitignore` includes:

```
.env.local
config/gcp-key.json
```

### Run Locally

```bash
npm run dev
```

The application uses Turbopack for a fast development experience.

### Testing

Run the test suite:

```bash
npm test
```

Additional testing options:

```bash
# Watch mode for development
npm run test:watch

# Fast testing for only changed files
npm run test:fast

# Speed-optimized testing for development
npm run test:dev

# Parallel execution for faster testing
npm run test:parallel

# Update snapshots
npm run test:update

# Debug tests with node inspector
npm run test:debug

# Run speed-focused tests
npm run test:speed
```

For parallel test execution, use `npm run test:parallel` to utilize all available CPU cores and significantly reduce test execution time.

### Documentation

Generate documentation locally:

```bash
npm run docs
```

Documentation is generated using TypeDoc and will be created in the `docs` directory. The `docs` directory is excluded from version control. Each developer should generate the documentation locally as needed.

---

## Project Structure

```
app/               # Next.js app directory
├── components/    # React components
├── page.tsx       # Main page component
├── layout.tsx     # Root layout
pages/api/         # API routes
├── audio.ts       # Text-to-speech API
├── chat.ts        # ChatGPT API
├── health.ts      # Health check API
└── delete-audio.ts # Audio file cleanup
public/            # Static assets
src/
├── middleware/    # Middleware components
├── types/         # Type definitions
└── utils/         # Utility functions
tests/             # Test files
```

---

## Technologies

- **Frontend**: React 19, Next.js 15.3
- **API**: OpenAI API (v4.96.x), Google Cloud Text-to-Speech
- **Development**: TypeScript, ESLint, Autoprefixer, PostCSS
- **Testing**: Jest, React Testing Library
- **Logging**: Winston
- **Other**: UUID, Axios, LRU Cache

---

## Deployment

1. Push to GitHub
2. Connect the repo to Vercel
3. In the Vercel dashboard, add environment variables:
   - `OPENAI_API_KEY` (your OpenAI API key)
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON` (paste the full JSON string, not a file path)
4. Deploy

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request

### Development Best Practices

- Write tests for new features
- Run tests in parallel with `npm run test:parallel` to save time
- Update documentation for API changes
- Follow the existing code style
- Make sure all tests pass before submitting a pull request

---

## License

This project is free to use for any purpose. Feel free to use, modify, or distribute the code without restriction.
