import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'crm_elevate_super_secure_jwt_secret_key_2026';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' },
        },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        userRole: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
        },
        { status: 401 }
      );
    }

    if (user.banned) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Account is suspended: ${user.banReason || 'Contact administrator'}`,
          },
        },
        { status: 403 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
        },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
        },
        { status: 401 }
      );
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

    // Clean user response object without secrets
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      branch: user.branch,
      roleId: user.roleId,
      userRole: user.userRole,
    };

    // Ensure session record exists in DB
    try {
      await prisma.session.upsert({
        where: { token },
        create: {
          id: `sess_${Date.now()}_${user.id}`,
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        },
        update: {
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        },
      });
    } catch (e) {
      // Session logging non-blocking
    }

    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: userResponse,
          token,
        },
        message: 'Logged in successfully',
      },
      { status: 200 }
    );

    const isProd = process.env.NODE_ENV === 'production';
    const maxAge = 7 * 24 * 60 * 60; // 7 days

    // Set standard browser token cookie
    response.cookies.set('token', token, {
      path: '/',
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      maxAge,
    });

    // Set auth_token cookie for backend interoperability
    response.cookies.set('auth_token', token, {
      path: '/',
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge,
    });

    // Set user cookie for immediate client-side UI hydration
    response.cookies.set('user', encodeURIComponent(JSON.stringify(userResponse)), {
      path: '/',
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      maxAge,
    });

    return response;
  } catch (error: any) {
    console.error('Login handler error:', error?.message || error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred during login' },
      },
      { status: 500 }
    );
  }
}
