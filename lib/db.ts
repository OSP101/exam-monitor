import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'exam-monitor.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
    CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        exam_title TEXT NOT NULL DEFAULT 'การสอบ',
        admin_pin TEXT NOT NULL DEFAULT 'admin1234'
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        folder TEXT NOT NULL,
        pin TEXT NOT NULL
    );

    -- Insert default config if not exists
    INSERT OR IGNORE INTO config (id, exam_title, admin_pin) VALUES (1, 'การสอบกลางภาค', 'admin1234');
`);

// Helper functions
export function getConfig() {
    const config = db.prepare('SELECT * FROM config WHERE id = 1').get() as any;
    const sessions = db.prepare('SELECT * FROM sessions ORDER BY sort_order ASC, id ASC').all();
    const announcements = db.prepare('SELECT * FROM announcements ORDER BY sort_order ASC, id ASC').all();
    const subjects = db.prepare('SELECT * FROM subjects ORDER BY id ASC').all();

    return {
        examTitle: config?.exam_title || 'การสอบ',
        adminPin: config?.admin_pin || 'admin1234',
        sessions: sessions.map((s: any) => ({
            id: s.id,
            name: s.name,
            startTime: s.start_time,
            endTime: s.end_time
        })),
        announcements: announcements.map((a: any) => a.content),
        subjects: subjects.map((s: any) => ({
            id: s.subject_id,
            name: s.name,
            folder: s.folder,
            pin: s.pin
        }))
    };
}

export function updateConfig(data: any) {
    const { examTitle, sessions, announcements, subjects } = data;

    // Update main config
    if (examTitle !== undefined) {
        db.prepare('UPDATE config SET exam_title = ? WHERE id = 1').run(examTitle);
    }

    // Update sessions - delete all and re-insert
    if (sessions !== undefined) {
        db.prepare('DELETE FROM sessions').run();
        const insertSession = db.prepare('INSERT INTO sessions (name, start_time, end_time, sort_order) VALUES (?, ?, ?, ?)');
        sessions.forEach((s: any, idx: number) => {
            insertSession.run(s.name, s.startTime, s.endTime, idx);
        });
    }

    // Update announcements - delete all and re-insert
    if (announcements !== undefined) {
        db.prepare('DELETE FROM announcements').run();
        const insertAnn = db.prepare('INSERT INTO announcements (content, sort_order) VALUES (?, ?)');
        announcements.forEach((content: string, idx: number) => {
            insertAnn.run(content, idx);
        });
    }

    // Update subjects if provided
    if (subjects !== undefined) {
        db.prepare('DELETE FROM subjects').run();
        const insertSubject = db.prepare('INSERT INTO subjects (subject_id, name, folder, pin) VALUES (?, ?, ?, ?)');
        subjects.forEach((s: any) => {
            insertSubject.run(s.id, s.name, s.folder, s.pin);
        });
    }

    return getConfig();
}

export function getAdminPin() {
    const config = db.prepare('SELECT admin_pin FROM config WHERE id = 1').get() as any;
    return config?.admin_pin || 'admin1234';
}

// Initialize with data from JSON if database is empty
export function migrateFromJson() {
    const sessions = db.prepare('SELECT COUNT(*) as count FROM sessions').get() as any;
    const subjects = db.prepare('SELECT COUNT(*) as count FROM subjects').get() as any;

    // Only migrate if database is empty
    if (sessions.count === 0 || subjects.count === 0) {
        const jsonPath = path.join(process.cwd(), 'data', 'config.json');
        if (fs.existsSync(jsonPath)) {
            try {
                const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

                // Migrate config
                if (jsonData.examTitle) {
                    db.prepare('UPDATE config SET exam_title = ? WHERE id = 1').run(jsonData.examTitle);
                }
                if (jsonData.adminPin) {
                    db.prepare('UPDATE config SET admin_pin = ? WHERE id = 1').run(jsonData.adminPin);
                }

                // Migrate sessions
                if (jsonData.sessions && sessions.count === 0) {
                    const insertSession = db.prepare('INSERT INTO sessions (name, start_time, end_time, sort_order) VALUES (?, ?, ?, ?)');
                    jsonData.sessions.forEach((s: any, idx: number) => {
                        insertSession.run(s.name, s.startTime, s.endTime, idx);
                    });
                }

                // Migrate announcements
                if (jsonData.announcements) {
                    db.prepare('DELETE FROM announcements').run();
                    const insertAnn = db.prepare('INSERT INTO announcements (content, sort_order) VALUES (?, ?)');
                    jsonData.announcements.forEach((content: string, idx: number) => {
                        insertAnn.run(content, idx);
                    });
                }

                // Migrate subjects
                if (jsonData.subjects && subjects.count === 0) {
                    const insertSubject = db.prepare('INSERT INTO subjects (subject_id, name, folder, pin) VALUES (?, ?, ?, ?)');
                    jsonData.subjects.forEach((s: any) => {
                        insertSubject.run(s.id, s.name, s.folder, s.pin);
                    });
                }

                console.log('Migrated data from config.json to SQLite');
            } catch (e) {
                console.error('Error migrating from JSON:', e);
            }
        }
    }
}

// Run migration on load
migrateFromJson();

export default db;
