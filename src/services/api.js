const BASE_URL = import.meta.env.VITE_API_URL || 'https://api.summs.example.com';

async function request(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  get: (path, token) => request(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
  post: (path, body, token) => request(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }),
};
