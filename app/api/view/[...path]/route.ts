import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mime from 'mime';

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const { path: urlPath } = await params;

    if (!urlPath || urlPath.length === 0) {
        return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Construct file path
    const filePathRelative = urlPath.join(path.sep);

    // Security check: ensure no traversal
    if (filePathRelative.includes('..')) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
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
    let mimeType = mime.getType(fullPath) || 'application/octet-stream';

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
