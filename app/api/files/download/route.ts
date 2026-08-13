import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import mime from 'mime';
import db, { examExists, getFileAssetByPath } from '@/lib/db';
import { verifyAdminPin } from '@/lib/auth';
const mimeApi = (mime as any).getType ? (mime as any) : (mime as any).default;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const relPath = searchParams.get('path');
        const adminPin = searchParams.get('adminPin');
        if (!relPath) return NextResponse.json({ error: 'path is required' }, { status: 400 });

        const dataDir = path.resolve(process.cwd(), 'data');
        const targetPath = path.resolve(dataDir, relPath);
        if (!targetPath.startsWith(dataDir)) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        if (!fs.existsSync(targetPath)) return NextResponse.json({ error: 'File not found' }, { status: 404 });

        const stat = fs.statSync(targetPath);
        if (stat.isDirectory()) return NextResponse.json({ error: 'Path is a directory' }, { status: 400 });

        const normalizedPath = relPath.replace(/\\/g, '/');
        const examId = normalizedPath.split('/')[0];
        if (/^\d+$/.test(examId)) {
            if (!examExists(examId)) {
                return NextResponse.json({ error: 'File not found' }, { status: 404 });
            }
            const fileAsset = getFileAssetByPath(normalizedPath);
            const isAdmin = verifyAdminPin(request, examId, adminPin);
            if (fileAsset && !fileAsset.is_published && !isAdmin) {
                return NextResponse.json({ error: 'File not published' }, { status: 403 });
            }
        }

        const data = fs.readFileSync(targetPath);
        const contentType = mimeApi.getType(targetPath) || 'application/octet-stream';

        // log download
        try { 
            const rel = path.relative(dataDir, targetPath).replace(/\\/g, '/');
            db.prepare('INSERT INTO file_logs (exam_id, subject_folder, filename, action, admin_pin, ip) VALUES (?, ?, ?, ?, ?, ?)').run(null, null, rel, 'download', null, null);
        } catch (e) { console.error('log download failed', e); }

        return new NextResponse(data, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': String(data.length),
                'Content-Disposition': `attachment; filename="${path.basename(targetPath)}"`
            }
        });
    } catch (error) {
        console.error('Error serving file:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
