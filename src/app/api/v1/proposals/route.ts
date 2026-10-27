import { NextRequest, NextResponse } from 'next/server';
import { getProposals, createProposal } from '@/server/actions/proposal/proposal-actions';

export async function GET() {
  try {
    const result = await getProposals();
    if (!result?.data?.success && !result?.data) {
      return NextResponse.json({ success: false, message: 'Failed to fetch proposals' }, { status: 500 });
    }
    const data = result?.data?.data || result?.data || [];
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createProposal(body);
    if (result?.data?.success) {
      return NextResponse.json({ success: true, data: result.data.data, message: result.data.message }, { status: 201 });
    }
    return NextResponse.json({ success: false, message: result?.data?.message || 'Failed to create proposal' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
