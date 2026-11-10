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
2. Backend creates a structured 10–15 minute script and scene plan.
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
