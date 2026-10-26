// src/lib/actions/auth.ts
'use server';

import { actionClient } from '@/lib/safe-action';
import { auth } from '@/lib/auth';
import { returnValidationErrors } from 'next-safe-action';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { loginSchema, userFormSchema } from '@/schema/user-schema';
import { z } from 'zod';
import { SOFTWARE_POSITIONS } from '@/constants/permissions';
import { cacheService } from '@/lib/cache/cache-service';

/**
 * Ensures standard CRM software positions are populated in the database.
 */
async function ensureStandardRolesExist() {
  try {
    for (const pos of SOFTWARE_POSITIONS) {
      const existing = await prisma.role.findFirst({
        where: {
          OR: [{ id: `role_${pos.id}` }, { name: pos.id }],
        },
      });

      if (!existing) {
        await prisma.role.create({
          data: {
            id: `role_${pos.id}`,
            name: pos.id,
            description: pos.description,
            permissions: pos.defaultPermissions,
            updatedAt: new Date(),
          },
        });
      }
    }
  } catch (err) {
    console.error('Error syncing standard software positions:', err);
  }
}

// Create user action
export const createUserAction = actionClient
  .inputSchema(userFormSchema)
  .action(async ({ parsedInput: { name, email, password, role, branch, permissions } }) => {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Check duplicate early to return clean validation error
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing) {
        return returnValidationErrors(userFormSchema, {
          email: {
            _errors: ['A user with this email address already exists'],
          },
        });
      }

      await ensureStandardRolesExist();

      const defaultPos = SOFTWARE_POSITIONS.find((p) => p.id === role);
      const effectivePermissions =
        permissions && permissions.length > 0
          ? permissions
          : defaultPos?.defaultPermissions || ['dashboard'];

      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user, custom role (if customized), and credential account record atomically
      const createdUser = await prisma.$transaction(async (tx) => {
        let roleRecord = await tx.role.findFirst({
          where: {
            OR: [{ id: `role_${role}` }, { name: role }],
          },
        });

        const isCustomPermissions =
          permissions &&
          permissions.length > 0 &&
          JSON.stringify(permissions.sort()) !== JSON.stringify((defaultPos?.defaultPermissions || []).sort());

        const newUser = await tx.user.create({
          data: {
            name: name.trim(),
            email: normalizedEmail,
            role,
            branch: branch || null,
            password: hashedPassword,
            emailVerified: true,
          },
        });

        let targetRoleId = roleRecord?.id;

        if (isCustomPermissions) {
          const customRole = await tx.role.create({
            data: {
              id: `role_${newUser.id}`,
              name: `${role}_${newUser.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
              description: `Custom permissions for ${newUser.name}`,
              permissions: effectivePermissions,
              updatedAt: new Date(),
            },
          });
          targetRoleId = customRole.id;
        }

        if (targetRoleId) {
          await tx.user.update({
            where: { id: newUser.id },
            data: {
              roleId: targetRoleId,
            },
          });
        }

        // Create credential account record for Better-Auth compatibility
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

        return tx.user.findUnique({
          where: { id: newUser.id },
          include: { userRole: true },
        });
      });

      if (!createdUser) {
        return returnValidationErrors(userFormSchema, {
          _errors: ['Failed to create user account'],
        });
      }

      const { password: _, ...safeUser } = createdUser;

      return {
        success: true,
        message: `User account created successfully with ${defaultPos?.title || role} access`,
        user: safeUser,
      };
    } catch (error: any) {
      console.error('Create user action error:', error);
      return returnValidationErrors(userFormSchema, {
        _errors: [error.message || 'An error occurred while creating the user'],
      });
    }
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

      await cacheService.delete(`user:${userId}`);

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

// Update user role and permissions action
export const updateUserRoleAction = actionClient
  .inputSchema(
    z.object({
      userId: z.string(),
      role: z.string(),
    })
  )
  .action(async ({ parsedInput: { userId, role } }) => {
    try {
      await ensureStandardRolesExist();

      const defaultPos = SOFTWARE_POSITIONS.find((p) => p.id === role);
      const roleRecord = await prisma.role.findFirst({
        where: {
          OR: [{ id: `role_${role}` }, { name: role }],
        },
      });

      await prisma.user.update({
        where: { id: userId },
        data: {
          role,
          ...(roleRecord ? { roleId: roleRecord.id } : {}),
        },
      });

      await cacheService.delete(`user:${userId}`);

      return {
        success: true,
        message: `User position updated to ${defaultPos?.title || role.toUpperCase()}`,
      };
    } catch (error) {
      console.error('Update user role error:', error);
      return {
        success: false,
        message: 'Failed to update user position',
      };
    }
  });

// Granular permissions configuration action
export const updateUserPermissionsAction = actionClient
  .inputSchema(
    z.object({
      userId: z.string(),
      role: z.string().optional(),
      permissions: z.array(z.string()),
    })
  )
  .action(async ({ parsedInput: { userId, role, permissions } }) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { userRole: true },
      });

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const activeRoleSlug = role || user.role || 'custom';

      // Check if user already has their own dedicated role or standard role
      let targetRoleId = user.roleId;

      if (user.userRole && user.userRole.id === `role_${userId}`) {
        // Update user's dedicated role permissions directly
        await prisma.role.update({
          where: { id: user.userRole.id },
          data: {
            name: `${activeRoleSlug}_${user.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            permissions,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create or assign a dedicated role record for this user with exact custom permissions
        const customRole = await prisma.role.upsert({
          where: { id: `role_${userId}` },
          create: {
            id: `role_${userId}`,
            name: `${activeRoleSlug}_${user.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            description: `Custom permissions for ${user.name}`,
            permissions,
            updatedAt: new Date(),
          },
          update: {
            name: `${activeRoleSlug}_${user.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            permissions,
            updatedAt: new Date(),
          },
        });
        targetRoleId = customRole.id;
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          role: activeRoleSlug,
          roleId: targetRoleId,
        },
      });

      // Clear caches
      await cacheService.delete(`user:${userId}`);
      if (user.email) {
        await cacheService.delete(`user:email:${user.email}`);
      }

      return {
        success: true,
        message: `Access permissions for ${user.name} successfully updated (${permissions.length} modules active)`,
      };
    } catch (error: any) {
      console.error('Update user permissions error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update access permissions',
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
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!targetUser) {
        return { success: false, message: 'User not found' };
      }

      if (targetUser.role === 'admin' || targetUser.email === 'admin@elevate.com') {
        return {
          success: false,
          message: 'Security policy: The primary administrator account cannot be deleted',
        };
      }

      await prisma.user.delete({
        where: { id: userId },
      });

      await cacheService.delete(`user:${userId}`);
      if (targetUser.email) {
        await cacheService.delete(`user:email:${targetUser.email}`);
      }

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

      await cacheService.delete(`user:${session.user.id}`);
      await cacheService.delete(`user:email:${email}`);

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
      const signInResult = await auth.api.signInEmail({
        body: {
          email,
          password,
        },
      });

      if (!signInResult.user || !signInResult.token) {
        return returnValidationErrors(loginSchema, {
          _errors: [signInResult.error?.message || 'Invalid email or password'],
        });
      }

      const cookieStore = await cookies();
      const isProd = process.env.NODE_ENV === 'production';
      const maxAge = 7 * 24 * 60 * 60; // 7 days

      cookieStore.set('token', signInResult.token, {
        path: '/',
        httpOnly: false,
        secure: isProd,
        sameSite: 'lax',
        maxAge,
      });

      cookieStore.set('auth_token', signInResult.token, {
        path: '/',
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge,
      });

      cookieStore.set('user', encodeURIComponent(JSON.stringify(signInResult.user)), {
        path: '/',
        httpOnly: false,
        secure: isProd,
        sameSite: 'lax',
        maxAge,
      });

      return {
        success: true,
        message: 'Login successful',
        data: signInResult.user,
        token: signInResult.token,
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

  cookieStore.delete('token');
  cookieStore.delete('auth_token');
  cookieStore.delete('user');
  cookieStore.delete('better-auth.session_token');
  cookieStore.delete('session_token');
  cookieStore.delete('auth.session-token');

  // Redirect to login page
  redirect('/login');
});

export const getAllUsers = async () => {
  try {
    return await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        userRole: true,
      },
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return [];
  }
};

export const getAllRoles = async () => {
  try {
    await ensureStandardRolesExist();
    return await prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    return [];
  }
};

export const getAllBranches = async () => {
  try {
    return await prisma.branch.findMany({
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Failed to fetch branches:', error);
    return [];
  }
};
