// src/lib/auth.ts
import prisma from '@/lib/prisma';
import { cookies, headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

export interface AuthSession {
  user: User & { role: string; branch?: string };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
}

export const auth = {
  api: {
    async getSession(options?: { headers?: Headers }): Promise<AuthSession | null> {
      try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        const userCookie = cookieStore.get('user')?.value;

        let userId: string | null = null;

        if (token) {
          try {
            const decoded = jwt.decode(token) as { id: string; email: string; role: string } | null;
            if (decoded?.id) {
              userId = decoded.id;
            }
          } catch (e) {}
        }

        if (!userId && userCookie) {
          try {
            const parsed = JSON.parse(decodeURIComponent(userCookie));
            if (parsed?.id) {
              userId = parsed.id;
            }
          } catch (e) {}
        }

        if (!userId) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return null;
        }

        return {
          user: user as unknown as User & { role: string; branch?: string },
          session: {
            id: user.id,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        };
      } catch (err) {
        console.error('getSession error:', err);
        return null;
      }
    },

    async signInEmail({ body }: { body: { email: string; password: string } }) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
        const res = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          return { user: null, error: result.error || { message: 'Invalid credentials' } };
        }
        return { user: result.data.user, token: result.data.token };
      } catch (err: any) {
        return { user: null, error: { message: err.message || 'Login failed' } };
      }
    },

    async createUser({ body }: { body: any }) {
      const user = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          role: body.role || 'telecaller',
          branch: body.data?.branch || body.branch,
          password: body.password || '',
        },
      });
      return { user };
    },
  },
};

export default auth;
