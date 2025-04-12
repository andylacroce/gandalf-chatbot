# Gandalf AI Chatbot

A Next.js chatbot using ChatGPT and Google Text-to-Speech (TTS). The chatbot takes on the persona of Gandalf from Lord of the Rings.

Live: https://gandalf-chatbot.vercel.app/

<div align="center">
  <img src="public/gandalf.jpg" alt="Gandalf" width="200" height="200" />
</div>

---

## Features

- Voice responses via Google TTS
- Chat powered by OpenAI's ChatGPT
- Built with Next.js 15.3.0 & React 19
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

Documentation is generated using TypeDoc and will be created in the `docs` directory. Note that the `docs` directory is excluded from version control to keep the repository lean. Each developer should generate the documentation locally as needed.

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

MIT
