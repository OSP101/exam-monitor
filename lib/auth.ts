import crypto from 'crypto';
import db, { getAdminPinForExam } from '@/lib/db';

const SESSION_COOKIE = 'admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export function getMasterPin(): string {
    return process.env.ADMIN_MASTER_PIN || 'admin1234';
}

function getSessionSecret(): string {
    return process.env.ADMIN_SESSION_SECRET || 'exam-monitor-session-secret';
}

export function createSessionToken(): string {
    const payload = String(Date.now());
    const signature = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('hex');
    return `${payload}.${signature}`;
}

export function verifySessionToken(token: string | null | undefined): boolean {
    if (!token) return false;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return false;

    const expected = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

    const issuedAt = Number(payload);
    if (!Number.isFinite(issuedAt)) return false;
    return Date.now() - issuedAt < SESSION_TTL_SECONDS * 1000;
}

export function getSessionTokenFromRequest(request: Request): string | null {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]*)`));
    return match ? match[1] : null;
}

export function isAdminAuthenticated(request: Request): boolean {
    return verifySessionToken(getSessionTokenFromRequest(request));
}

export function buildSessionCookie(): string {
    const token = createSessionToken();
    return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie(): string {
    return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function verifyAdminPin(request: Request, examId: string | number, pin?: string | null): boolean {
    if (isAdminAuthenticated(request)) return true;
    if (!pin) return false;
    if (pin === getMasterPin()) return true;
    const currentAdminPin = getAdminPinForExam(examId);
    return !!currentAdminPin && pin === currentAdminPin;
}

export function verifyAnyAdminPin(request: Request, pin?: string | null): boolean {
    if (isAdminAuthenticated(request)) return true;
    if (!pin) return false;
    if (pin === getMasterPin()) return true;

    const row = db.prepare('SELECT COUNT(*) as c FROM exams WHERE admin_pin = ?').get(pin) as any;
    return !!(row && row.c > 0);
}
