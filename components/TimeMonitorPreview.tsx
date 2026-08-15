'use client';

import { useEffect, useMemo, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { useLocale } from '@/lib/LocaleContext';

const hexToRgb = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const lerpColor = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number) => ({
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
});
const darken = (c: { r: number; g: number; b: number }, f: number) => ({
    r: Math.round(c.r * f), g: Math.round(c.g * f), b: Math.round(c.b * f),
});
const rgb = (c: { r: number; g: number; b: number }) => `rgb(${c.r}, ${c.g}, ${c.b})`;
const rgba = (c: { r: number; g: number; b: number }, a: number) => `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;
const BLUE = hexToRgb('#3b82f6');
const YELLOW = hexToRgb('#f59e0b');
const RED = hexToRgb('#ef4444');
const DARK_RED = hexToRgb('#b91c1c');
// Smooth gradient: 100%->15% blue, 15%->6% yellow, <6% red->dark red
const colorFromRatio = (ratio: number) => {
    if (ratio >= 0.15) return lerpColor(BLUE, YELLOW, (1 - ratio) / 0.85);
    if (ratio >= 0.06) return lerpColor(YELLOW, RED, (0.15 - ratio) / 0.09);
    return lerpColor(RED, DARK_RED, (0.06 - ratio) / 0.06);
};

type Session = {
    name?: string;
    name_en?: string;
    startTime?: string;
    endTime?: string;
};

export default function TimeMonitorPreview({
    title,
    titleEn,
    sessions,
    announcements,
}: {
    title: string;
    titleEn: string;
    sessions: Session[];
    announcements: any[];
}) {
    const { locale, t } = useLocale();
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const active = useMemo(() => {
        if (!sessions || sessions.length === 0) return null;

        let idx = sessions.findIndex((s: Session) => {
            const start = new Date(s.startTime || '').getTime();
            const end = new Date(s.endTime || '').getTime();
            return !isNaN(start) && !isNaN(end) && now >= start && now < end;
        });

        if (idx === -1) {
            idx = sessions.findIndex((s: Session) => {
                const start = new Date(s.startTime || '').getTime();
                return !isNaN(start) && start > now;
            });
        }

        if (idx === -1) idx = sessions.length - 1;

        return { idx, session: sessions[idx] };
    }, [sessions, now]);

    const status: 'WAITING' | 'RUNNING' | 'EXPIRED' = useMemo(() => {
        if (!active) return 'WAITING';
        const start = new Date(active.session.startTime || '').getTime();
        const end = new Date(active.session.endTime || '').getTime();
        if (isNaN(start) || isNaN(end)) return 'WAITING';
        if (now < start) return 'WAITING';
        if (now < end) return 'RUNNING';
        return 'EXPIRED';
    }, [active, now]);

    const timeLeft = useMemo(() => {
        if (!active) return { hours: 0, minutes: 0, seconds: 0 };
        const start = new Date(active.session.startTime || '').getTime();
        const end = new Date(active.session.endTime || '').getTime();
        const target = status === 'WAITING' ? start : end;
        if (isNaN(target)) return { hours: 0, minutes: 0, seconds: 0 };
        const diff = Math.max(0, target - now);
        return {
            hours: Math.floor(diff / 3600000),
            minutes: Math.floor((diff / 60000) % 60),
            seconds: Math.floor((diff / 1000) % 60),
        };
    }, [active, status, now]);

    const currentTime = useMemo(
        () => new Date(now).toLocaleTimeString(locale === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        [now, locale]
    );

    const sessionTimeRange = useMemo(() => {
        if (!active) return '';
        const start = new Date(active.session.startTime || '').getTime();
        const end = new Date(active.session.endTime || '').getTime();
        if (isNaN(start) || isNaN(end)) return '';
        const fmt = (ts: number) => new Date(ts).toLocaleTimeString(locale === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' });
        return `${fmt(start)} - ${fmt(end)}`;
    }, [active, locale]);

    const displayTitle = locale === 'en' && titleEn?.trim() ? titleEn.trim() : title;

    let theme: any;
    let isPulsing = false;

    if (status === 'RUNNING' && active) {
        const start = new Date(active.session.startTime || '').getTime();
        const end = new Date(active.session.endTime || '').getTime();
        const total = end - start;
        const remainMs = (timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds) * 1000;
        const ratio = total > 0 ? remainMs / total : 1;
        const c = colorFromRatio(ratio);
        isPulsing = ratio <= 0.06;
        theme = {
            ring: rgb(c),
            text: rgb(darken(c, 0.75)),
            glow: rgba(c, 0.35),
            bg1: rgba(c, 0.06),
            bg2: rgba(c, 0.15),
        };
    } else if (status === 'WAITING') {
        theme = { ring: rgb(YELLOW), text: '#b45309', glow: rgba(YELLOW, 0.25), bg1: rgba(YELLOW, 0.06), bg2: rgba(YELLOW, 0.15) };
    } else {
        theme = { ring: rgb(RED), text: '#b91c1c', glow: rgba(RED, 0.3), bg1: rgba(RED, 0.06), bg2: rgba(RED, 0.15) };
    }

    const statusStyles: any = {
        WAITING: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d', label: t('waiting') },
        RUNNING: { bg: '#d1fae5', text: '#047857', border: '#6ee7b7', label: t('running') },
        EXPIRED: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5', label: t('expired') },
    };
    const statusStyle = statusStyles[status];

    const hasAnyData = !!(title?.trim() || sessions?.length || announcements?.length);

    if (!hasAnyData) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '360px', color: '#64748b', fontSize: '15px', textAlign: 'center', padding: '24px', border: '2px dashed #334155', borderRadius: '20px' }}>
                {locale === 'en'
                    ? 'Preview will appear here as you fill in the exam details.'
                    : 'ตัวอย่างจะแสดงที่นี่เมื่อคุณกรอกข้อมูล'}
            </div>
        );
    }

    return (
        <div style={{
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid #334155',
            background: `linear-gradient(180deg, ${theme.bg1} 0%, ${theme.bg2} 100%)`,
            transition: 'background 0.8s ease',
            position: 'relative',
            minHeight: '440px',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
        }}>
            <style>{`
                @keyframes preview-edge-pulse {
                    0% { box-shadow: inset 0 0 0 4px ${theme.glow}, inset 0 0 20px 0 rgba(239,68,68,0); }
                    50% { box-shadow: inset 0 0 0 10px ${theme.ring}, inset 0 0 60px 0 ${theme.glow}; }
                    100% { box-shadow: inset 0 0 0 4px ${theme.glow}, inset 0 0 20px 0 rgba(239,68,68,0); }
                }
            `}</style>
            <div style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                boxShadow: `inset 0 0 0 5px ${theme.glow}`,
                animation: isPulsing ? 'preview-edge-pulse 1s ease-in-out infinite' : 'none',
            }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', position: 'relative' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e40af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                    {displayTitle || (locale === 'en' ? 'Untitled exam' : 'ห้องสอบที่ยังไม่ได้ตั้งชื่อ')}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    {active && sessions.length > 0 && (
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                            {locale === 'th' ? `รอบ ${active.idx + 1} / ${sessions.length}` : `Session ${active.idx + 1} / ${sessions.length}`}
                        </span>
                    )}
                    <span style={{ padding: '6px 12px', borderRadius: '999px', backgroundColor: statusStyle.bg, color: statusStyle.text, border: `2px solid ${statusStyle.border}`, fontWeight: 'bold', fontSize: '13px' }}>
                        {statusStyle.label}
                    </span>
                </div>
            </div>

            {/* Center timer */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {active ? (
                    <>
                        <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#334155', marginBottom: '10px', textAlign: 'center' }}>
                            {locale === 'en' ? (active.session.name_en || active.session.name || '') : (active.session.name || '')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                            {(['hours', 'minutes', 'seconds'] as const).map((k, i) => (
                                <div key={k} style={{ display: 'flex', alignItems: 'flex-start' }}>
                                    {i > 0 && (
                                        <span style={{ fontSize: '26px', color: theme.text, opacity: 0.45, fontWeight: 300, margin: '12px 2px 0', transition: 'color 1s linear' }}>:</span>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '10px 16px', border: '2px solid #dbeafe', minWidth: '84px', textAlign: 'center' }}>
                                            <span style={{ fontSize: '46px', fontWeight: 900, color: theme.text, fontFamily: 'monospace', lineHeight: 1, transition: 'color 1s linear' }}>
                                                {String(timeLeft[k]).padStart(2, '0')}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '11px', color: '#64748b', marginTop: '5px', fontWeight: 600 }}>
                                            {t(k === 'hours' ? 'hour' : k === 'minutes' ? 'minute' : 'second')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '10px', fontSize: '13px', color: '#64748b' }}>
                            {t('current_time')}: <span style={{ fontWeight: 'bold', color: '#1e40af', fontFamily: 'monospace' }}>{currentTime}</span>
                        </div>
                    </>
                ) : (
                    <div style={{ fontSize: '17px', color: '#94a3b8' }}>
                        {locale === 'en' ? 'No sessions yet' : 'ยังไม่มีรอบการสอบ'}
                    </div>
                )}
            </div>

            {/* Announcements */}
            {announcements?.length > 0 && (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '14px', padding: '12px 16px', border: '2px solid #bfdbfe', marginTop: '12px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #e0e7ff' }}>
                        <Megaphone size={16} color="#d97706" />
                        <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#334155' }}>{t('announcements')}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                        {announcements.map((item: any, index: number) => {
                            const content = typeof item === 'string' ? item : (locale === 'en' ? (item.content_en || item.content) : item.content);
                            if (!content) return null;
                            return (
                                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#334155' }}>
                                    <span style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                                        {index + 1}
                                    </span>
                                    <p style={{ margin: 0, lineHeight: 1.4, fontWeight: 'bold' }}>{content}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e0e7ff', position: 'relative' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {locale === 'en' ? 'Time Monitor Preview' : 'ตัวอย่างหน้าจอเวลา'}
                </span>
                {sessionTimeRange && <span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>{sessionTimeRange}</span>}
            </div>
        </div>
    );
}
