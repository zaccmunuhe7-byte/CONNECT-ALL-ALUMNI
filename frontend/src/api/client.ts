const API_URL = import.meta.env.VITE_API_URL ?? '';

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: 'USER' | 'ADMIN'; fullName?: string };
};

let accessToken = localStorage.getItem('accessToken') ?? '';
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string) {
  accessToken = token;
  localStorage.setItem('accessToken', token);
}

export function clearAccessToken() {
  accessToken = '';
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('session');
}

export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers as Record<string, string> }
  });
  if (!response.ok) {
    // Only trigger auto-logout for 401 on non-auth endpoints (auth endpoints
    // return 401/403 for wrong password, suspended accounts, etc.)
    const isAuthEndpoint = path.startsWith('/api/auth/');
    if (response.status === 401 && onUnauthorized && !isAuthEndpoint && accessToken) {
      // Token expired or invalid — force logout
      onUnauthorized();
      throw new Error('Session expired. Please login again.');
    }
    const payload = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(payload.error?.message ?? 'Request failed');
  }
  return response.json();
}

export async function uploadFile(file: File, endpoint = '/api/upload'): Promise<{ url: string; fileType: string }> {
  const form = new FormData();
  form.append('file', file);
  return api(endpoint, { method: 'POST', body: form });
}

export { API_URL };
