import { NextResponse } from 'next/server';
import { getAllExams, createExam } from '@/lib/db';
import { verifyAnyAdminPin } from '@/lib/auth';

export async function GET() {
    try {
        const exams = getAllExams().map((exam: any) => ({
            id: exam.id,
            title: exam.title,
            title_en: exam.title_en || '',
            created_at: exam.created_at,
            file_sharing_enabled: !!exam.file_sharing_enabled,
        }));
        return NextResponse.json(exams);
    } catch (error) {
        console.error('Error fetching exams:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, adminPin, adminPinInput } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        if (!verifyAnyAdminPin(request, adminPin || adminPinInput)) {
            return NextResponse.json({ error: 'Invalid Admin PIN' }, { status: 401 });
        }

        const newId = createExam(title, adminPin || adminPinInput);
        return NextResponse.json({ success: true, id: newId });
    } catch (error) {
        console.error('Error creating exam:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
