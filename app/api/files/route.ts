import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Helper to recursively get files
const getFilesRecursively = (dir: string, baseDir: string) => {
    let results: any[] = [];
    const list = fs.readdirSync(dir);

    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        const relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');

        if (stat && stat.isDirectory()) {
            results = results.concat(getFilesRecursively(filePath, baseDir));
        } else {
            // Filter out hidden files or specific system files if needed
            if (!file.startsWith('.')) {
                results.push({
                    name: file,
                    path: relativePath,
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

    // Security: Prevent directory traversal
    if (folder.includes('..') || folder.includes('/') || folder.includes('\\')) {
        // Allow only simple folder names from the root of data
        // Actually the plan is to pass the specific defined folder name like 'JavaWeb_Resource'
        return NextResponse.json({ error: 'Invalid folder path' }, { status: 400 });
    }


    const dataDir = path.join(process.cwd(), 'data');
    const targetDir = path.join(dataDir, folder);

    if (!fs.existsSync(targetDir)) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    try {
        const files = getFilesRecursively(targetDir, targetDir);
        return NextResponse.json({ files });
    } catch (error) {
        console.error('Error listing files:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
