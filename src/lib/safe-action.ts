import { createSafeActionClient, DEFAULT_SERVER_ERROR_MESSAGE } from 'next-safe-action';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// Base action client for public actions
export const actionClient = createSafeActionClient({
  handleServerError(e) {
    console.error('Action error:', e.message);

    if (e.message.includes('Invalid credentials')) {
      return e.message;
    }

    if (e.message.includes('Email already exists')) {
      return e.message;
    }

    return DEFAULT_SERVER_ERROR_MESSAGE;
  },
});

// Authenticated action client that requires a valid session
export const authActionClient = createSafeActionClient({
  handleServerError(e) {
    console.error('Auth action error:', e.message);
    return DEFAULT_SERVER_ERROR_MESSAGE;
  },
}).use(async ({ next }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  return next({
    ctx: {
      user: session.user,
      session: session.session,
      userId: session.user.id,
    },
  });
});

// Role-based action client that requires specific roles
export const createRoleActionClient = (allowedRoles: string[]) => {
  return createSafeActionClient({
    handleServerError(e) {
      console.error('Role action error:', e.message);
      return DEFAULT_SERVER_ERROR_MESSAGE;
    },
  }).use(async ({ next }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      throw new Error('Unauthorized');
    }

    // Check if user has required role (you'll implement this based on your role setup)
    const userRole = session.user.role || 'user';

    if (!allowedRoles.includes(userRole)) {
      throw new Error('Insufficient permissions');
    }

    return next({
      ctx: {
        user: session.user,
        session: session.session,
        userId: session.user.id,
        userRole,
      },
    });
  });
};

// Admin-only actions
export const adminActionClient = createRoleActionClient(['admin']);

// Executive and Admin actions
export const executiveActionClient = createRoleActionClient(['admin', 'executive']);

// All roles actions
export const allRolesActionClient = createRoleActionClient(['admin', 'executive', 'telecaller']);
