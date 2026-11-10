const apiKey = process.env.GEMINI_API_KEY || '';
const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

export async function aiReady() {
  return {
    available: Boolean(apiKey),
    provider: 'Google Gemini API',
    model,
    reason: apiKey ? undefined : 'GEMINI_API_KEY is not configured on the server.'
  };
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

export async function generateVideoPlan({ topic, language = 'Hindi', style = 'Mixed styles', duration = '8–12 minutes', format = 'Both formats', voicePreference = 'Choose for each video' }) {
  if (!apiKey) throw new Error('Gemini API is not configured. Add GEMINI_API_KEY in Render environment variables.');
  const subject = topic?.trim() || 'Choose a compelling, well-known educational topic suitable for a general audience';
  const prompt = [
    'Create a complete, original, factual, engaging faceless video production plan.',
    'Return ONLY valid JSON matching this schema: ' + JSON.stringify(schema),
    'Target runtime: ' + duration + '. This is a long-form 8–12 minute video. Target approximately 1,000–1,400 natural Hindi words in Devanagari, with enough detail and pauses for a genuine 8–12 minute narration. Do not compress the script into a short summary. If a different duration is explicitly requested, scale the narration length proportionally.',
    'The story language MUST be Hindi (Devanagari script) only. Do not write narration in English or Bengali. Visual style: ' + style + '. If the selected style is Mixed styles (auto by story), choose the most suitable visual treatment for each scene from realistic documentary, 3D animation, and cinematic storytelling based on the story content, while keeping character and visual continuity. If a single style is selected, apply it consistently to every scene. Output aspect ratios: ' + format + '. Preferred voice for later voiceover: ' + voicePreference + '.',
    'Topic or topic preference: ' + subject + '.',
    'If no topic is supplied, choose one specific evergreen topic and make the title reflect it.',
    'Create 18–28 cinematic scenes for an 8–12 minute video, with each scene generally lasting 15–35 seconds. Each scene needs a detailed realistic visualPrompt suitable for an original generated visual, concise onScreenText, and a seconds estimate. Keep scene seconds adding up to the selected total runtime. Maintain visual continuity for recurring people, locations, wardrobe, lighting and color grade. Vary shot types (wide, medium, close-up, aerial, macro) and describe subtle camera movement suitable for later animation.',
    'Research discipline: do not invent facts, dates, quotations, statistics or sources. Distinguish established facts from uncertainty. Do not copy another creator’s wording or structure; produce an original educational explanation. Do not use copyrighted characters, logos or recognizable film scenes.',
    'The narration field must contain the full continuous voiceover script. Include a hook, clear sections, transitions, and a conclusion.'
  ].join('\n');

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
    }),
    signal: AbortSignal.timeout(120000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || 'Gemini request failed (' + response.status + ').';
    throw new Error(message.slice(0, 500));
  }
  const output = payload.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
  if (!output) throw new Error('Gemini returned an empty response. Please try again.');
  let plan;
  try { plan = JSON.parse(output); }
  catch { throw new Error('Gemini did not return valid JSON. Please try again.'); }
  if (!plan.title || !plan.narration || !Array.isArray(plan.scenes) || plan.scenes.length < 1) {
    throw new Error('The AI response is missing required script or scene fields.');
  }
  return { ...plan, provider: 'Google Gemini API', model };
}
