import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getMasterPin, isAdminAuthenticated, buildSessionCookie } from '@/lib/auth';

export async function GET(request: Request) {
    return NextResponse.json({ ok: isAdminAuthenticated(request) });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { adminPin, examId } = body as any;

        if (!adminPin) {
            return NextResponse.json({ error: 'adminPin is required' }, { status: 400 });
        }

        const masterPin = getMasterPin();
        let ok = false;

        if (adminPin === masterPin) {
            ok = true;
        } else if (examId) {
            const row = db.prepare('SELECT admin_pin FROM exams WHERE id = ?').get(examId) as any;
            ok = !!(row && row.admin_pin === adminPin);
        } else {
            const row = db.prepare('SELECT COUNT(*) as c FROM exams WHERE admin_pin = ?').get(adminPin) as any;
            ok = !!(row && row.c > 0);
        }

        if (ok) {
            const res = NextResponse.json({ ok: true });
            // Scoped checks (time monitor unlock) do not grant a full admin session.
            if (!examId) {
                res.headers.set('Set-Cookie', buildSessionCookie());
            }
            return res;
        }

        return NextResponse.json({ ok: false }, { status: 401 });
    } catch (error) {
        console.error('Error verifying admin pin:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
