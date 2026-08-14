import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'exam-monitor.db');
const db = new Database(dbPath);

// Enforce foreign key constraints (ON DELETE CASCADE on file_assets etc.)
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
    CREATE TABLE IF NOT EXISTS exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT 'รอบการสอบ',
        title_en TEXT DEFAULT '',
        admin_pin TEXT NOT NULL DEFAULT 'admin1234',
        student_pin TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        name_en TEXT DEFAULT '',
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        content_en TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_id INTEGER NOT NULL,
        subject_id TEXT NOT NULL,
        name TEXT NOT NULL,
        folder TEXT NOT NULL,
        pin TEXT NOT NULL,
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS file_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_id INTEGER,
        subject_folder TEXT,
        filename TEXT,
        action TEXT NOT NULL,
        admin_pin TEXT,
        ip TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS file_assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_id INTEGER NOT NULL,
        stored_path TEXT NOT NULL UNIQUE,
        folder TEXT NOT NULL DEFAULT '',
        display_name TEXT NOT NULL,
        mime_type TEXT DEFAULT '',
        size INTEGER DEFAULT 0,
        is_published INTEGER DEFAULT 0,
        published_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    -- Migration Logic: Create a default exam if total exams is 0
    -- This handles the transition from the old single-config system
`);

// Initialization: Create a default exam if none exist
const examCount = (db.prepare('SELECT COUNT(*) as c FROM exams').get() as any).c;
if (examCount === 0) {
    db.prepare('INSERT INTO exams (title, admin_pin) VALUES (?, ?)').run('รอบการสอบที่ 1', 'admin1234');
    console.log('Created default exam');
}

// Ensure legacy tables have the exam_id column (safe to run multiple times)
const ensureColumn = (tableName: string, columnName: string, type: string = 'INTEGER', defaultValue: any = 0) => {
    try {
        const info = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
        const has = info.some((c) => c.name === columnName);
        if (!has) {
            const def = typeof defaultValue === 'string' ? `'${defaultValue}'` : defaultValue;
            db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${type} DEFAULT ${def}`).run();
            console.log(`Added column ${columnName} (${type}) to ${tableName}`);
        }
    } catch (e) {
        console.error(`Error adding column ${columnName} to ${tableName}:`, e);
    }
};

ensureColumn('sessions', 'exam_id');
ensureColumn('announcements', 'exam_id');
ensureColumn('subjects', 'exam_id');
// ensure exams has file_sharing_enabled flag
ensureColumn('exams', 'file_sharing_enabled');
ensureColumn('exams', 'student_pin', 'TEXT', '');
ensureColumn('exams', 'title_en', 'TEXT', '');
ensureColumn('sessions', 'name_en', 'TEXT', '');
ensureColumn('announcements', 'content_en', 'TEXT', '');
ensureColumn('file_assets', 'folder', 'TEXT', '');
ensureColumn('file_assets', 'mime_type', 'TEXT', '');
ensureColumn('file_assets', 'size', 'INTEGER', 0);
ensureColumn('file_assets', 'is_published', 'INTEGER', 0);
ensureColumn('file_assets', 'published_at', 'DATETIME', 'NULL');
ensureColumn('file_assets', 'updated_at', 'DATETIME', 'CURRENT_TIMESTAMP');
ensureColumn('file_assets', 'last_uploaded_at', 'DATETIME', 'CURRENT_TIMESTAMP');

const normalizeStoredPath = (storedPath: string) => storedPath.replace(/\\/g, '/');

