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
app.use(express.json({ limit: '64kb' }));

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
      voiceover: Boolean(process.env.GEMINI_API_KEY),
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


app.post('/api/voice', requireAuth, async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  const voice = req.body?.voice === 'female' ? 'Kore' : 'Puck';
  if (!text || text.length > 12000) return res.status(400).json({ error: 'Narration must be between 1 and 12000 characters.' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: 'Gemini API is not configured.' });
  try {
    const model = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Read the following Hindi narration naturally and clearly in Hindi. Do not translate, summarize, or add words.\n\n' + text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
        }
      }),
      signal: AbortSignal.timeout(180000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload.error?.message || 'Gemini TTS request failed (' + response.status + ').';
      const status = response.status === 429 ? 429 : response.status === 401 || response.status === 403 ? response.status : 502;
      return res.status(status).json({ error: 'Hindi voice generation failed.', detail: message.slice(0, 500) });
    }
    const parts = payload.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find(part => part.inlineData?.data && part.inlineData?.mimeType?.toLowerCase().includes('audio'));
    if (!audioPart) return res.status(502).json({ error: 'Gemini returned no audio.', detail: 'Try a shorter narration or check the TTS model availability for your API key.' });
    const pcm = Buffer.from(audioPart.inlineData.data, 'base64');
    const sampleRateMatch = /rate=(\\d+)/i.exec(audioPart.inlineData.mimeType || '');
    const sampleRate = sampleRateMatch ? Number(sampleRateMatch[1]) : 24000;
    const wavHeader = Buffer.alloc(44);
    wavHeader.write('RIFF', 0); wavHeader.writeUInt32LE(36 + pcm.length, 4); wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12); wavHeader.writeUInt32LE(16, 16); wavHeader.writeUInt16LE(1, 20);
    wavHeader.writeUInt16LE(1, 22); wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(sampleRate * 2, 28); wavHeader.writeUInt16LE(2, 32);
    wavHeader.writeUInt16LE(16, 34); wavHeader.write('data', 36); wavHeader.writeUInt32LE(pcm.length, 40);
    res.set('Content-Type', 'audio/wav');
    res.set('Content-Length', String(wavHeader.length + pcm.length));
    res.set('Cache-Control', 'private, no-store');
    return res.send(Buffer.concat([wavHeader, pcm]));
  } catch (error) {
    console.error('[gemini-tts]', error);
    return res.status(502).json({ error: 'Hindi voice generation failed.', detail: error.name === 'TimeoutError' ? 'The voice request timed out. Try a shorter script.' : error.message });
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
