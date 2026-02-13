import { NextResponse } from 'next/server';
import { getAllExams, createExam } from '@/lib/db';

export async function GET() {
    try {
        const exams = getAllExams();
        return NextResponse.json(exams);
    } catch (error) {
        console.error('Error fetching exams:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, adminPin } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const newId = createExam(title, adminPin);
        return NextResponse.json({ success: true, id: newId });
    } catch (error) {
        console.error('Error creating exam:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
