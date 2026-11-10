import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { aiReady, generateVideoPlan } from './ollama.js';
import { authConfigured, login, logout, requireAuth, sessionStatus } from './auth.js';

const app = express();
const port = Number(process.env.PORT || 8787);
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',').map(x => x.trim()).filter(Boolean);
app.use(helmet());
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS.'));
}, credentials: true }));
app.use(express.json({ limit: '32kb' }));

app.get('/api/auth/status', sessionStatus);
app.post('/api/auth/login', login);
app.post('/api/auth/logout', logout);

const cloudflareImagesConfigured = () => Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);

app.get('/api/health', async (_req, res) => {
  const ai = await aiReady();
  res.json({
    ok: true,
    service: 'myinfo-video-api',
    ai,
    authConfigured: authConfigured(),
    capabilities: {
      scriptGeneration: ai.available,
      voiceover: false,
      visualGeneration: cloudflareImagesConfigured(),
      imageProvider: cloudflareImagesConfigured() ? 'Cloudflare Workers AI (FLUX.1 schnell)' : null,
      mp4Rendering: false
    }
  });
});

app.post('/api/scripts', requireAuth, async (req, res) => {
  const { topic = '', language = 'Hindi', style = 'Mixed styles', duration = '2 minutes', format = 'Both formats', voicePreference = 'Choose for each video' } = req.body || {};
  if (typeof topic !== 'string' || topic.length > 500) return res.status(400).json({ error: 'Topic must be text under 500 characters.' });
  const ready = await aiReady();
  if (!ready.available) return res.status(503).json({ error: 'AI service is not configured.', detail: ready.reason });
  try {
    const plan = await generateVideoPlan({ topic, language, style, duration, format, voicePreference });
    res.json({ ok: true, plan, next: 'Script generated. Voice, visual assets and MP4 rendering are not configured yet.' });
  } catch (error) {
    console.error('[script-generation]', error);
    res.status(502).json({ error: 'Could not generate the script.', detail: error.message });
  }
});

app.post('/api/images', requireAuth, async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const format = typeof req.body?.format === 'string' ? req.body.format : '';
  if (!prompt || prompt.length > 2048) return res.status(400).json({ error: 'Image prompt must be 1–2048 characters.' });

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) {
    return res.status(503).json({
      error: 'Free image generation is not connected yet.',
      detail: 'Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in Render Environment. Do not add a paid plan or prepaid credits.'
    });
  }

  try {
    const composition = format.includes('Vertical')
      ? ' Compose the scene for a vertical 9:16 portrait crop, with the main subject centered and safe margins.'
      : format.includes('landscape')
        ? ' Compose the scene for a horizontal 16:9 landscape crop, with the main subject centered and safe margins.'
        : ' Compose the scene with the main subject centered and safe margins.';
    const response = await fetch(
      'https://api.cloudflare.com/client/v4/accounts/' + encodeURIComponent(accountId) + '/ai/run/@cf/black-forest-labs/flux-1-schnell',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt + composition, steps: 4 }),
        signal: AbortSignal.timeout(180000)
      }
    );
    const payload = await response.json().catch(() => ({}));
    const base64 = payload?.result?.image;
    if (!response.ok || !payload.success || typeof base64 !== 'string' || !base64) {
      const detail = Array.isArray(payload.errors) ? payload.errors.map(e => e.message).join('; ') : '';
      const status = response.status === 429 ? 429 : response.status === 401 || response.status === 403 ? response.status : 502;
      return res.status(status).json({
        error: 'Cloudflare image generation failed.',
        detail: detail || 'Check the Cloudflare account ID, API token permissions, and daily free Workers AI allowance. Paid usage is not enabled by this app.'
      });
    }
    const image = Buffer.from(base64, 'base64');
    res.set('Content-Type', 'image/jpeg');
    res.set('Content-Length', String(image.length));
    res.set('Cache-Control', 'private, no-store');
    return res.send(image);
  } catch (error) {
    console.error('[cloudflare-image-generation]', error);
    return res.status(502).json({ error: 'Cloudflare image generation failed.', detail: error.name === 'TimeoutError' ? 'The image request timed out. Please try again.' : error.message });
  }
});

app.get('/', (_req, res) => res.json({ name: 'MyInfo AI Video Studio API', docs: '/api/health' }));
app.listen(port, () => console.log('MyInfo API listening on port ' + port));
