import { NextResponse } from 'next/server';
import { getConfig, updateConfig, getAdminPin } from '@/lib/db';

export async function GET() {
  try {
    const config = getConfig();
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
    const currentAdminPin = getAdminPin();
    if (adminPin !== currentAdminPin) {
      return NextResponse.json({ error: 'Invalid Admin PIN' }, { status: 401 });
    }

    const updatedConfig = updateConfig(newConfig);

    return NextResponse.json({ success: true, config: updatedConfig });

  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
