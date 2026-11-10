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


## Private login setup

The studio now has a login screen and the script-generation endpoint requires a valid signed, HttpOnly session cookie. Credentials are read only from server environment variables; never commit them to GitHub.

Required private API-host variables:
- `ADMIN_USERNAME`: your chosen login ID
- `ADMIN_PASSWORD_HASH`: scrypt hash in `salt:hexhash` format
- `AUTH_SECRET`: long random signing secret
- `FRONTEND_ORIGIN`: exact HTTPS origin of the deployed website

Generate a password hash and signing secret on a trusted computer using `node server/scripts/create-login-secrets.js`, then add the printed values to the API host's private environment settings. The helper asks for a password and requires at least 12 characters. Do not paste passwords or generated secrets into source files, GitHub issues, or chat. The sample `.env.example` contains placeholders only.

The login protection is not active until all three authentication variables are configured on the deployed API. Use HTTPS in production. The browser session is HttpOnly and expires after 12 hours.

## Current voice/video status

Male and female Hindi voice selection is present as a preference in the story brief. Actual text-to-speech audio generation, generated visuals, subtitles as files, and MP4 rendering are not implemented yet. Do not treat the voice selector as a working voice generator.


## AI scene image generation (optional)

The authenticated `POST /api/images` endpoint proxies image requests through Pollinations so the secret stays on the server. The studio has per-scene and generate-all controls. Add these variables privately in Render:

- `POLLINATIONS_API_KEY`: a secret key from Pollinations
- `POLLINATIONS_IMAGE_MODEL`: optional model id; defaults to `flux`

**Cost warning:** Pollinations requires an API key for generation. Usage can consume the account's Pollen/credits; do not assume it is free. Check the current balance and model pricing before generating multiple scenes. Never put the key in frontend code or GitHub. Image generation is optional; without the key, the button returns a clear setup message.

## Current production limits

The browser can preview Hindi narration using device-installed speech voices, but this is not a downloadable audio file and the selected gender cannot be guaranteed. AI image generation is available only after the Pollinations key is configured. MP4 rendering, persistent media storage, and automatic YouTube upload/scheduling are still not implemented. Do not promise a finished MP4 or automated publishing until those components are built and tested.