const fileAssetExists = db.prepare('SELECT id FROM file_assets WHERE stored_path = ?');
const insertFileAsset = db.prepare(`
    INSERT INTO file_assets (
        exam_id,
        stored_path,
        folder,
        display_name,
        mime_type,
        size,
        is_published,
        published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const updateFileAsset = db.prepare(`
    UPDATE file_assets
    SET
        folder = ?,
        display_name = ?,
        mime_type = ?,
        size = ?,
        is_published = ?,
        published_at = ?,
        updated_at = CURRENT_TIMESTAMP,
        last_uploaded_at = CURRENT_TIMESTAMP
    WHERE stored_path = ?
`);

export type FileAssetRecord = {
    id: number;
    exam_id: number;
    stored_path: string;
    folder: string;
    display_name: string;
    mime_type: string;
    size: number;
    is_published: number;
    published_at: string | null;
    created_at: string;
    updated_at: string;
    last_uploaded_at: string;
};

export function upsertFileAsset(data: {
    examId: number | string;
    storedPath: string;
    folder?: string | null;
    displayName: string;
    mimeType?: string | null;
    size?: number | null;
    isPublished?: boolean;
    publishedAt?: string | null;
}) {
    const storedPath = normalizeStoredPath(data.storedPath);
    const existing = fileAssetExists.get(storedPath) as { id: number } | undefined;
    const publishedAt = data.isPublished
        ? (data.publishedAt || new Date().toISOString())
        : null;
    const params = [
        String(data.folder || ''),
        data.displayName,
        data.mimeType || '',
        data.size || 0,
        data.isPublished ? 1 : 0,
        publishedAt,
    ] as const;

    if (existing) {
        updateFileAsset.run(...params, storedPath);
    } else {
        insertFileAsset.run(
            data.examId,
            storedPath,
            String(data.folder || ''),
            data.displayName,
            data.mimeType || '',
            data.size || 0,
            data.isPublished ? 1 : 0,
            publishedAt
        );
    }
}

export function setFilePublishedState(storedPath: string, isPublished: boolean) {
    const normalizedPath = normalizeStoredPath(storedPath);
    db.prepare(`
        UPDATE file_assets
        SET
            is_published = ?,
            published_at = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE stored_path = ?
    `).run(isPublished ? 1 : 0, isPublished ? new Date().toISOString() : null, normalizedPath);
}

export function getFileAssetByPath(storedPath: string) {
    return db.prepare('SELECT * FROM file_assets WHERE stored_path = ?').get(normalizeStoredPath(storedPath)) as FileAssetRecord | undefined;
}

export function deleteFileAsset(storedPath: string) {
    db.prepare('DELETE FROM file_assets WHERE stored_path = ?').run(normalizeStoredPath(storedPath));
}

export function listFileAssetsForExam(examId: number | string, options?: { includeUnpublished?: boolean }) {
    const rows = db.prepare(`
        SELECT *
        FROM file_assets
        WHERE exam_id = ?
        ${options?.includeUnpublished ? '' : 'AND is_published = 1'}
        ORDER BY
            is_published DESC,
            COALESCE(published_at, last_uploaded_at, created_at) DESC,
            display_name COLLATE NOCASE ASC
    `).all(examId) as FileAssetRecord[];

    return rows.map((row) => ({
        id: row.id,
        name: row.display_name,
        path: row.stored_path.replace(new RegExp(`^${examId}/`), ''),
        fullPath: row.stored_path,
        size: row.size,
        mimeType: row.mime_type || '',
        isPublished: !!row.is_published,
        publishedAt: row.published_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastUploadedAt: row.last_uploaded_at,
        folder: row.folder || '',
        extension: path.extname(row.display_name).replace('.', '').toLowerCase()
    }));
}

export function syncExamFilesToDb(examId: number | string, options?: { defaultPublished?: boolean }) {
    const examDir = path.join(process.cwd(), 'data', String(examId));
    if (!fs.existsSync(examDir)) return;

    const walk = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const absolutePath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(absolutePath);
                continue;
            }

            const stat = fs.statSync(absolutePath);
            const relFromExam = path.relative(examDir, absolutePath).replace(/\\/g, '/');
            const storedPath = normalizeStoredPath(path.join(String(examId), relFromExam));
            const existing = getFileAssetByPath(storedPath);
            if (!existing) {
                upsertFileAsset({
                    examId,
                    storedPath,
                    folder: path.dirname(relFromExam) === '.' ? '' : path.dirname(relFromExam).replace(/\\/g, '/'),
                    displayName: entry.name,
                    size: stat.size,
                    isPublished: options?.defaultPublished ?? true,
                });
            }
        }
    };

    walk(examDir);
}

// Helper functions for Exams
export function getAllExams() {
    return db.prepare('SELECT * FROM exams ORDER BY created_at DESC').all();
}

export function getExamById(id: number | string) {
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(id) as any;
    if (!exam) return null;

    const sessions = db.prepare('SELECT * FROM sessions WHERE exam_id = ? ORDER BY sort_order ASC, id ASC').all(id);
    const announcements = db.prepare('SELECT * FROM announcements WHERE exam_id = ? ORDER BY sort_order ASC, id ASC').all(id);
    const subjects = db.prepare('SELECT * FROM subjects WHERE exam_id = ? ORDER BY id ASC').all(id);

    return {
        id: exam.id,
        examTitle: exam.title,
        title_en: exam.title_en || '',
        adminPin: exam.admin_pin,
        accessCode: exam.student_pin || '',
        fileSharingEnabled: !!exam.file_sharing_enabled,
        sessions: sessions.map((s: any) => ({
            id: s.id,
            name: s.name,
            name_en: s.name_en || '',
            startTime: s.start_time,
            endTime: s.end_time
        })),
        announcements: announcements.map((a: any) => ({
            content: a.content,
            content_en: a.content_en || ''
        })),
        subjects: subjects.map((s: any) => ({
            id: s.id,
            subject_id: s.subject_id,
            name: s.name,
            folder: s.folder,
            pin: s.pin
        }))
    };
}

export function createExam(title: string, adminPin?: string) {
    const generatedPin = adminPin && adminPin.trim() !== ''
        ? adminPin
        : String(crypto.randomInt(100000, 1000000));
    const result = db.prepare('INSERT INTO exams (title, admin_pin) VALUES (?, ?)').run(title, generatedPin);
    return result.lastInsertRowid;
}

export function deleteExam(id: number | string) {
    const transaction = db.transaction(() => {
        db.prepare('DELETE FROM sessions WHERE exam_id = ?').run(id);
        db.prepare('DELETE FROM announcements WHERE exam_id = ?').run(id);
        db.prepare('DELETE FROM subjects WHERE exam_id = ?').run(id);
        db.prepare('DELETE FROM file_assets WHERE exam_id = ?').run(id);
        db.prepare('DELETE FROM file_logs WHERE exam_id = ?').run(id);
        db.prepare('DELETE FROM exams WHERE id = ?').run(id);
    });
    transaction();

    // Remove the exam's on-disk folder so deleted exams' files are no longer served
    const examDir = path.join(process.cwd(), 'data', String(id));
    try {
        if (fs.existsSync(examDir)) {
            fs.rmSync(examDir, { recursive: true, force: true });
            console.log(`Removed exam folder: ${examDir}`);
        }
    } catch (e) {
        console.error(`Failed to remove exam folder ${examDir}:`, e);
    }
}

export function examExists(id: number | string) {
    const row = db.prepare('SELECT 1 FROM exams WHERE id = ?').get(id);
    return !!row;
}

export function updateExamConfig(id: number | string, data: any) {
    try {
        const {
            examTitle,
            title_en,
            adminPin,
            accessCode,
            studentPin,
            sessions,
            announcements,
            subjects
        } = data;

        // Update main exam data
        if (examTitle !== undefined) {
            db.prepare('UPDATE exams SET title = ? WHERE id = ?').run(examTitle, id);
        }
        if (title_en !== undefined) {
            db.prepare('UPDATE exams SET title_en = ? WHERE id = ?').run(title_en, id);
        }
        if (adminPin !== undefined) {
            db.prepare('UPDATE exams SET admin_pin = ? WHERE id = ?').run(adminPin, id);
        }
        const resolvedAccessCode = accessCode !== undefined ? accessCode : studentPin;
        if (resolvedAccessCode !== undefined) {
            db.prepare('UPDATE exams SET student_pin = ? WHERE id = ?').run(resolvedAccessCode, id);
        }

        // Wrap in transaction for sessions, ann, subjects
        const transaction = db.transaction(() => {
            // Update sessions
            if (sessions !== undefined) {
                db.prepare('DELETE FROM sessions WHERE exam_id = ?').run(id);
                const insertSession = db.prepare('INSERT INTO sessions (exam_id, name, name_en, start_time, end_time, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
                sessions.forEach((s: any, idx: number) => {
                    insertSession.run(id, s.name || '', s.name_en || '', s.startTime || '', s.endTime || '', idx);
                });
            }

            // Update announcements
            if (announcements !== undefined) {
                db.prepare('DELETE FROM announcements WHERE exam_id = ?').run(id);
                const insertAnn = db.prepare('INSERT INTO announcements (exam_id, content, content_en, sort_order) VALUES (?, ?, ?, ?)');
                announcements.forEach((a: any, idx: number) => {
                    const content = typeof a === 'string' ? a : a.content;
                    const content_en = typeof a === 'string' ? '' : a.content_en;
                    insertAnn.run(id, content || '', content_en || '', idx);
                });
            }

            // Update subjects
            if (subjects !== undefined) {
                db.prepare('DELETE FROM subjects WHERE exam_id = ?').run(id);
                const insertSubject = db.prepare('INSERT INTO subjects (exam_id, subject_id, name, folder, pin) VALUES (?, ?, ?, ?, ?)');
                subjects.forEach((s: any) => {
                    insertSubject.run(id, s.subject_id || '', s.name || '', s.folder || '', s.pin || '');
                });
            }
        });

        transaction();

        // 4. File sharing toggle
        if (data.fileSharingEnabled !== undefined) {
            const enabled = !!data.fileSharingEnabled;
            db.prepare('UPDATE exams SET file_sharing_enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);

            if (enabled) {
                try {
                    const examDir = path.join(process.cwd(), 'data', String(id));
                    if (!fs.existsSync(examDir)) {
                        fs.mkdirSync(examDir, { recursive: true });
                        console.log(`Created directory: ${examDir}`);
                    }
                } catch (e) {
                    console.error(`PERMISSION ERROR: Failed to create directory for exam ${id}. Please check data/ folder permissions.`, e);
                    // We don't throw here to allow other config updates to succeed
                }
            }
        }

        return getExamById(id);
    } catch (error) {
        console.error('DATABASE ERROR in updateExamConfig:', error);
        throw error;
    }
}

export function getAdminPinForExam(id: number | string) {
    const exam = db.prepare('SELECT admin_pin FROM exams WHERE id = ?').get(id) as any;
    return exam?.admin_pin || null;
}

export function logFileAction(examId: number | string | null, subjectFolder: string | null, filename: string | null, action: string, adminPin?: string | null, ip?: string | null) {
    try {
        db.prepare('INSERT INTO file_logs (exam_id, subject_folder, filename, action, admin_pin, ip) VALUES (?, ?, ?, ?, ?, ?)')
            .run(examId || null, subjectFolder || null, filename || null, action, adminPin || null, ip || null);
    } catch (e) {
        console.error('Failed to write file log', e);
    }
}

export default db;
