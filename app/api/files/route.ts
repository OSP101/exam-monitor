import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import mime from 'mime';
import db, {
    deleteFileAsset,
    getAdminPinForExam,
    listFileAssetsForExam,
    logFileAction,
    setFilePublishedState,
    syncExamFilesToDb,
    upsertFileAsset,
} from '@/lib/db';

const dataDir = path.resolve(process.cwd(), 'data');
const mimeApi = (mime as any).getType ? (mime as any) : (mime as any).default;

const getFilesRecursively = async (dir: string, baseDir: string): Promise<any[]> => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
        const filePath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return getFilesRecursively(filePath, baseDir);
        }

        if (entry.name.startsWith('.')) {
            return [];
        }

        const stat = await fs.stat(filePath);
        const relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
        const fullPath = path.relative(dataDir, filePath).replace(/\\/g, '/');

        return [{
            name: entry.name,
            path: relativePath,
            fullPath,
            size: stat.size,
            type: 'file',
            mimeType: mimeApi.getType(filePath) || '',
            isPublished: true,
            publishedAt: stat.mtime.toISOString(),
            updatedAt: stat.mtime.toISOString(),
            lastUploadedAt: stat.mtime.toISOString(),
            extension: path.extname(entry.name).replace('.', '').toLowerCase(),
        }];
    }));

    return nested.flat();
};

const parseExamIdFromFolder = (folder: string) => {
    if (/^\d+$/.test(folder)) {
        return folder;
    }
    return null;
};

const verifyAdminPin = (examId: string, adminPin: string | null | undefined) => {
    if (!adminPin) return false;
    const masterPin = 'admin1234';
    const currentAdminPin = getAdminPinForExam(examId);
    return adminPin === masterPin || adminPin === currentAdminPin;
};

const getStoredPathFromRelative = (relPath: string) => path.resolve(dataDir, relPath);

