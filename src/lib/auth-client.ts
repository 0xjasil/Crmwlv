// src/lib/auth-client.ts
'use client';

import { useState, useEffect } from 'react';

export interface UserSessionData {
  id: string;
  name: string;
  email: string;
  role: string;
  branch?: string | null;
}

export function useSession() {
  const [data, setData] = useState<{ user: UserSessionData; session: { id: string } } | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        setData({
          user,
          session: { id: user.id },
        });
      }
    } catch (e) {}
    setIsPending(false);
  }, []);

  return { data, isPending, error: null };
}

export const authClient = {
  useSession,
  async getSession() {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        return { data: { user, session: { id: user.id } }, error: null };
      }
    } catch (e) {}
    return { data: null, error: null };
  },

  signIn: {
    async email({ email, password }: { email: string; password: string }) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
        const res = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          return { data: null, error: { message: result.error?.message || result.message || 'Login failed' } };
        }
        const { user, token } = result.data;
        if (token) {
          localStorage.setItem('token', token);
          document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`;
        }
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
          document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=604800; SameSite=Lax`;
        }
        return { data: { user, token }, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message || 'Network error connecting to backend' } };
      }
    },
  },

  async signOut() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'token=; path=/; max-age=0;';
    document.cookie = 'user=; path=/; max-age=0;';
    window.location.href = '/login';
  },

  async changePassword({ currentPassword, newPassword, revokeOtherSessions }: { currentPassword: string; newPassword: string; revokeOtherSessions?: boolean }) {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const res = await fetch(`${apiUrl}/users/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        return { error: { message: result.error?.message || result.message || 'Failed to change password' } };
      }
      return { data: result.data, error: null };
    } catch (e: any) {
      return { error: { message: e.message } };
    }
  },
};

export default authClient;
