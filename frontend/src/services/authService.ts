import type { AuthCredentials, Session, User } from '../types';

/**
 * Auth Service
 * Talks to the FastAPI /auth endpoints (proxied under /api).
 */

const TOKEN_KEY = 'auth_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

interface BackendUser {
  id: string;
  email: string;
  full_name: string;
  scans_remaining: number;
  created_at: string;
}

interface BackendAuthResponse {
  user: BackendUser;
  token: string;
}

const mapUser = (u: BackendUser): User => ({
  id: u.id,
  email: u.email,
  name: u.full_name,
  tier: 'FREE',
  scansRemaining: u.scans_remaining,
});

const request = async (path: string, body: unknown): Promise<BackendAuthResponse> => {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
};

export const authService = {
  async login(credentials: AuthCredentials): Promise<Session> {
    const data = await request('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    return { user: mapUser(data.user), isAuthenticated: true, token: data.token };
  },

  async signup(credentials: AuthCredentials): Promise<Session> {
    const data = await request('/auth/signup', {
      email: credentials.email,
      password: credentials.password,
      full_name: credentials.fullName,
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    return { user: mapUser(data.user), isAuthenticated: true, token: data.token };
  },

  async logout(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
  },

  async getCurrentSession(): Promise<Session | null> {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }

    const user: BackendUser = await response.json();
    return { user: mapUser(user), isAuthenticated: true, token };
  },
};
