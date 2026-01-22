import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { adminPin } = body as any;

        if (!adminPin) {
            return NextResponse.json({ error: 'adminPin is required' }, { status: 400 });
        }

        // Check for universal master PIN or any exam PIN
        const masterPin = 'admin1234';
        const row = db.prepare('SELECT COUNT(*) as c FROM exams WHERE admin_pin = ?').get(adminPin) as any;

        if (adminPin === masterPin || (row && row.c > 0)) {
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ ok: false }, { status: 401 });
    } catch (error) {
        console.error('Error verifying admin pin:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
