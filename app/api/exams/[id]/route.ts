import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getExamById, updateExamConfig, deleteExam } from '@/lib/db';
import { isAdminAuthenticated, verifyAdminPin } from '@/lib/auth';
import { toPublicExam } from '@/lib/exam-serializer';

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

const countFilesInFolder = (folder: string) => {
    const dataDir = path.resolve(process.cwd(), 'data');
    const targetDir = path.resolve(dataDir, folder);
    if (!targetDir.startsWith(dataDir) || !fs.existsSync(targetDir)) return 0;

    let count = 0;
    const walk = (dir: string) => {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            if (item.name.startsWith('.')) continue;
            const itemPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                walk(itemPath);
            } else {
                count += 1;
            }
        }
    };

    walk(targetDir);
    return count;
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
        const files = listExamFiles(String(id));
        const sharingEnabled = !!((exam as any).fileSharingEnabled || (exam as any).file_sharing_enabled || files.length > 0);
        const subjectsWithDocuments = exam.subjects.map((subject: any) => {
            const documentCount = countFilesInFolder(subject.folder);
            return {
                ...subject,
                documentCount,
                hasDocuments: documentCount > 0,
            };
        });

        const fullExam = { ...exam, fileSharingEnabled: sharingEnabled, files, subjects: subjectsWithDocuments };
        if (isAdminAuthenticated(request)) {
            return NextResponse.json(fullExam);
        }
        return NextResponse.json(toPublicExam(fullExam));
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

        // Security Check: valid admin session OR valid PIN
        if (!verifyAdminPin(request, id, adminPinInput)) {
            return NextResponse.json({ error: 'Invalid Admin PIN' }, { status: 401 });
        }

        const updatedExam = updateExamConfig(id, updateData);
        return NextResponse.json({ success: true, exam: updatedExam });
    } catch (error: any) {
        console.error('Error updating exam:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
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

        const { adminPinInput: bodyPin } = body;
        const headerPin = request.headers.get('x-admin-pin');
        const adminPinInput = bodyPin || headerPin;

        if (!verifyAdminPin(request, id, adminPinInput)) {
            return NextResponse.json({ error: 'Invalid Admin PIN' }, { status: 401 });
        }

        deleteExam(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting exam:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
