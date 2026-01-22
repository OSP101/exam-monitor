import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import db from '@/lib/db';

// Helper to recursively get files
const getFilesRecursively = (dir: string, baseDir: string, dataDir: string) => {
    let results: any[] = [];
    const list = fs.readdirSync(dir);

    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        const relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
        const fullPath = path.relative(dataDir, filePath).replace(/\\/g, '/');

        if (stat && stat.isDirectory()) {
            results = results.concat(getFilesRecursively(filePath, baseDir, dataDir));
        } else {
            // Filter out hidden files or specific system files if needed
            if (!file.startsWith('.')) {
                results.push({
                    name: file,
                    path: relativePath,
                    fullPath,
                    size: stat.size,
                    type: 'file'
                });
            }
        }
    });
    return results;
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder');

    if (!folder) {
        return NextResponse.json({ error: 'Folder parameter is required' }, { status: 400 });
    }

    // Allow nested folders but ensure resolved path stays within data dir
    const dataDir = path.resolve(process.cwd(), 'data');
    let targetDir = path.resolve(dataDir, folder);
    if (!targetDir.startsWith(dataDir)) {
        return NextResponse.json({ error: 'Invalid folder path' }, { status: 400 });
    }

    if (!fs.existsSync(targetDir)) {
        // Try to resolve under exam subfolders: data/<examId>/<folder>
        const candidates = fs.readdirSync(dataDir).filter((d) => {
            try { return fs.statSync(path.join(dataDir, d)).isDirectory(); } catch { return false; }
        });

        let found = null as string | null;
        for (const c of candidates) {
            const tryPath = path.resolve(dataDir, c, folder);
            if (tryPath.startsWith(dataDir) && fs.existsSync(tryPath) && fs.statSync(tryPath).isDirectory()) {
                found = tryPath;
                break;
            }
        }

        if (!found) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        // use resolved path
        // (targetDir used below)
        // overwrite targetDir variable
        // Note: keep targetDir inside dataDir
        // eslint-disable-next-line no-unused-vars
        // @ts-ignore
        targetDir = found;
    }

    try {
        const files = getFilesRecursively(targetDir, targetDir, dataDir);
        return NextResponse.json({ files });
    } catch (error) {
        console.error('Error listing files:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { path: relPath, adminPin } = body as any;
        if (!relPath) return NextResponse.json({ error: 'path is required' }, { status: 400 });
        if (!adminPin) return NextResponse.json({ error: 'adminPin is required' }, { status: 401 });

        // Verify adminPin
        const masterPin = 'admin1234';
        const row = db.prepare('SELECT COUNT(*) as c FROM exams WHERE admin_pin = ?').get(adminPin) as any;
        if (adminPin !== masterPin && (!row || row.c === 0)) return NextResponse.json({ error: 'Invalid admin PIN' }, { status: 401 });

        const dataDir = path.resolve(process.cwd(), 'data');
        const targetPath = path.resolve(dataDir, relPath);
        if (!targetPath.startsWith(dataDir)) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });

        if (!fs.existsSync(targetPath)) return NextResponse.json({ error: 'File not found' }, { status: 404 });

        const stat = fs.statSync(targetPath);
        if (stat.isDirectory()) return NextResponse.json({ error: 'Path is a directory' }, { status: 400 });

        fs.unlinkSync(targetPath);
        // log delete
        try { db.prepare('INSERT INTO file_logs (exam_id, subject_folder, filename, action, admin_pin, ip) VALUES (?, ?, ?, ?, ?, ?)').run(null, null, path.relative(dataDir, targetPath), 'delete', adminPin, null); } catch (e) { console.error('log error', e); }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting file:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { folder, filename, contentBase64, adminPin } = body as any;

        if (!folder || !filename || !contentBase64) {
            return NextResponse.json({ error: 'folder, filename and contentBase64 are required' }, { status: 400 });
        }

        // Basic validation to prevent traversal
        if (folder.includes('..') || folder.includes('/') || folder.includes('\\')) {
            return NextResponse.json({ error: 'Invalid folder path' }, { status: 400 });
        }

        if (!adminPin) {
            return NextResponse.json({ error: 'Admin PIN required' }, { status: 401 });
        }

        const masterPin = 'admin1234';
        const examRow = db.prepare('SELECT id FROM exams WHERE admin_pin = ?').get(adminPin) as any;
        if (adminPin !== masterPin && !examRow) {
            return NextResponse.json({ error: 'Invalid admin PIN' }, { status: 401 });
        }

        const dataDir = path.join(process.cwd(), 'data');
        const targetDir = path.join(dataDir, folder);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const targetPath = path.join(targetDir, filename);
        fs.writeFileSync(targetPath, Buffer.from(contentBase64, 'base64'));

        // log action (examId: try parse from folder root if pattern 'examId/...')
        let examId: any = null;
        const parts = folder.split(/\\|\//);
        if (parts.length > 0 && /^\d+$/.test(parts[0])) examId = parts[0];
        // subject folder is rest
        const subjectFolder = parts.length > 1 ? parts.slice(1).join('/') : null;
        try { db.prepare('INSERT INTO file_logs (exam_id, subject_folder, filename, action, admin_pin, ip) VALUES (?, ?, ?, ?, ?, ?)').run(examId, subjectFolder, filename, 'upload', adminPin, null); } catch (e) { console.error('log error', e); }

        return NextResponse.json({ success: true, path: path.relative(targetDir, targetPath).replace(/\\/g, '/'), fullPath: path.relative(dataDir, targetPath).replace(/\\/g, '/') });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
