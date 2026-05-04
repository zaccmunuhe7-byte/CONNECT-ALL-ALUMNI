const API_URL = import.meta.env.VITE_API_URL ?? '';

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: 'USER' | 'ADMIN' };
};

let accessToken = localStorage.getItem('accessToken') ?? '';

export function setAccessToken(token: string) {
  accessToken = token;
  localStorage.setItem('accessToken', token);
}

export function clearAccessToken() {
  accessToken = '';
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(payload.error?.message ?? 'Request failed');
  }

  return response.json();
}

export { API_URL };