const getUploadPayload = async (request: Request) => {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!(file instanceof File)) {
            return { error: 'file is required' as const };
        }

        return {
            folder: String(formData.get('folder') || ''),
            filename: file.name,
            adminPin: String(formData.get('adminPin') || ''),
            publishNow: String(formData.get('publishNow') || 'false') === 'true',
            buffer: Buffer.from(await file.arrayBuffer()),
            mimeType: file.type || mimeApi.getType(file.name) || '',
        };
    }

    const body = await request.json();
    const { folder, filename, contentBase64, adminPin, publishNow } = body as any;
    if (!contentBase64) {
        return { error: 'contentBase64 is required' as const };
    }

    return {
        folder: String(folder || ''),
        filename: String(filename || ''),
        adminPin: String(adminPin || ''),
        publishNow: !!publishNow,
        buffer: Buffer.from(contentBase64, 'base64'),
        mimeType: mimeApi.getType(String(filename || '')) || '',
    };
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder');
    const publishedOnly = searchParams.get('publishedOnly') === '1';
    const includeUnpublished = searchParams.get('includeUnpublished') === '1';
    const adminPin = searchParams.get('adminPin');

    if (!folder) {
        return NextResponse.json({ error: 'Folder parameter is required' }, { status: 400 });
    }

    const examId = parseExamIdFromFolder(folder);
    if (examId) {
        if (includeUnpublished && !verifyAdminPin(examId, adminPin)) {
            return NextResponse.json({ error: 'Invalid admin PIN' }, { status: 401 });
        }

        syncExamFilesToDb(examId, { defaultPublished: true });
        const files = listFileAssetsForExam(examId, {
            includeUnpublished: includeUnpublished && verifyAdminPin(examId, adminPin),
        });

        return NextResponse.json({
            files: publishedOnly ? files.filter((file) => file.isPublished) : files,
        });
    }

    let targetDir = path.resolve(dataDir, folder);
    if (!targetDir.startsWith(dataDir)) {
        return NextResponse.json({ error: 'Invalid folder path' }, { status: 400 });
    }

    try {
        const stat = await fs.stat(targetDir).catch(() => null);
        if (!stat || !stat.isDirectory()) {
            const candidates = await fs.readdir(dataDir, { withFileTypes: true });
            let found: string | null = null;

            for (const candidate of candidates) {
                if (!candidate.isDirectory()) continue;
                const tryPath = path.resolve(dataDir, candidate.name, folder);
                if (!tryPath.startsWith(dataDir)) continue;
                const nestedStat = await fs.stat(tryPath).catch(() => null);
                if (nestedStat?.isDirectory()) {
                    found = tryPath;
                    break;
                }
            }

            if (!found) {
                return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
            }

            targetDir = found;
        }

        const files = await getFilesRecursively(targetDir, targetDir);
        return NextResponse.json({ files });
    } catch (error) {
        console.error('Error listing files:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const payload = await getUploadPayload(request);
        if ('error' in payload) {
            return NextResponse.json({ error: payload.error }, { status: 400 });
        }

        const { folder, filename, adminPin, buffer, mimeType } = payload;

        if (!folder || !filename || !buffer.length) {
            return NextResponse.json({ error: 'folder, filename and file are required' }, { status: 400 });
        }

        if (folder.includes('..') || folder.includes('/') || folder.includes('\\')) {
            return NextResponse.json({ error: 'Invalid folder path' }, { status: 400 });
        }

        const examId = parseExamIdFromFolder(folder);
        if (examId && !verifyAdminPin(examId, adminPin)) {
            return NextResponse.json({ error: 'Invalid admin PIN' }, { status: 401 });
        }

        if (!examId) {
            const masterPin = 'admin1234';
            const row = db.prepare('SELECT COUNT(*) as c FROM exams WHERE admin_pin = ?').get(adminPin) as any;
            if (adminPin !== masterPin && (!row || row.c === 0)) {
                return NextResponse.json({ error: 'Invalid admin PIN' }, { status: 401 });
            }
        }

        const targetDir = path.join(dataDir, folder);
        await fs.mkdir(targetDir, { recursive: true });
        const targetPath = path.join(targetDir, filename);
        await fs.writeFile(targetPath, buffer);

        const fullPath = path.relative(dataDir, targetPath).replace(/\\/g, '/');
        const subjectFolder = examId ? '' : folder;

        if (examId) {
            upsertFileAsset({
                examId,
                storedPath: fullPath,
                folder: '',
                displayName: filename,
                mimeType,
                size: buffer.length,
                isPublished: true,
            });
            db.prepare('UPDATE exams SET file_sharing_enabled = 1 WHERE id = ?').run(examId);
        }

        logFileAction(examId, subjectFolder || null, filename, 'upload', adminPin, null);

        return NextResponse.json({
            success: true,
            path: path.relative(targetDir, targetPath).replace(/\\/g, '/'),
            fullPath,
            size: buffer.length,
            isPublished: true,
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { path: relPath, adminPin, isPublished } = body as {
            path?: string;
            adminPin?: string;
            isPublished?: boolean;
        };

        if (!relPath) {
            return NextResponse.json({ error: 'path is required' }, { status: 400 });
        }

        const normalizedPath = relPath.replace(/\\/g, '/');
        const examId = normalizedPath.split('/')[0];
        if (!/^\d+$/.test(examId) || !verifyAdminPin(examId, adminPin)) {
            return NextResponse.json({ error: 'Invalid admin PIN' }, { status: 401 });
        }

        setFilePublishedState(normalizedPath, !!isPublished);
        logFileAction(examId, null, normalizedPath, isPublished ? 'publish' : 'unpublish', adminPin, null);

        return NextResponse.json({ success: true, isPublished: !!isPublished });
    } catch (error) {
        console.error('Error updating file metadata:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { path: relPath, adminPin } = body as { path?: string; adminPin?: string };
        if (!relPath) {
            return NextResponse.json({ error: 'path is required' }, { status: 400 });
        }

        const normalizedPath = relPath.replace(/\\/g, '/');
        const examId = normalizedPath.split('/')[0];
        if (/^\d+$/.test(examId) && !verifyAdminPin(examId, adminPin)) {
            return NextResponse.json({ error: 'Invalid admin PIN' }, { status: 401 });
        }

        const targetPath = getStoredPathFromRelative(normalizedPath);
        if (!targetPath.startsWith(dataDir)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        const stat = await fs.stat(targetPath).catch(() => null);
        if (!stat) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }
        if (stat.isDirectory()) {
            return NextResponse.json({ error: 'Path is a directory' }, { status: 400 });
        }

        await fs.unlink(targetPath);
        deleteFileAsset(normalizedPath);
        logFileAction(/^\d+$/.test(examId) ? examId : null, null, normalizedPath, 'delete', adminPin, null);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting file:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
