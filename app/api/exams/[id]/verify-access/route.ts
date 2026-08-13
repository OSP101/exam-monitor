import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { accessCode, folder, pin } = body as any;

        const exam = db.prepare('SELECT student_pin FROM exams WHERE id = ?').get(id) as any;
        if (!exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        if (typeof accessCode === 'string') {
            const valid = exam.student_pin && String(exam.student_pin).trim() === accessCode.trim();
            return valid
                ? NextResponse.json({ ok: true })
                : NextResponse.json({ ok: false }, { status: 401 });
        }

        if (typeof folder === 'string' && typeof pin === 'string') {
            const subject = db
                .prepare('SELECT pin FROM subjects WHERE exam_id = ? AND folder = ?')
                .get(id, folder) as any;
            const valid = subject && subject.pin && String(subject.pin).trim() === pin.trim();
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
