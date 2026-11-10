import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ollamaReady, generateVideoPlan } from './ollama.js';
import { authConfigured, login, logout, requireAuth, sessionStatus } from './auth.js';

const app = express();
const port = Number(process.env.PORT || 8787);
app.use(helmet());
app.use(cors({ origin: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',').map(x => x.trim()) }));
app.use(express.json({ limit: '32kb' }));

app.get('/api/auth/status', sessionStatus);
app.post('/api/auth/login', login);
app.post('/api/auth/logout', logout);

app.get('/api/health', async (_req, res) => {
  const ai = await ollamaReady();
  res.json({ ok: true, service: 'myinfo-video-api', ai, authConfigured: authConfigured(), capabilities: { scriptGeneration: ai.available && ai.modelInstalled, voiceover: false, visualGeneration: false, mp4Rendering: false } });
});

app.post('/api/scripts', requireAuth, async (req, res) => {
  const { topic = '', language = 'Hindi', style = 'Mixed styles', duration = '2 minutes', format = 'Both formats', voicePreference = 'Choose for each video' } = req.body || {};
  if (typeof topic !== 'string' || topic.length > 500) return res.status(400).json({ error: 'Topic must be text under 500 characters.' });
  const ready = await ollamaReady();
  if (!ready.available) return res.status(503).json({ error: 'Local AI is not available.', detail: ready.reason, setup: 'Install Ollama on the machine running this API, download a model, then restart the API.' });
  if (!ready.modelInstalled) return res.status(503).json({ error: 'The configured Ollama model is not installed.', detail: 'Run: ollama pull ' + ready.model });
  try {
    const plan = await generateVideoPlan({ topic, language, style, duration, format, voicePreference });
    res.json({ ok: true, plan, next: 'Script generated. Voice, visual assets and FFmpeg rendering are not configured yet.' });
  } catch (error) {
    console.error('[script-generation]', error);
    res.status(502).json({ error: 'Could not generate the script.', detail: error.message });
  }
});

app.get('/', (_req, res) => res.json({ name: 'MyInfo AI Video Studio API', docs: '/api/health' }));
app.listen(port, () => console.log('MyInfo API listening on http://localhost:' + port));
