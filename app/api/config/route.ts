import { NextResponse } from 'next/server';
import { getExamById, updateExamConfig, getAdminPinForExam } from '@/lib/db';

// This legacy route will now just point to the first exam (id 1) 
// to prevent breaking anything that still calls /api/config
const DEFAULT_EXAM_ID = 1;

export async function GET() {
  try {
    const config = getExamById(DEFAULT_EXAM_ID);
    if (!config) {
      return NextResponse.json({ error: 'Default exam not found' }, { status: 404 });
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
    const currentAdminPin = getAdminPinForExam(DEFAULT_EXAM_ID);
    const masterPin = 'admin1234';
    if (adminPin !== currentAdminPin && adminPin !== masterPin) {
      return NextResponse.json({ error: 'Invalid Admin PIN' }, { status: 401 });
    }

    const updatedConfig = updateExamConfig(DEFAULT_EXAM_ID, { ...newConfig, adminPinInput: adminPin });

    return NextResponse.json({ success: true, config: updatedConfig });

  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
