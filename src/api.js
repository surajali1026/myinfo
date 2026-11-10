const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://myinfo-zulr.onrender.com').replace(/\/$/, '');
async function request(path, options = {}) {
  const response = await fetch(API_BASE + path, { credentials: 'include', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.error || 'Request failed.');
  return data;
}
export async function getApiHealth() { return request('/api/health'); }
export async function getAuthStatus() { return request('/api/auth/status'); }
export async function login(id, password) {
  return request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, password }) });
}
export async function logout() { return request('/api/auth/logout', { method: 'POST' }); }
export async function generateScript(options) {
  return request('/api/scripts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(options) });
}

export async function generateSceneImage(prompt, format = 'YouTube landscape (16:9)') {
  const response = await fetch(API_BASE + '/api/images', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, format })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || data.error || 'Image generation failed.');
  }
  return URL.createObjectURL(await response.blob());
}
