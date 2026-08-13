import { NextResponse } from 'next/server';
import { getExamById, updateExamConfig } from '@/lib/db';
import { verifyAdminPin } from '@/lib/auth';
import { toPublicExam } from '@/lib/exam-serializer';

// This legacy route will now just point to the first exam (id 1) 
// to prevent breaking anything that still calls /api/config
const DEFAULT_EXAM_ID = 1;

export async function GET(request: Request) {
  try {
    const config = getExamById(DEFAULT_EXAM_ID);
    if (!config) {
      return NextResponse.json({ error: 'Default exam not found' }, { status: 404 });
    }
    if (!verifyAdminPin(request, DEFAULT_EXAM_ID)) {
      return NextResponse.json(toPublicExam(config));
    }
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error reading config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adminPin, ...newConfig } = body;

    // Security Check
    if (!verifyAdminPin(request, DEFAULT_EXAM_ID, adminPin)) {
      return NextResponse.json({ error: 'Invalid Admin PIN' }, { status: 401 });
    }

    const updatedConfig = updateExamConfig(DEFAULT_EXAM_ID, { ...newConfig, adminPinInput: adminPin });

    return NextResponse.json({ success: true, config: updatedConfig });

  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
