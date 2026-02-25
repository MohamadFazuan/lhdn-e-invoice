'use client';

import { create } from 'zustand';
import type { User, Business, MemberRole, TeamMember } from '@/types/api';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  business: Business | null;
  memberRole: MemberRole | null;
  isLoading: boolean;
  isInitialized: boolean;

  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  setBusiness: (business: Business) => void;
  setMemberRole: (role: MemberRole) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  initialize: () => Promise<void>;
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  business: null,
  memberRole: null,
  isLoading: false,
  isInitialized: false,

  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  setBusiness: (business) => set({ business }),
  setMemberRole: (role) => set({ memberRole: role }),
  setLoading: (isLoading) => set({ isLoading }),

  logout: () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = null;
    set({ accessToken: null, user: null, business: null, memberRole: null });
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  initialize: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true });
    try {
      // Try to refresh the token on app load (uses HttpOnly cookie)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        set({ isInitialized: true, isLoading: false });
        return;
      }
      const json = await res.json();
      const token = json.data?.accessToken;
      if (!token) {
        set({ isInitialized: true, isLoading: false });
        return;
      }
      set({ accessToken: token });
      scheduleRefresh(token, get);

      // Fetch user + business + memberRole in parallel
      const headers = { Authorization: `Bearer ${token}` };
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;

      const [userRes, businessRes] = await Promise.all([
        fetch(`${baseUrl}/api/users/me`, { headers }),
        fetch(`${baseUrl}/api/businesses/me`, { headers }),
      ]);

      if (userRes.ok) {
        const u = await userRes.json();
        set({ user: u.data });
      }

      if (businessRes.ok) {
        const b = await businessRes.json();
        set({ business: b.data });

        // Fetch member role
        const memberRes = await fetch(`${baseUrl}/api/team/me`, { headers });
        if (memberRes.ok) {
          const m: { data: TeamMember } = await memberRes.json();
          set({ memberRole: m.data?.role ?? null });
        }
      }
    } catch {
      // Silently fail — user just not logged in
    } finally {
      set({ isInitialized: true, isLoading: false });
    }
  },
}));

function scheduleRefresh(token: string, get: () => AuthState) {
  if (refreshTimer) clearTimeout(refreshTimer);
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresIn = (payload.exp * 1000 - Date.now()) - 60_000; // 60s before expiry
    if (expiresIn <= 0) return;
    refreshTimer = setTimeout(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const json = await res.json();
          const newToken = json.data?.accessToken;
          if (newToken) {
            get().setAccessToken(newToken);
            scheduleRefresh(newToken, get);
          }
        } else {
          get().logout();
        }
      } catch {
        get().logout();
      }
    }, expiresIn);
  } catch {
    // Invalid token
  }
}
