const base = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const model = process.env.OLLAMA_MODEL || 'llama3.2';

export async function ollamaReady() {
  try {
    const response = await fetch(base + '/api/tags', { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return { available: false, model, reason: 'Ollama returned ' + response.status };
    const data = await response.json();
    const models = (data.models || []).map(item => item.name);
    return { available: true, model, installedModels: models, modelInstalled: models.some(name => name === model || name.startsWith(model + ':')) };
  } catch {
    return { available: false, model, reason: 'Cannot reach local Ollama. Install and start Ollama on the backend machine.' };
  }
}

const schema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    language: { type: 'string' },
    estimatedMinutes: { type: 'number' },
    narration: { type: 'string' },
    scenes: { type: 'array', items: { type: 'object', properties: {
      number: { type: 'integer' }, heading: { type: 'string' }, narration: { type: 'string' },
      visualPrompt: { type: 'string' }, onScreenText: { type: 'string' }, seconds: { type: 'integer' }
    }, required: ['number','heading','narration','visualPrompt','onScreenText','seconds'] } }
  },
  required: ['title','description','language','estimatedMinutes','narration','scenes']
};

export async function generateVideoPlan({ topic, language = 'Hindi', style = 'Mixed styles', duration = '2 minutes', format = 'Both formats', voicePreference = 'Choose for each video' }) {
  const subject = topic?.trim() || 'Choose a compelling, well-known educational topic suitable for a general audience';
  const prompt = [
    'Create a complete, original, factual, engaging faceless video production plan.',
    'Return ONLY JSON matching the supplied schema. Do not use markdown fences.',
    'Target runtime: ' + duration + '. Write a concise storytelling voiceover that fits this exact runtime. For 1 minute target about 120–150 Hindi words; for 2 minutes target about 240–300 Hindi words.',
    'The story language MUST be Hindi (Devanagari script) only. Do not write narration in English or Bengali. Style: ' + style + '. Output aspect ratios: ' + format + '. Preferred voice for later voiceover: ' + voicePreference + '.',
    'Topic or topic preference: ' + subject + '.',
    'If no topic is supplied, choose one specific evergreen topic and make the title reflect it.',
    'Create 4–8 short scenes with continuous narration. Each scene needs a detailed visualPrompt suitable for a legal-to-use generated visual, concise onScreenText, and a seconds estimate. Keep scene seconds within the selected total runtime.',
    'Avoid fabricated facts, fake quotations, and copyrighted characters. Mark uncertainty instead of inventing specifics.',
    'The narration field must contain the full continuous voiceover script. Include a hook, clear sections, transitions, and a conclusion.'
  ].join('\n');

  const response = await fetch(base + '/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, format: schema, stream: false, options: { temperature: 0.7 } }),
    signal: AbortSignal.timeout(240000)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error('Ollama request failed (' + response.status + '): ' + detail.slice(0, 300));
  }
  const payload = await response.json();
  let plan;
  try { plan = JSON.parse(payload.response); }
  catch { throw new Error('The selected local model did not return valid structured JSON. Try another Ollama model.'); }
  if (!plan.title || !plan.narration || !Array.isArray(plan.scenes) || plan.scenes.length < 1) {
    throw new Error('The AI response is missing required script or scene fields.');
  }
  return { ...plan, provider: 'Ollama (local)', model };
}
