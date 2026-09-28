// src/actions/auth.ts
'use server';

import { actionClient } from '@/lib/safe-action';
import { auth } from '@/lib/auth';
import { returnValidationErrors } from 'next-safe-action';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { loginSchema, userFormSchema } from '@/schema/user-schema';
import { z } from 'zod';

// Create user action
export const createUserAction = actionClient
  .inputSchema(userFormSchema)
  .action(async ({ parsedInput: { name, email, password, role, branch } }) => {
    const { user } = await auth.api.createUser({
      body: {
        name,
        email,
        password,
        role: role as 'admin' | 'user',
        data: {
          branch,
        },
      },
    });

    if (!user) {
      return returnValidationErrors(userFormSchema, {
        _errors: ['Failed to create user'],
      });
    }

    return {
      success: true,
      message: 'User created successfully',
      user,
    };
  });

// Update user branch action
export const updateUserBranchAction = actionClient
  .inputSchema(
    z.object({
      userId: z.string(),
      branchId: z.string(),
    })
  )
  .action(async ({ parsedInput: { userId, branchId } }) => {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { branch: branchId },
      });

      return {
        success: true,
        message: 'User branch updated successfully',
      };
    } catch (error) {
      console.error('Update user branch error:', error);
      return {
        success: false,
        message: 'Failed to update user branch',
      };
    }
  });

// Update user role action
export const updateUserRoleAction = actionClient
  .inputSchema(
    z.object({
      userId: z.string(),
      role: z.string(),
    })
  )
  .action(async ({ parsedInput: { userId, role } }) => {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { role },
      });

      return {
        success: true,
        message: `User role updated to ${role.toUpperCase()}`,
      };
    } catch (error) {
      console.error('Update user role error:', error);
      return {
        success: false,
        message: 'Failed to update user role',
      };
    }
  });

// Delete user action
export const deleteUserAction = actionClient
  .inputSchema(
    z.object({
      userId: z.string(),
    })
  )
  .action(async ({ parsedInput: { userId } }) => {
    try {
      await prisma.user.delete({
        where: { id: userId },
      });

      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      console.error('Delete user error:', error);
      return {
        success: false,
        message: 'Failed to delete user',
      };
    }
  });

// Update profile action
export const updateProfileAction = actionClient
  .inputSchema(
    z.object({
      name: z.string().min(2),
      email: z.string().email(),
    })
  )
  .action(async ({ parsedInput: { name, email } }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session) {
        return {
          success: false,
          message: 'Unauthorized',
        };
      }

      // Check if email is already taken by another user
      if (email !== session.user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          return {
            success: false,
            message: 'Email is already in use',
          };
        }
      }

      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          name,
          email,
        },
      });

      return {
        success: true,
        message: 'Profile updated successfully',
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        message: 'Failed to update profile',
      };
    }
  });

// Login action
export const loginAction = actionClient
  .inputSchema(loginSchema)
  .action(async ({ parsedInput: { email, password } }) => {
    try {
      // Use better-auth to sign in
      const signInResult = await auth.api.signInEmail({
        body: {
          email,
          password,
        },
      });

      if (!signInResult.user) {
        return returnValidationErrors(loginSchema, {
          _errors: ['Invalid email or password'],
        });
      }

      const user = await prisma.user.findUnique({
        where: { email: signInResult.user.email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          branch: true,
        }
      });

      // The nextCookies plugin will automatically handle setting the session cookies
      return {
        success: true,
        message: 'Login successful',
        data: user,
        redirectTo: '/dashboard',
      };
    } catch (error) {
      console.error('Login error:', error);
      return returnValidationErrors(loginSchema, {
        _errors: ['Invalid email or password'],
      });
    }
  });

// Logout action
export const logoutAction = actionClient.action(async () => {
  // Clear all auth-related cookies
  const cookieStore = await cookies();

  // Clear potential better-auth session cookies
  cookieStore.delete('better-auth.session_token');
  cookieStore.delete('session_token');
  cookieStore.delete('auth.session-token');

  // Redirect to login page
  redirect('/login');
});

export const getAllUsers = async () =>
  await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });

export const getAllRoles = async () =>
  await prisma.role.findMany({
    orderBy: { name: 'asc' },
  });

export const getAllBranches = async () =>
  await prisma.branch.findMany({
    orderBy: { createdAt: 'desc' },
  });
