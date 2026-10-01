const API_URL = import.meta.env.VITE_API_URL || '';

export function apiUrl(path) {
  return `${API_URL}${path}`;
}

export async function api(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Une erreur est survenue.');
    error.status = response.status;
    throw error;
  }
  return data;
}
