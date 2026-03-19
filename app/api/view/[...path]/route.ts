import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mime from 'mime';
import { getAdminPinForExam, getFileAssetByPath } from '@/lib/db';
const mimeApi = (mime as any).getType ? (mime as any) : (mime as any).default;

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const { path: urlPath } = await params;

    if (!urlPath || urlPath.length === 0) {
        return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Construct file path
    const filePathRelative = urlPath.join(path.sep);
    const filePathRelativeNormalized = filePathRelative.replace(/\\/g, '/');

    // Security check: ensure no traversal
    if (filePathRelative.includes('..')) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const examId = filePathRelativeNormalized.split('/')[0];
    if (/^\d+$/.test(examId)) {
        const adminPin = new URL(request.url).searchParams.get('adminPin');
        const fileAsset = getFileAssetByPath(filePathRelativeNormalized);
        const isAdmin = adminPin && (adminPin === 'admin1234' || adminPin === getAdminPinForExam(examId));
        if (fileAsset && !fileAsset.is_published && !isAdmin) {
            return NextResponse.json({ error: 'File not published' }, { status: 403 });
        }
    }

    const fullPath = path.join(process.cwd(), 'data', filePathRelative);

    if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
        return NextResponse.json({ error: 'Path is a directory' }, { status: 400 });
    }

    const ext = path.extname(fullPath).toLowerCase();
    let mimeType = mimeApi.getType(fullPath) || 'application/octet-stream';

    // For text files, ensure UTF-8 encoding for Thai support
    const textExtensions = ['.txt', '.md', '.json', '.html', '.css', '.js', '.ts', '.xml', '.csv', '.sql', '.java', '.py', '.c', '.cpp', '.h'];
    const isTextFile = textExtensions.includes(ext) || mimeType.startsWith('text/');

    if (isTextFile) {
        // Read as UTF-8 text
        const fileContent = fs.readFileSync(fullPath, 'utf-8');

        // Add charset to mime type
        if (!mimeType.includes('charset')) {
            mimeType = `${mimeType}; charset=utf-8`;
        }

        return new NextResponse(fileContent, {
            headers: {
                'Content-Type': mimeType,
                'Content-Disposition': 'inline',
            },
        });
    }

    // For binary files (PDF, images, etc.)
    const fileBuffer = fs.readFileSync(fullPath);

    return new NextResponse(fileBuffer, {
        headers: {
            'Content-Type': mimeType,
            'Content-Disposition': 'inline',
        },
    });
}
