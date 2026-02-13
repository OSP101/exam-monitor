'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { Monitor, ArrowLeft, Clock, Megaphone, AlertCircle, Languages } from 'lucide-react';
import { useLocale } from '@/lib/LocaleContext';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
    const [currentTimeStr, setCurrentTimeStr] = useState('');

    useEffect(() => {
        const calculate = () => {
            const now = new Date();
            const nowTime = now.getTime();

            // Update current time string
            setCurrentTimeStr(now.toLocaleTimeString(locale === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

            if (!config?.sessions) return;

            // Find current/next session
            let session = config.sessions.find((s: any) => {
                const start = new Date(s.startTime).getTime();
                const end = new Date(s.endTime).getTime();
                return nowTime >= start && nowTime < end;
            });

            if (!session) {
                session = config.sessions.find((s: any) => new Date(s.startTime).getTime() > nowTime);
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

    const isUrgent = status === 'RUNNING' && timeLeft.hours === 0 && timeLeft.minutes < 5;
    const isWarning = status === 'RUNNING' && !isUrgent && timeLeft.hours === 0 && timeLeft.minutes < 30;

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

    let timerColor = status === 'RUNNING' ? '#1e3a8a' : '#475569';
    if (isUrgent) timerColor = '#ef4444';
    else if (isWarning) timerColor = '#d97706';

    const borderColor = isUrgent ? '#ef4444' : (isWarning ? '#f59e0b' : (status === 'RUNNING' ? '#3b82f6' : '#e2e8f0'));
    const borderStyle = isUrgent ? '3px solid' : (isWarning ? '3px solid' : (status === 'RUNNING' ? '3px solid' : '1px solid'));

    return (
        <div style={{
            height: '100%',
            backgroundColor: 'white',
            borderRadius: '24px',
            border: `${borderStyle} ${borderColor}`,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: status === 'RUNNING' ? '0 10px 30px -5px rgba(59, 130, 246, 0.2)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            position: 'relative',
            transition: 'all 0.3s ease',
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
                            backgroundColor: isUrgent ? '#fef2f2' : (isWarning ? '#fffbeb' : '#f8fafc'), borderRadius: '20px',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)', padding: '20px 32px',
                            border: `2px solid ${isUrgent ? '#fca5a5' : (isWarning ? '#fcd34d' : '#e2e8f0')}`,
                            minWidth: '140px', textAlign: 'center'
                        }}>
                            <span style={{ fontSize: '96px', fontWeight: '900', color: timerColor, fontFamily: 'monospace', lineHeight: 1 }}>
                                {String(timeLeft.hours).padStart(2, '0')}
                            </span>
                        </div>
                        <span style={{ fontSize: '18px', color: isUrgent ? '#ef4444' : (isWarning ? '#d97706' : '#64748b'), marginTop: '12px', fontWeight: '700' }}>{t('hour')}</span>
                    </div>

                    <span style={{ fontSize: '32px', color: '#cbd5e1', fontWeight: '300', marginBottom: '40px' }}>:</span>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                            backgroundColor: isUrgent ? '#fef2f2' : (isWarning ? '#fffbeb' : '#f8fafc'), borderRadius: '20px',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)', padding: '20px 32px',
                            border: `2px solid ${isUrgent ? '#fca5a5' : (isWarning ? '#fcd34d' : '#e2e8f0')}`,
                            minWidth: '140px', textAlign: 'center'
                        }}>
                            <span style={{ fontSize: '96px', fontWeight: '900', color: timerColor, fontFamily: 'monospace', lineHeight: 1 }}>
                                {String(timeLeft.minutes).padStart(2, '0')}
                            </span>
                        </div>
                        <span style={{ fontSize: '18px', color: isUrgent ? '#ef4444' : (isWarning ? '#d97706' : '#64748b'), marginTop: '12px', fontWeight: '700' }}>{t('minute')}</span>
                    </div>

                    <span style={{ fontSize: '32px', color: '#cbd5e1', fontWeight: '300', marginBottom: '40px' }}>:</span>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                            backgroundColor: isUrgent ? '#fef2f2' : (isWarning ? '#fffbeb' : '#f8fafc'), borderRadius: '20px',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)', padding: '20px 32px',
                            border: `2px solid ${isUrgent ? '#fca5a5' : (isWarning ? '#fcd34d' : '#e2e8f0')}`,
                            minWidth: '140px', textAlign: 'center'
                        }}>
                            <span style={{ fontSize: '96px', fontWeight: '900', color: timerColor, fontFamily: 'monospace', lineHeight: 1 }}>
                                {String(timeLeft.seconds).padStart(2, '0')}
                            </span>
                        </div>
                        <span style={{ fontSize: '18px', color: isUrgent ? '#ef4444' : (isWarning ? '#d97706' : '#64748b'), marginTop: '12px', fontWeight: '700' }}>{t('second')}</span>
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
                <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none', fontWeight: 'bold' }}>
                    <ArrowLeft size={20} /> {t('back')}
                </Link>
            </header>

            <Suspense fallback={<div style={{ textAlign: 'center', padding: '100px' }}>Loading...</div>}>
                <MultiMonitorContent />
            </Suspense>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
