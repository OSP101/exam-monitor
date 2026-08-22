import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getMasterPin, isAdminAuthenticated, buildSessionCookie } from '@/lib/auth';
import { clearAttempts, getClientIp, isRateLimited, recordFailedAttempt } from '@/lib/rate-limit';

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

        const ip = getClientIp(request);
        const rateKey = `verify:${ip}:${examId ? String(examId) : 'admin'}`;
        if (isRateLimited(rateKey)) {
            return NextResponse.json({ ok: false, error: 'Too many failed attempts. Try again later.' }, { status: 429 });
        }

        const masterPin = getMasterPin();
        let ok = false;

        if (adminPin === masterPin) {
            ok = true;
        } else if (examId) {
            const row = db.prepare('SELECT admin_pin FROM exams WHERE id = ?').get(examId) as any;
            ok = !!(row && row.admin_pin === adminPin);
        }
        // No examId means this is the general /admin dashboard login, which grants a
        // full session cookie with access to every exam — only the true master PIN
        // may authenticate here. A single exam's own admin_pin must not escalate to it.

        if (ok) {
            clearAttempts(rateKey);
            const res = NextResponse.json({ ok: true });
            // Scoped checks (time monitor unlock) do not grant a full admin session.
            if (!examId) {
                res.headers.set('Set-Cookie', buildSessionCookie());
            }
            return res;
        }

        recordFailedAttempt(rateKey);
        return NextResponse.json({ ok: false }, { status: 401 });
    } catch (error) {
        console.error('Error verifying admin pin:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
