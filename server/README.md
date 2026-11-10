# MyInfo AI Video Studio — API

## Important: what “free” means

This first backend uses **Ollama running locally** for script and scene-plan generation. Ollama's local HTTP API does not require a paid API key. It still uses your own computer's CPU/RAM/GPU and electricity. It is not a hosted cloud service, and a phone-only workflow cannot run this backend reliably by itself.

The current backend generates a structured script and scene plan only. Voiceover, image/video generation, stock-media licensing checks, FFmpeg rendering, persistent jobs, and MP4 exports are not implemented yet. No fake “video complete” status is shown.

## Requirements

- Node.js 20+
- Ollama installed on the same machine as this API
- A model downloaded, e.g. `ollama pull llama3.2`
- For later rendering: FFmpeg, a speech engine such as Piper, and licensed/generated visual assets

## Run

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Check `http://localhost:8787/api/health`.

## API

- `GET /api/health` — service and local model status
- `POST /api/scripts` — generate a script and scene plan

Example request:

```json
{
  "topic": "The history of the pyramids",
  "language": "English",
  "style": "Mixed styles",
  "duration": "10–15 minutes",
  "format": "Both formats"
}
```

## Connect the frontend

Set `VITE_API_BASE_URL=http://localhost:8787` in the frontend environment. Do not expose secret provider keys in Vite variables. Vite variables are public in the browser bundle.

## Production security checklist

Before public deployment, add authentication, per-user quotas, durable job queue and database, request rate limits, secure CORS allowlist, file validation, storage lifecycle rules, moderation, cost ceilings, and server-side secret management. Do not expose Ollama directly to the public internet.
