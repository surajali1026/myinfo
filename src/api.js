const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787').replace(/\/$/, '');
export async function getApiHealth() {
  const response = await fetch(API_BASE + '/api/health');
  if (!response.ok) throw new Error('API server is not responding.');
  return response.json();
}
export async function generateScript(options) {
  const response = await fetch(API_BASE + '/api/scripts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.error || 'Script generation failed.');
  return data;
}
