import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { clearAttempts, getClientIp, isRateLimited, recordFailedAttempt } from '@/lib/rate-limit';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { accessCode, folder, pin } = body as any;

        const exam = db.prepare('SELECT student_pin FROM exams WHERE id = ?').get(id) as any;
        if (!exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        const ip = getClientIp(request);
        const rateKey = `access:${ip}:${id}`;
        if (isRateLimited(rateKey)) {
            return NextResponse.json({ ok: false, error: 'Too many failed attempts. Try again later.' }, { status: 429 });
        }

        if (typeof accessCode === 'string') {
            const valid = exam.student_pin && String(exam.student_pin).trim() === accessCode.trim();
            if (!valid) recordFailedAttempt(rateKey);
            else clearAttempts(rateKey);
            return valid
                ? NextResponse.json({ ok: true })
                : NextResponse.json({ ok: false }, { status: 401 });
        }

        if (typeof folder === 'string' && typeof pin === 'string') {
            const subject = db
                .prepare('SELECT pin FROM subjects WHERE exam_id = ? AND folder = ?')
                .get(id, folder) as any;
            const valid = subject && subject.pin && String(subject.pin).trim() === pin.trim();
            if (!valid) recordFailedAttempt(rateKey);
            else clearAttempts(rateKey);
            return valid
                ? NextResponse.json({ ok: true })
                : NextResponse.json({ ok: false }, { status: 401 });
        }

        return NextResponse.json({ error: 'accessCode or folder+pin is required' }, { status: 400 });
    } catch (error) {
        console.error('Error verifying access:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
