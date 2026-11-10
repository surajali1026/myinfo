# MyInfo AI Video Studio

A responsive AI video-production workspace. The initial frontend includes a video brief builder, manual/automatic topic mode selection, style and format controls, project library, and AI service setup status.

## Current status

This commit is a **frontend foundation / UI preview**. It does not yet generate real scripts, voiceovers, AI scenes, or MP4 files. Those require a secure backend and external provider API credentials.

## Run locally

```bash
npm install
npm run dev
```

## Planned architecture

- Frontend: React + Vite
- API/backend: Node.js service
- Job queue: Redis + BullMQ (or managed queue)
- Script generation: configurable LLM provider
- Voice: configurable text-to-speech provider
- Visuals: image/video generation provider
- Rendering: FFmpeg worker
- Storage: S3-compatible object storage
- Database: PostgreSQL

## Video workflow

1. User enters a topic or requests automatic topic discovery.
2. Backend creates a structured 1–2 minute Hindi storytelling script and scene plan.
3. User reviews and approves the script.
4. Workers generate narration, visual assets, subtitles, and music.
5. FFmpeg assembles 16:9 and 9:16 outputs.
6. The user previews and downloads the MP4.

## Security

Never put provider API keys in frontend code or commit them to GitHub. Store secrets as backend environment variables / deployment secrets. Add authentication, quotas, provider-cost limits, copyright checks, and job status handling before public launch.

## Roadmap

- [x] Responsive studio dashboard
- [x] Topic-driven and auto-topic UI modes
- [x] Mixed style and dual-format controls
- [x] Project library preview
- [ ] Backend API and database
- [ ] AI script and scene-plan generation
- [ ] Text-to-speech integration
- [ ] Image/video generation integration
- [ ] FFmpeg rendering workers
- [ ] MP4 preview and export
- [ ] Authentication, quotas, and deployment


## Local AI backend (free, self-hosted)

The frontend currently calls a Node API at `http://localhost:8787`. The API uses Ollama on the same machine for Hindi script and scene-plan generation. This local backend requires a computer and is not suitable for the phone-only target.

1. Install Node.js 20+ and Ollama on a computer.
2. In a terminal, run `ollama pull llama3.2`.
3. In one terminal: `cd server && npm install && cp .env.example .env && npm run dev`.
4. In another terminal, at the repository root: `npm install && npm run dev`.
5. Open the Vite URL and generate a script.

The local API is not hosted by GitHub Pages. To use the site from a phone, deploy the frontend and API separately and keep the API private/authenticated. Ollama must run on the backend host; do not expose its port publicly.

### Current implementation status

- [x] Frontend topic/manual and auto-topic modes
- [x] Local Ollama health check and structured script/scene-plan generation
- [x] Script and scene preview in the UI
- [ ] Durable projects and background job queue
- [ ] Free/local text-to-speech integration
- [ ] Visual asset generation / licensed media sourcing
- [ ] FFmpeg landscape and portrait MP4 rendering
- [ ] Hosted deployment, authentication and usage limits

**Important:** This is not yet a one-click finished-video generator. The current AI stage creates a Hindi script and scene plan only. Voiceover, visual assets and MP4 rendering still need implementation and local compute/storage.


## Updated short-story direction (November 2026)

- Story and narration language: Hindi only (Devanagari).
- Video duration choices: 1 minute or 2 minutes.
- Target narration length: approximately 120–150 Hindi words for 1 minute and 240–300 for 2 minutes.
- The current Ollama backend still requires a computer. A phone-friendly hosted generation and rendering workflow has not yet been implemented.
