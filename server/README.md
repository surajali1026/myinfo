# MyInfo AI Video Studio — API

## Important: free-tier limits and current scope

The backend generates a structured Hindi script and scene plan. It can generate scene images through Cloudflare Workers AI when the Cloudflare credentials are configured. Voiceover audio files, subtitles as downloadable files, FFmpeg MP4 rendering, persistent media storage, and automatic YouTube upload/scheduling are not implemented yet.

Cloudflare Workers AI's Free Workers plan currently includes 10,000 Neurons per day at no charge. The daily allowance resets at 00:00 UTC. When the free allowance is exceeded, further requests fail unless the account is moved to a paid plan. This application does not enable paid billing, prepaid credits, or paid fallback providers. Free quotas and provider terms can change; check Cloudflare's current pricing before use.

Image provider: `@cf/black-forest-labs/flux-1-schnell`. The model's documented REST request accepts a prompt and steps (up to 8); this integration uses 4 steps. The model endpoint's documented input does not expose a width/height setting, so the requested format is included as composition guidance in the prompt, not a guaranteed pixel-dimension switch.

## Requirements

- Node.js 20+
- Cloudflare account with Workers AI available on the Free plan
- Cloudflare Account ID and API token with Workers AI access
- Existing script-generation provider configuration

## Run

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Check `http://localhost:8787/api/health`.

## API

- `GET /api/health` — service, script model and image-provider configuration status
- `POST /api/scripts` — generate a script and scene plan
- `POST /api/images` — authenticated Cloudflare FLUX.1 schnell image generation

## Connect the frontend

Set `VITE_API_BASE_URL=http://localhost:8787` in the frontend environment. Do not expose provider keys in Vite variables or browser code.

## Production security checklist

Before public deployment, add per-user quotas, durable job queue and database, request rate limits, secure CORS allowlist, file validation, storage lifecycle rules, moderation, and cost ceilings. Keep provider secrets only in the API host's private environment settings.

## Private login setup

The studio uses a login screen and script/image endpoints require a valid signed, HttpOnly session cookie. Credentials are read only from server environment variables; never commit them to GitHub.

Required private API-host variables:
- `ADMIN_USERNAME`: your chosen login ID
- `ADMIN_PASSWORD_HASH`: scrypt hash in `salt:hexhash` format (or use the supported private password variable already configured on your host)
- `AUTH_SECRET`: long random signing secret
- `FRONTEND_ORIGIN`: exact HTTPS origin of the deployed website

Do not paste passwords or generated secrets into source files, GitHub issues, or chat. Use HTTPS in production. The browser session is HttpOnly and expires after 12 hours.

## Cloudflare Workers AI image setup

Add these two variables privately in Render → your API service → Environment:

- `CLOUDFLARE_ACCOUNT_ID`: your Cloudflare Account ID
- `CLOUDFLARE_API_TOKEN`: a private API token with Workers AI access

Use Cloudflare's Free Workers plan only. Do not enable Workers Paid, add prepaid AI Gateway credits, or configure a paid fallback. The server calls the documented Cloudflare REST endpoint and never exposes the token to the browser. Check `GET /api/health`: `capabilities.visualGeneration` becomes true when both variables are present.

Cloudflare documents 10,000 Neurons/day on the Free plan and says requests fail after the free limit is reached. Rate and allowance are subject to Cloudflare changes. Image generation is not guaranteed to meet a fixed daily video count.

## Current voice/video status

The browser can preview Hindi narration using device-installed speech voices, but this is not a downloadable audio file and the selected gender cannot be guaranteed. Actual text-to-speech audio generation, subtitle exports, MP4 rendering, persistent media storage, and automatic YouTube upload/scheduling are not implemented. Do not promise a finished MP4 or automated publishing until those components are built and tested.
