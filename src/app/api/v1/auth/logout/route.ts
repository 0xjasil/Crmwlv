import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get('token')?.value || request.cookies.get('auth_token')?.value;

    if (cookieToken) {
      try {
        await prisma.session.deleteMany({
          where: { token: cookieToken },
        });
      } catch (e) {
        // Non-blocking
      }
    }

    const response = NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      { status: 200 }
    );

    // Clear all auth-related cookies
    const cookieNames = [
      'token',
      'auth_token',
      'user',
      'session_token',
      'better-auth.session_token',
      'auth.session-token',
    ];

    for (const name of cookieNames) {
      response.cookies.delete(name);
      response.cookies.set(name, '', {
        path: '/',
        maxAge: 0,
        expires: new Date(0),
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to logout' },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
