import { NextRequest, NextResponse } from 'next/server';
import { getProposalById, updateProposal, deleteProposal } from '@/server/actions/proposal/proposal-actions';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await getProposalById({ id });
    if (result?.data?.success && result.data.data) {
      return NextResponse.json({ success: true, data: result.data.data });
    }
    return NextResponse.json({ success: false, message: result?.data?.message || 'Proposal not found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const result = await updateProposal({ id, ...body });
    if (result?.data?.success) {
      return NextResponse.json({ success: true, message: result.data.message });
    }
    return NextResponse.json({ success: false, message: result?.data?.message || 'Failed to update proposal' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await deleteProposal({ id });
    if (result?.data?.success) {
      return NextResponse.json({ success: true, message: result.data.message });
    }
    return NextResponse.json({ success: false, message: result?.data?.message || 'Failed to delete proposal' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
