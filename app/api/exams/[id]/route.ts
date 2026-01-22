import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getExamById, updateExamConfig, deleteExam, getAdminPinForExam } from '@/lib/db';

// small helper to list files for an exam folder
const listExamFiles = (examId: string) => {
    const dataDir = path.resolve(process.cwd(), 'data');
    const examDir = path.join(dataDir, examId);
    const results: any[] = [];
    if (!fs.existsSync(examDir)) return results;

    const walk = (dir: string) => {
        const items = fs.readdirSync(dir);
        for (const it of items) {
            const filePath = path.join(dir, it);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                walk(filePath);
            } else {
                const relPath = path.relative(examDir, filePath).replace(/\\/g, '/');
                const fullPath = path.relative(dataDir, filePath).replace(/\\/g, '/');
                results.push({ name: it, path: relPath, fullPath, size: stat.size, type: 'file' });
            }
        }
    };

    walk(examDir);
    return results;
};

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const exam = getExamById(id);
        if (!exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }
        // if file sharing is enabled, attach files list from data/<examId>/
        const sharingEnabled = (exam as any).fileSharingEnabled || (exam as any).file_sharing_enabled;
        if (sharingEnabled) {
            try {
                const files = listExamFiles(String(id));
                return NextResponse.json({ ...exam, files });
            } catch (e) {
                console.error('Error listing exam files:', e);
                // fallthrough to return exam without files
            }
        }
        return NextResponse.json(exam);
    } catch (error) {
        console.error('Error fetching exam:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { adminPinInput, ...updateData } = body;

        // Security Check
        const currentAdminPin = getAdminPinForExam(id);
        if (adminPinInput !== currentAdminPin) {
            return NextResponse.json({ error: 'Invalid Admin PIN' }, { status: 401 });
        }

        const updatedExam = updateExamConfig(id, updateData);
        return NextResponse.json({ success: true, exam: updatedExam });
    } catch (error) {
        console.error('Error updating exam:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        console.log('Deleting exam id:', id);

        // Read body for adminPinInput (client should send adminPinInput to authorize)
        let body: any = {};
        try {
            body = await request.json();
        } catch (e) {
            body = {};
        }

        const { adminPinInput } = body;
        const currentAdminPin = getAdminPinForExam(id);
        if (!adminPinInput || adminPinInput !== currentAdminPin) {
            return NextResponse.json({ error: 'Invalid Admin PIN' }, { status: 401 });
        }

        deleteExam(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting exam:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
