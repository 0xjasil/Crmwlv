import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'crm_elevate_super_secure_jwt_secret_key_2026';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const cookieToken = request.cookies.get('token')?.value || request.cookies.get('auth_token')?.value;

    const token = headerToken || cookieToken;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'No authentication token provided' },
        },
        { status: 401 }
      );
    }

    let decoded: any = null;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      decoded = jwt.decode(token);
    }

    if (!decoded?.id && !decoded?.email) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
        },
        { status: 401 }
      );
    }

    const user = decoded.id
      ? await prisma.user.findUnique({
          where: { id: decoded.id },
          include: { userRole: true },
        })
      : await prisma.user.findUnique({
          where: { email: decoded.email },
          include: { userRole: true },
        });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        },
        { status: 404 }
      );
    }

    if (user.banned) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Account is suspended' },
        },
        { status: 403 }
      );
    }

    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      branch: user.branch,
      roleId: user.roleId,
      userRole: user.userRole,
      createdAt: user.createdAt,
    };

    return NextResponse.json(
      {
        success: true,
        data: userResponse,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to fetch session' },
      },
      { status: 500 }
    );
  }
}
