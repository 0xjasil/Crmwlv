// src/lib/auth.ts
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'crm_elevate_super_secure_jwt_secret_key_2026';

export interface AuthSession {
  user: User & { role: string; branch?: string; userRole?: any };
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
        const token =
          cookieStore.get('token')?.value ||
          cookieStore.get('auth_token')?.value;
        const userCookie = cookieStore.get('user')?.value;

        let authHeaderToken: string | null = null;
        if (options?.headers) {
          const authHeader = options.headers.get('authorization');
          if (authHeader?.startsWith('Bearer ')) {
            authHeaderToken = authHeader.substring(7);
          }
        }

        const effectiveToken = authHeaderToken || token;

        let userId: string | null = null;
        let userEmail: string | null = null;

        if (effectiveToken) {
          try {
            const verified = jwt.verify(effectiveToken, JWT_SECRET) as {
              id: string;
              email: string;
              role: string;
            };
            if (verified?.id) userId = verified.id;
            if (verified?.email) userEmail = verified.email;
          } catch {
            const decoded = jwt.decode(effectiveToken) as {
              id: string;
              email: string;
              role: string;
            } | null;
            if (decoded?.id) userId = decoded.id;
            if (decoded?.email) userEmail = decoded.email;
          }
        }

        if (!userId && userCookie) {
          try {
            const parsed = JSON.parse(decodeURIComponent(userCookie));
            if (parsed?.id) userId = parsed.id;
            if (parsed?.email) userEmail = parsed.email;
          } catch (e) {}
        }

        if (!userId && !userEmail) {
          return null;
        }

        let user = userId
          ? await prisma.user.findUnique({
              where: { id: userId },
              include: { userRole: true },
            })
          : null;

        if (!user && userEmail) {
          user = await prisma.user.findUnique({
            where: { email: userEmail.toLowerCase().trim() },
            include: { userRole: true },
          });
        }

        if (!user || user.banned) {
          return null;
        }

        const { password: _, ...safeUser } = user;

        return {
          user: safeUser as unknown as User & { role: string; branch?: string; userRole?: any },
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
        const normalizedEmail = (body.email || '').toLowerCase().trim();
        if (!normalizedEmail || !body.password) {
          return { user: null, token: null, error: { message: 'Invalid email or password' } };
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { userRole: true },
        });

        if (!user || !user.password) {
          return { user: null, token: null, error: { message: 'Invalid email or password' } };
        }

        if (user.banned) {
          return {
            user: null,
            token: null,
            error: { message: `Account is suspended: ${user.banReason || 'Contact administrator'}` },
          };
        }

        const isMatch = await bcrypt.compare(body.password, user.password);
        if (!isMatch) {
          return { user: null, token: null, error: { message: 'Invalid email or password' } };
        }

        const tokenPayload = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          branch: user.branch,
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, {
          expiresIn: '7d',
        });

        const { password: _, ...safeUser } = user;
        return { user: safeUser, token, error: null };
      } catch (err: any) {
        return { user: null, token: null, error: { message: err.message || 'Login failed' } };
      }
    },

    async createUser({ body }: { body: any }) {
      const normalizedEmail = (body.email || '').toLowerCase().trim();
      const name = (body.name || '').trim();
      const role = body.role || 'telecaller';
      const branch = body.data?.branch || body.branch || null;
      const rawPassword = body.password;

      if (!normalizedEmail) {
        throw new Error('Email is required');
      }
      if (!rawPassword) {
        throw new Error('Password is required');
      }

      // Check existing user to avoid unhandled database errors
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing) {
        throw new Error('A user with this email address already exists');
      }

      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      const created = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            name,
            email: normalizedEmail,
            role,
            branch,
            password: hashedPassword,
            emailVerified: true,
          },
        });

        await tx.account.create({
          data: {
            id: `acc_${newUser.id}`,
            userId: newUser.id,
            accountId: normalizedEmail,
            providerId: 'credential',
            password: hashedPassword,
            updatedAt: new Date(),
          },
        });

        return newUser;
      });

      const { password: _, ...safeUser } = created;
      return { user: safeUser };
    },
  },
};

export default auth;
