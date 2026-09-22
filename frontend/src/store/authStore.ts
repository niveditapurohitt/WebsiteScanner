import { create } from 'zustand';
import type { AuthCredentials, Session } from '../types';
import { authService } from '../services/authService';

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: AuthCredentials) => Promise<void>;
  signup: (credentials: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
  setScansRemaining: (scansRemaining: number) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  error: null,
  login: async (credentials) => {
    set({ error: null });
    try {
      const session = await authService.login(credentials);
      set({ session });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Login failed' });
      throw e;
    }
  },
  signup: async (credentials) => {
    set({ error: null });
    try {
      const session = await authService.signup(credentials);
      set({ session });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Signup failed' });
      throw e;
    }
  },
  logout: async () => {
    await authService.logout();
    set({ session: null });
  },
  checkSession: async () => {
    try {
      const session = await authService.getCurrentSession();
      set({ session, isLoading: false });
    } catch (e) {
      set({ session: null, isLoading: false });
    }
  },
  clearError: () => set({ error: null }),
  setScansRemaining: (scansRemaining) => set((state) => (
    state.session ? { session: { ...state.session, user: { ...state.session.user, scansRemaining } } } : state
  )),
}));
