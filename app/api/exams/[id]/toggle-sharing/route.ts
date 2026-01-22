import { NextResponse } from 'next/server';
import { getAdminPinForExam } from '@/lib/db';
import db from '@/lib/db';
import path from 'path';
import fs from 'fs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { adminPinInput, enable } = body as any;

        const current = db.prepare('SELECT admin_pin FROM exams WHERE id = ?').get(id) as any;
        if (!current) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        if (adminPinInput !== current.admin_pin) return NextResponse.json({ error: 'Invalid Admin PIN' }, { status: 401 });

        const enabled = !!enable;
        db.prepare('UPDATE exams SET file_sharing_enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);

        if (enabled) {
            try {
                const examDir = path.join(process.cwd(), 'data', String(id));
                if (!fs.existsSync(examDir)) fs.mkdirSync(examDir, { recursive: true });
            } catch (e) {
                console.error('Failed to create exam data folder', e);
            }
        }

        return NextResponse.json({ success: true, fileSharingEnabled: enabled });
    } catch (error) {
        console.error('toggle-sharing error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
