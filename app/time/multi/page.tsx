'use client';

import { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { Monitor, ArrowLeft, Clock, Megaphone, AlertCircle, Maximize, Minimize } from 'lucide-react';
import { useLocale } from '@/lib/LocaleContext';
import Footer from '@/components/Footer';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

// Scaled down TimeUnit for grid view
function TimeUnit({ value, label }: { value: number, label: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
                backgroundColor: '#f8fafc', borderRadius: '20px',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)', padding: '20px 32px', border: '2px solid #e2e8f0',
                minWidth: '140px', textAlign: 'center'
            }}>
                <span style={{ fontSize: '96px', fontWeight: '900', color: '#1e3a8a', fontFamily: 'monospace', lineHeight: 1 }}>
                    {String(value).padStart(2, '0')}
                </span>
            </div>
            <span style={{ fontSize: '18px', color: '#64748b', marginTop: '12px', fontWeight: '700' }}>{label}</span>
        </div>
    );
}

function ExamMonitorCell({ id }: { id: string }) {
    const { data: config, error } = useSWR(`/api/exams/${id}`, fetcher, { refreshInterval: 5000 });
    const { locale, t } = useLocale();
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [status, setStatus] = useState<'WAITING' | 'RUNNING' | 'EXPIRED'>('WAITING');
    const [currentSessionName, setCurrentSessionName] = useState('');
    const [currentSessionNameEn, setCurrentSessionNameEn] = useState('');
    const [sessionTimes, setSessionTimes] = useState<{ start: string, end: string } | null>(null);
    const [remainRatio, setRemainRatio] = useState(1);
    const [currentTimeStr, setCurrentTimeStr] = useState('');

    // Server/client clock offset (ms). Polled separately from the exam config (SWR
    // dedupes this identical key across every open cell into one shared request) and
    // much less often, since clock drift doesn't change second-to-second.
    const { data: serverTimeData } = useSWR('/api/server-time', fetcher, { refreshInterval: 30000 });
    const serverOffsetRef = useRef(0);
    useEffect(() => {
        if (typeof serverTimeData?.time === 'number') {
            serverOffsetRef.current = serverTimeData.time - Date.now();
        }
    }, [serverTimeData]);

    useEffect(() => {
        const calculate = () => {
            const nowTime = Date.now() + serverOffsetRef.current;

            // Update current time string
            setCurrentTimeStr(new Date(nowTime).toLocaleTimeString(locale === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

            if (!config?.sessions) return;

            // Find current/next session
            let session = config.sessions.find((s: any) => {
                const start = new Date(s.startTime).getTime();
                const end = new Date(s.endTime).getTime();
                return nowTime >= start && nowTime < end;
            });

            if (!session) {
                // Pick the session that starts soonest, not just the first one in array
                // order (sessions aren't guaranteed to be stored chronologically).
                let soonestStart = Infinity;
                config.sessions.forEach((s: any) => {
                    const start = new Date(s.startTime).getTime();
                    if (start > nowTime && start < soonestStart) {
                        soonestStart = start;
                        session = s;
                    }
                });
            }

            if (!session && config.sessions.length > 0) {
                // If all finished, show the last one as expired/done
                session = config.sessions[config.sessions.length - 1];
            }

            if (!session) return;

            // Only update state if changed to avoid jitter, but for timer we need strict updates
            setCurrentSessionName(session.name);
            setCurrentSessionNameEn(session.name_en || '');

            const startStr = new Date(session.startTime).toLocaleTimeString(locale === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' });
            const endStr = new Date(session.endTime).toLocaleTimeString(locale === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' });
            setSessionTimes({ start: startStr, end: endStr });

            const start = new Date(session.startTime).getTime();
            const end = new Date(session.endTime).getTime();
            const total = end - start;
            setRemainRatio(total > 0 ? (end - nowTime) / total : 1);

            if (nowTime < start) {
                if (status !== 'WAITING') setStatus('WAITING');
                const diff = start - nowTime;
                setTimeLeft({
                    hours: Math.floor(diff / (1000 * 60 * 60)),
                    minutes: Math.floor((diff / 1000 / 60) % 60),
                    seconds: Math.floor((diff / 1000) % 60),
                });
            } else if (nowTime < end) {
                if (status !== 'RUNNING') setStatus('RUNNING');
                const diff = end - nowTime;
                setTimeLeft({
                    hours: Math.floor(diff / (1000 * 60 * 60)),
                    minutes: Math.floor((diff / 1000 / 60) % 60),
                    seconds: Math.floor((diff / 1000) % 60),
                });
            } else {
                if (status !== 'EXPIRED') setStatus('EXPIRED');
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
            }
        };

        calculate(); // Initial call
        const timer = setInterval(calculate, 1000);
        return () => clearInterval(timer);
    }, [config, locale]);

    if (error) return (
        <div style={{ padding: '20px', backgroundColor: '#fee2e2', borderRadius: '16px', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c' }}>
            <AlertCircle size={20} /> Error loading ID {id}
        </div>
    );

    if (!config) return (
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '20px', border: '2px dashed #cbd5e1' }}>
            <div style={{ width: '30px', height: '30px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
    );

    const isUrgent = status === 'RUNNING' && remainRatio <= 0.06;
    const isWarning = status === 'RUNNING' && !isUrgent && remainRatio <= 0.15;

    // Continuous gradient colors for the timer (blue -> yellow -> red)
    const runningColor = status === 'RUNNING' ? colorFromRatio(remainRatio) : null;
    const timerColor = status === 'RUNNING'
        ? rgb(darken(runningColor!, 0.75))
        : (status === 'WAITING' ? '#d97706' : '#475569');
    const timerBoxBg = status === 'RUNNING' ? rgba(runningColor!, 0.08) : '#f8fafc';
    const timerBoxBorder = status === 'RUNNING' ? rgba(runningColor!, 0.5) : '#e2e8f0';
    const timerLabelColor = status === 'RUNNING' ? rgb(runningColor!) : (status === 'WAITING' ? '#d97706' : '#64748b');
    const cellBorderColor = status === 'RUNNING' ? rgb(runningColor!) : '#e2e8f0';
    const cellBorderStyle = status === 'RUNNING' ? '3px solid' : '1px solid';
    const cellShadow = status === 'RUNNING' ? `0 10px 30px -5px ${rgba(runningColor!, 0.25)}` : '0 4px 6px -1px rgba(0, 0, 0, 0.05)';

    const statusColors: any = {
        WAITING: { bg: '#fffbeb', text: '#d97706', border: '#fcd34d', label: t('waiting') },
        RUNNING: { bg: '#f0fdf4', text: '#166534', border: '#86efac', label: t('running') },
        EXPIRED: { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5', label: t('expired') }
    };

    if (isUrgent) {
        statusColors.RUNNING = { bg: '#fef2f2', text: '#ef4444', border: '#ffa5a5', label: t('running') };
    } else if (isWarning) {
        statusColors.RUNNING = { bg: '#fffbeb', text: '#d97706', border: '#fcd34d', label: t('running') };
    }

    const style = statusColors[status] || statusColors.WAITING;

    return (
        <div style={{
            height: '100%',
            backgroundColor: 'white',
            borderRadius: '24px',
            border: `${cellBorderStyle} ${cellBorderColor}`,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: cellShadow,
            position: 'relative',
            transition: 'all 1s ease',
            animation: isUrgent ? 'pulse-border 0.8s infinite' : 'none'
        }}>
            <style>{`
                @keyframes pulse-border {
                    0% { border-color: #ef4444; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    50% { border-color: #ef4444; box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
                    100% { border-color: #ef4444; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            `}</style>
            {/* Header */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '0 0 4px 0', lineHeight: 1.2 }}>
                            {locale === 'en' ? (config.title_en || config.examTitle) : config.examTitle}
                        </h3>
                        {sessionTimes && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '16px', fontWeight: '600', marginTop: '4px' }}>
                                <Clock size={16} />
                                <span>{sessionTimes.start} - {sessionTimes.end}</span>
                            </div>
                        )}
                    </div>
                    <div style={{
                        padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                        backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}`,
                        whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                        {style.label}
                    </div>
                </div>
                <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500', marginLeft: '2px' }}>
                    {locale === 'en' ? (currentSessionNameEn || currentSessionName) : (currentSessionName || t('waiting'))}
                </div>
            </div>

            {/* Timer Body */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                margin: '12px 0'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                            backgroundColor: timerBoxBg, borderRadius: '20px',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)', padding: '20px 32px',
                            border: `2px solid ${timerBoxBorder}`,
                            minWidth: '140px', textAlign: 'center', transition: 'background 1s linear, border-color 1s linear'
                        }}>
                            <span style={{ fontSize: '96px', fontWeight: '900', color: timerColor, fontFamily: 'monospace', lineHeight: 1, transition: 'color 1s linear' }}>
                                {String(timeLeft.hours).padStart(2, '0')}
                            </span>
                        </div>
                        <span style={{ fontSize: '18px', color: timerLabelColor, marginTop: '12px', fontWeight: '700', transition: 'color 1s linear' }}>{t('hour')}</span>
                    </div>

                    <span style={{ fontSize: '32px', color: '#cbd5e1', fontWeight: '300', marginBottom: '40px' }}>:</span>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                            backgroundColor: timerBoxBg, borderRadius: '20px',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)', padding: '20px 32px',
                            border: `2px solid ${timerBoxBorder}`,
                            minWidth: '140px', textAlign: 'center', transition: 'background 1s linear, border-color 1s linear'
                        }}>
                            <span style={{ fontSize: '96px', fontWeight: '900', color: timerColor, fontFamily: 'monospace', lineHeight: 1, transition: 'color 1s linear' }}>
                                {String(timeLeft.minutes).padStart(2, '0')}
                            </span>
                        </div>
                        <span style={{ fontSize: '18px', color: timerLabelColor, marginTop: '12px', fontWeight: '700', transition: 'color 1s linear' }}>{t('minute')}</span>
                    </div>

                    <span style={{ fontSize: '32px', color: '#cbd5e1', fontWeight: '300', marginBottom: '40px' }}>:</span>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                            backgroundColor: timerBoxBg, borderRadius: '20px',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)', padding: '20px 32px',
                            border: `2px solid ${timerBoxBorder}`,
                            minWidth: '140px', textAlign: 'center', transition: 'background 1s linear, border-color 1s linear'
                        }}>
                            <span style={{ fontSize: '96px', fontWeight: '900', color: timerColor, fontFamily: 'monospace', lineHeight: 1, transition: 'color 1s linear' }}>
                                {String(timeLeft.seconds).padStart(2, '0')}
                            </span>
                        </div>
                        <span style={{ fontSize: '18px', color: timerLabelColor, marginTop: '12px', fontWeight: '700', transition: 'color 1s linear' }}>{t('second')}</span>
                    </div>
                </div>

                <div style={{ marginTop: '24px', fontSize: '18px', color: '#64748b', fontWeight: '500' }}>
                    {t('current_time')}: <span style={{ color: '#1e293b', fontWeight: 'bold' }}>{currentTimeStr}</span>
                </div>
            </div>

            {/* Announcements Mini */}
            {config.announcements?.length > 0 && (
                <div style={{
                    backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '16px',
                    display: 'flex', gap: '10px', alignItems: 'center', marginTop: 'auto'
                }}>
                    <div style={{
                        width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#fbbf24',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <Megaphone size={14} color="white" fill="white" />
                    </div>
                    <div style={{ fontSize: '20px', color: '#334155', fontWeight: '600', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {locale === 'en' ? (config.announcements[0]?.content_en || config.announcements[0]?.content) : config.announcements[0]?.content}
                    </div>
                </div>
            )}
        </div>
    );
}

function MultiMonitorContent() {
    const searchParams = useSearchParams();
    const ids = searchParams.get('ids')?.split(',').filter(id => id) || [];
    const { t } = useLocale();

    const gridStyle = useMemo(() => {
        const count = ids.length;
        if (count <= 1) return { gridTemplateColumns: '1fr' };
        if (count === 2) return { gridTemplateColumns: '1fr 1fr' };
        if (count <= 4) return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };
        return { gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' };
    }, [ids]);

    if (ids.length === 0) return (
        <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <Monitor size={64} style={{ marginBottom: '16px', color: '#cbd5e1' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>{t('home')}</h2>
            <Link href="/admin" style={{ marginTop: '20px', color: '#3b82f6', fontWeight: 'bold', textDecoration: 'none' }}>{t('admin_panel')}</Link>
        </div>
    );

    return (
        <div style={{
            display: 'grid',
            ...gridStyle,
            gap: '24px',
            height: 'calc(100vh - 100px)',
            padding: '12px'
        }}>
            {ids.map(id => (
                <ExamMonitorCell key={id} id={id} />
            ))}
        </div>
    );
}
export default function MultiExamMonitorPage() {
    const { locale, setLocale, t } = useLocale();
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '24px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '0 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '10px', backgroundColor: '#3b82f6', borderRadius: '12px', color: 'white' }}>
                        <Monitor size={24} />
                    </div>
                    <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#1e3a8a', margin: 0 }}>Multi-Exam Monitor</h1>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                        <button onClick={() => setLocale('th')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #bfdbfe', backgroundColor: locale === 'th' ? '#3b82f6' : 'white', color: locale === 'th' ? 'white' : '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>TH</button>
                        <button onClick={() => setLocale('en')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #bfdbfe', backgroundColor: locale === 'en' ? '#3b82f6' : 'white', color: locale === 'en' ? 'white' : '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>EN</button>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={toggleFullscreen}
                        title={isFullscreen ? (locale === 'th' ? 'ออกจากเต็มจอ' : 'Exit fullscreen') : (locale === 'th' ? 'เต็มจอ' : 'Fullscreen')}
                        style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'white', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                    >
                        {isFullscreen ? <Minimize size={20} color="#64748b" /> : <Maximize size={20} color="#64748b" />}
                    </button>
                    <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none', fontWeight: 'bold' }}>
                        <ArrowLeft size={20} /> {t('back')}
                    </Link>
                </div>
            </header>

            <Suspense fallback={<div style={{ textAlign: 'center', padding: '100px' }}>Loading...</div>}>
                <MultiMonitorContent />
            </Suspense>

            <Footer />

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
