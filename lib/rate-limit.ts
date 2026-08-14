import db from '@/lib/db';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

db.prepare(`
    CREATE TABLE IF NOT EXISTS rate_limit (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        locked_until INTEGER NOT NULL DEFAULT 0
    )
`).run();

export function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    const realIp = request.headers.get('x-real-ip');
    return realIp || 'unknown';
}

export function isRateLimited(key: string): boolean {
    const row = db.prepare('SELECT locked_until FROM rate_limit WHERE key = ?').get(key) as any;
    if (!row) return false;
    if (row.locked_until > Date.now()) return true;
    if (row.locked_until > 0) {
        db.prepare('DELETE FROM rate_limit WHERE key = ?').run(key);
    }
    return false;
}

export function recordFailedAttempt(key: string): void {
    const now = Date.now();
    db.transaction(() => {
        const row = db.prepare('SELECT count, locked_until FROM rate_limit WHERE key = ?').get(key) as any;
        const nextCount = (row?.count || 0) + 1;
        if (nextCount >= MAX_ATTEMPTS) {
            db.prepare(`
                INSERT INTO rate_limit (key, count, locked_until) VALUES (?, 0, ?)
                ON CONFLICT(key) DO UPDATE SET count = 0, locked_until = excluded.locked_until
            `).run(key, now + LOCKOUT_MS);
        } else {
            db.prepare(`
                INSERT INTO rate_limit (key, count, locked_until) VALUES (?, ?, 0)
                ON CONFLICT(key) DO UPDATE SET count = excluded.count
            `).run(key, nextCount);
        }
    })();
}

export function clearAttempts(key: string): void {
    db.prepare('DELETE FROM rate_limit WHERE key = ?').run(key);
}
