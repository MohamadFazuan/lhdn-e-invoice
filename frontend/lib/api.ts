import ky, { type KyInstance } from 'ky';
import { useAuthStore } from '@/stores/auth';

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;
      const json = await res.json();
      const token = json.data?.accessToken;
      if (!token) return false;
      useAuthStore.getState().setAccessToken(token);
      return true;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export const api: KyInstance = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
  credentials: 'include',
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (response.status === 401) {
          const refreshed = await tryRefresh();
          if (refreshed) {
            // Retry original request with new token
            const token = useAuthStore.getState().accessToken;
            if (token) {
              request.headers.set('Authorization', `Bearer ${token}`);
            }
            return ky(request);
          } else {
            useAuthStore.getState().logout();
          }
        }
        return response;
      },
    ],
  },
});

export async function apiJson<T>(promise: Promise<Response>): Promise<T> {
  const res = await promise;
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message ?? 'Request failed');
  }
  return json.data as T;
}
