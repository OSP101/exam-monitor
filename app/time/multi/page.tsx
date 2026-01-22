'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { Monitor, ArrowLeft, Clock, Megaphone, AlertCircle, Languages } from 'lucide-react';
import { useLocale } from '@/lib/LocaleContext';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function ExamMonitorCell({ id }: { id: string }) {
    const { data: config, error } = useSWR(`/api/exams/${id}`, fetcher, { refreshInterval: 5000 });
    const { locale, t } = useLocale();
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [status, setStatus] = useState<'WAITING' | 'RUNNING' | 'EXPIRED'>('WAITING');
    const [currentSessionName, setCurrentSessionName] = useState('');
    const [currentSessionNameEn, setCurrentSessionNameEn] = useState('');

    useEffect(() => {
        if (!config?.sessions) return;

        const calculate = () => {
            const now = new Date().getTime();

            // Find current/next session
            let session = config.sessions.find((s: any) => {
                const start = new Date(s.startTime).getTime();
                const end = new Date(s.endTime).getTime();
                return now >= start && now < end;
            });

            if (!session) {
                session = config.sessions.find((s: any) => new Date(s.startTime).getTime() > now);
            }

            if (!session && config.sessions.length > 0) {
                session = config.sessions[config.sessions.length - 1];
            }

            if (!session) return;
            setCurrentSessionName(session.name);
            setCurrentSessionNameEn(session.name_en || '');
            const start = new Date(session.startTime).getTime();
            const end = new Date(session.endTime).getTime();

            if (now < start) {
                setStatus('WAITING');
                const diff = start - now;
                setTimeLeft({
                    hours: Math.floor(diff / (1000 * 60 * 60)),
                    minutes: Math.floor((diff / 1000 / 60) % 60),
                    seconds: Math.floor((diff / 1000) % 60),
                });
            } else if (now < end) {
                setStatus('RUNNING');
                const diff = end - now;
                setTimeLeft({
                    hours: Math.floor(diff / (1000 * 60 * 60)),
                    minutes: Math.floor((diff / 1000 / 60) % 60),
                    seconds: Math.floor((diff / 1000) % 60),
                });
            } else {
                setStatus('EXPIRED');
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
            }
        };

        const timer = setInterval(calculate, 1000);
        calculate();
        return () => clearInterval(timer);
    }, [config]);

    if (error) return (
        <div style={{ padding: '20px', backgroundColor: '#fee2e2', borderRadius: '16px', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c' }}>
            <AlertCircle size={20} /> Error loading ID {id}
        </div>
    );

    if (!config) return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: '16px' }}>
            <div style={{ width: '24px', height: '24px', border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
    );

    const statusColors: any = {
        WAITING: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d', label: t('waiting') },
        RUNNING: { bg: '#dcfce7', text: '#15803d', border: '#86efac', label: t('running') },
        EXPIRED: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5', label: t('expired') }
    };
    const style = statusColors[status];

    return (
        <div style={{
            height: '100%',
            backgroundColor: 'white',
            borderRadius: '20px',
            border: `3px solid ${status === 'RUNNING' ? '#3b82f6' : '#e2e8f0'}`,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1e3a8a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{locale === 'en' ? (config.title_en || config.examTitle) : config.examTitle}</h3>
                    <div style={{
                        padding: '4px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: 'bold',
                        backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}`
                    }}>
                        {style.label}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '15px', fontWeight: '500' }}>
                    <Clock size={16} /> {locale === 'en' ? (currentSessionNameEn || currentSessionName) : (currentSessionName || t('waiting'))}
                </div>
            </div>

            {/* Timer Body */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '4px', margin: '20px 0' }}>
                <span style={{ fontSize: '84px', fontWeight: '900', color: status === 'RUNNING' ? '#2563eb' : '#475569', fontFamily: 'monospace', letterSpacing: '-2px' }}>
                    {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                </span>
            </div>

            {/* Announcements Mini */}
            {config.announcements?.length > 0 && (
                <div style={{
                    backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0',
                    display: 'flex', gap: '10px', alignItems: 'center'
                }}>
                    <Megaphone size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                    <div style={{ fontSize: '14px', color: '#334155', fontWeight: '600', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
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
