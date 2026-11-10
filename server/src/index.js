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

app.get('/api/health', async (_req, res) => {
  const ai = await aiReady();
  res.json({ ok: true, service: 'myinfo-video-api', ai, authConfigured: authConfigured(), capabilities: { scriptGeneration: ai.available, voiceover: false, visualGeneration: Boolean(process.env.POLLINATIONS_API_KEY), mp4Rendering: false } });
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
  if (!prompt || prompt.length > 3000) return res.status(400).json({ error: 'Image prompt must be 1–3000 characters.' });
  const key = process.env.POLLINATIONS_API_KEY || '';
  if (!key) return res.status(503).json({ error: 'AI image generation is not configured.', detail: 'Add a Pollinations API key as POLLINATIONS_API_KEY in Render Environment Variables. Image generation may consume account credits; it is not guaranteed free.' });
  try {
    const model = process.env.POLLINATIONS_IMAGE_MODEL || 'flux';
    const url = 'https://gen.pollinations.ai/image/' + encodeURIComponent(prompt) + '?model=' + encodeURIComponent(model) + '&width=1024&height=1024&nologo=true';
    const imageResponse = await fetch(url, { headers: { Authorization: 'Bearer ' + key }, signal: AbortSignal.timeout(180000) });
    if (!imageResponse.ok) {
      const detail = (await imageResponse.text().catch(() => '')).slice(0, 400);
      return res.status(imageResponse.status === 402 ? 402 : 502).json({ error: 'Image provider request failed.', detail: detail || 'Check Pollinations account balance, key permissions and model access.' });
    }
    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    if (!contentType.startsWith('image/')) return res.status(502).json({ error: 'Image provider returned an unexpected content type.' });
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'private, no-store');
    imageResponse.body.pipeTo(new WritableStream({ write(chunk) { res.write(Buffer.from(chunk)); }, close() { res.end(); }, abort() { res.end(); } })).catch(error => { console.error('[image-generation-stream]', error); if (!res.headersSent) res.status(502).end(); });
  } catch (error) {
    console.error('[image-generation]', error);
    res.status(502).json({ error: 'Image generation failed.', detail: error.message });
  }
});

app.get('/', (_req, res) => res.json({ name: 'MyInfo AI Video Studio API', docs: '/api/health' }));
app.listen(port, () => console.log('MyInfo API listening on port ' + port));
