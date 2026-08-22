import { NextResponse } from 'next/server';
import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { getExamById, updateExamConfig, deleteExam, ConfigConflictError } from '@/lib/db';
import { isAdminAuthenticated, verifyAdminPin } from '@/lib/auth';
import { toPublicExam } from '@/lib/exam-serializer';

// small helper to list files for an exam folder
// Async (fs/promises) so this walk never blocks Node's single event loop —
// this endpoint is polled every 3s by every open exam room simultaneously,
// and a synchronous walk of one exam's files would stall every other room's countdown.
const listExamFiles = async (examId: string) => {
    const dataDir = path.resolve(process.cwd(), 'data');
    const examDir = path.join(dataDir, examId);
    const results: any[] = [];
    if (!fsSync.existsSync(examDir)) return results;

    const walk = async (dir: string) => {
        const items = await fs.readdir(dir);
        await Promise.all(items.map(async (it) => {
            const filePath = path.join(dir, it);
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) {
                await walk(filePath);
            } else {
                const relPath = path.relative(examDir, filePath).replace(/\\/g, '/');
                const fullPath = path.relative(dataDir, filePath).replace(/\\/g, '/');
                results.push({ name: it, path: relPath, fullPath, size: stat.size, type: 'file' });
            }
        }));
    };

    await walk(examDir);
    return results;
};

const countFilesInFolder = async (folder: string) => {
    const dataDir = path.resolve(process.cwd(), 'data');
    const targetDir = path.resolve(dataDir, folder);
    if (!targetDir.startsWith(dataDir) || !fsSync.existsSync(targetDir)) return 0;

    let count = 0;
    const walk = async (dir: string) => {
        const items = await fs.readdir(dir, { withFileTypes: true });
        await Promise.all(items.map(async (item) => {
            if (item.name.startsWith('.')) return;
            const itemPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                await walk(itemPath);
            } else {
                count += 1;
            }
        }));
    };

    await walk(targetDir);
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
        const files = await listExamFiles(String(id));
        const sharingEnabled = !!((exam as any).fileSharingEnabled || (exam as any).file_sharing_enabled || files.length > 0);
        const subjectsWithDocuments = await Promise.all(exam.subjects.map(async (subject: any) => {
            const documentCount = await countFilesInFolder(subject.folder);
            return {
                ...subject,
                documentCount,
                hasDocuments: documentCount > 0,
            };
        }));

        // No per-request timestamp here (e.g. serverTime) — this response must stay
        // deep-equal-stable across polls when nothing actually changed, or SWR can
        // never dedupe it and every consumer re-renders/re-syncs on every 3s poll for
        // no reason. Clock-offset correction is served separately by /api/server-time.
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
        if (error instanceof ConfigConflictError) {
            return NextResponse.json(
                { error: 'conflict', message: error.message, currentUpdatedAt: error.currentUpdatedAt },
                { status: 409 }
            );
        }
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
