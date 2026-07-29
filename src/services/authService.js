/**
 * Auth Service — centralised JWT token management & authenticated fetch wrapper.
 *
 * Token retention policy:
 *   • Access token  — 1 hour, stored in memory + localStorage
 *   • Refresh token — 7 days, httpOnly cookie named "refreshToken" (set by backend)
 */

import { API_BASE_URL } from '../config/api';

// ── In-memory token (survives hot-reloads, cleared on full page reload) ──────
let accessToken = localStorage.getItem('ur2_token') || null;

// ── Public helpers ───────────────────────────────────────────────────────────

export function getAccessToken() {
  return accessToken || localStorage.getItem('ur2_token') || null;
}

export function setAccessToken(token) {
  accessToken = token;
  if (token) {
    localStorage.setItem('ur2_token', token);
  } else {
    localStorage.removeItem('ur2_token');
  }
}

export function clearAuth() {
  accessToken = null;
  localStorage.removeItem('ur2_token');
  localStorage.removeItem('ur2_user');
}

// ── Refresh ──────────────────────────────────────────────────────────────────

let refreshPromise = null; // de-dupe concurrent refresh calls

export async function refreshAccessToken() {
  // If a refresh is already in flight, piggy-back on it.
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // sends the httpOnly refreshToken cookie
      });

      if (!res.ok) {
        throw new Error('Refresh failed');
      }

      const data = await res.json();
      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch {
      // Refresh token invalid / expired — force re-login.
      clearAuth();
      window.location.href = '/login';
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ── Authenticated fetch wrapper ──────────────────────────────────────────────

/**
 * Drop-in replacement for `fetch` that:
 *  1. Attaches the `Authorization: Bearer <token>` header.
 *  2. Sends `credentials: 'include'` so the refresh cookie travels.
 *  3. On a 401 response, silently refreshes the access token and retries once.
 */
export async function authFetch(url, options = {}) {
  const token = getAccessToken();

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    // Attempt a silent refresh and retry the original request once.
    const newToken = await refreshAccessToken();
    if (!newToken) return res; // refresh failed, bail

    const retryHeaders = {
      ...(options.headers || {}),
      Authorization: `Bearer ${newToken}`,
    };

    return fetch(url, {
      ...options,
      headers: retryHeaders,
      credentials: 'include',
    });
  }

  return res;
}

// ── SSE helpers ──────────────────────────────────────────────────────────────

/** Returns headers suitable for @microsoft/fetch-event-source. */
export function getSSEHeaders() {
  const token = getAccessToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
