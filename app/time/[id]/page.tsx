'use client';

import { useState, useEffect, useRef, use } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Settings, Lock, Unlock, Shield, Megaphone, ArrowLeft, Languages } from 'lucide-react';
import { useLocale } from '@/lib/LocaleContext';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TimePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    // Real-time sync: refresh every 3 seconds
    const { data: config } = useSWR(`/api/exams/${id}`, fetcher, { refreshInterval: 3000 });
    const { locale, setLocale, t } = useLocale();

    // Server/client clock offset (ms) so the countdown matches the server even
    // if the projector machine's clock is wrong.
    const serverOffsetRef = useRef(0);
    useEffect(() => {
        if (typeof config?.serverTime === 'number') {
            serverOffsetRef.current = config.serverTime - Date.now();
        }
    }, [config]);

    const [isLocked, setIsLocked] = useState(true);
    const [pin, setPin] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [status, setStatus] = useState<'WAITING' | 'RUNNING' | 'EXPIRED'>('WAITING');
    const [currentTime, setCurrentTime] = useState('');

    // Helper to find the best session to display based on current time
    const getActiveSessionIndex = (sessions: any[]) => {
        if (!sessions || sessions.length === 0) return 0;
        const now = Date.now() + serverOffsetRef.current;

        // 1. Try to find a session that is CURRENTLY RUNNING
        let idx = sessions.findIndex((s: any) => {
            const start = new Date(s.startTime).getTime();
            const end = new Date(s.endTime).getTime();
            return now >= start && now < end;
        });

        // 2. If nothing running, find the NEXT UPCOMING session
        if (idx === -1) {
            idx = sessions.findIndex((s: any) => new Date(s.startTime).getTime() > now);
        }

        // 3. Fallback to the LAST session if everything is in the past
        if (idx === -1) {
            idx = sessions.length - 1;
        }

        return idx;
    };

    // Update index when config loads
    useEffect(() => {
        if (config?.sessions) {
            const idx = getActiveSessionIndex(config.sessions);
            setCurrentSessionIndex(idx);
        }
    }, [config]);

    const currentSession = config?.sessions?.[currentSessionIndex];

    // Timer calculation
    useEffect(() => {
        if (!currentSession) return;

        const calculateTime = () => {
            const now = Date.now() + serverOffsetRef.current;

            // Re-check if we should be on a different session (automatic transition)
            if (config?.sessions) {
                const bestIdx = getActiveSessionIndex(config.sessions);
                if (bestIdx !== currentSessionIndex) {
                    setCurrentSessionIndex(bestIdx);
                    return; // Next interval will pick up the new session
                }
            }

            const start = new Date(currentSession.startTime).getTime();
            const end = new Date(currentSession.endTime).getTime();

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

            // Update current time
            setCurrentTime(new Date(now).toLocaleTimeString(locale === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };

        calculateTime();
        const timer = setInterval(calculateTime, 1000);
        return () => clearInterval(timer);
    }, [currentSession]);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminPin: pin, examId: id })
            });
            if (res.ok) {
                setIsLocked(false);
                setErrorMsg('');
                setPin('');
            } else {
                const data = await res.json().catch(() => null);
                setErrorMsg(data?.error || t('incorrect_pin'));
                setPin('');
            }
        } catch {
            setErrorMsg(t('incorrect_pin'));
            setPin('');
        }
    };

    if (!config) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '60px', height: '60px', border: '5px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (config.error) {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                <h1 style={{ color: '#ef4444', marginBottom: '16px' }}>ไม่พบรอบการสอบนี้</h1>
                <Link href="/" style={{ color: '#3b82f6', fontWeight: 'bold' }}>กลับหน้าแรก</Link>
            </div>
        );
    }

    // Lock Screen
    if (isLocked) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                <div style={{
                    width: '100%',
                    maxWidth: '420px',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    borderRadius: '24px',
                    padding: '40px',
                    boxShadow: '0 25px 50px rgba(59,130,246,0.2)',
                    border: '2px solid #bfdbfe'
                }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none', marginBottom: '24px', fontSize: '14px' }}>
                        <ArrowLeft style={{ width: '16px', height: '16px' }} /> {t('back')}
                    </Link>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                        <div style={{ padding: '20px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 10px 30px rgba(59,130,246,0.4)' }}>
                            <Shield style={{ width: '40px', height: '40px', color: 'white' }} />
                        </div>
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', color: '#1e40af', marginBottom: '8px' }}>{locale === 'en' ? (config.title_en || config.examTitle) : config.examTitle}</h1>
                    <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '24px' }}>{t('enter_pin')}</p>

                    <form onSubmit={handleUnlock}>
                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder={t('admin_pin')}
                            style={{
                                width: '100%', padding: '16px', backgroundColor: 'white', border: '3px solid #bfdbfe', borderRadius: '16px',
                                textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: '#1e40af', marginBottom: '16px', outline: 'none'
                            }}
                            autoFocus
                        />
                        {errorMsg && <p style={{ color: '#dc2626', textAlign: 'center', fontWeight: '600', marginBottom: '16px' }}>{errorMsg}</p>}
                        <button
                            type="submit"
                            style={{
                                width: '100%', padding: '18px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white',
                                fontWeight: 'bold', fontSize: '20px', border: 'none', borderRadius: '16px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
                            }}
                        >
                            <Unlock style={{ width: '24px', height: '24px' }} /> {t('login')}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Status styles
    const statusStyles: any = {
        WAITING: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d', label: t('waiting') },
        RUNNING: { bg: '#d1fae5', text: '#047857', border: '#6ee7b7', label: t('running') },
        EXPIRED: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5', label: t('expired') }
    };
    const currentStyle = statusStyles[status];

    // Active Monitor
    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e40af', margin: 0 }}>{locale === 'en' ? (config.title_en || config.examTitle) : config.examTitle}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {currentSession && (
                        <span style={{ fontSize: '18px', color: '#64748b', fontWeight: '500' }}>
                            {locale === 'th' ? `รอบ ${currentSessionIndex + 1} / ${config.sessions.length}` : `Session ${currentSessionIndex + 1} / ${config.sessions.length}`}
                        </span>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setLocale('th')} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #bfdbfe', backgroundColor: locale === 'th' ? '#3b82f6' : 'white', color: locale === 'th' ? 'white' : '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>TH</button>
                        <button onClick={() => setLocale('en')} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #bfdbfe', backgroundColor: locale === 'en' ? '#3b82f6' : 'white', color: locale === 'en' ? 'white' : '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>EN</button>
                    </div>
                    <button
                        onClick={() => setIsLocked(true)}
                        style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.8)', border: '2px solid #bfdbfe', cursor: 'pointer' }}
                    >
                        <Lock style={{ width: '24px', height: '24px', color: '#64748b' }} />
                    </button>
                </div>
            </header>

            <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {currentSession ? (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '40px', fontWeight: 'bold', color: '#334155', margin: 0 }}>{locale === 'en' ? (currentSession.name_en || currentSession.name) : currentSession.name}</h2>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', borderRadius: '999px',
                                backgroundColor: currentStyle.bg, color: currentStyle.text, border: `3px solid ${currentStyle.border}`,
                                fontWeight: 'bold', fontSize: '24px'
                            }}>
                                {currentStyle.label}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                            <TimeUnit value={timeLeft.hours} label={t('hour')} />
                            <span style={{ fontSize: '100px', color: '#93c5fd', fontWeight: '300', lineHeight: 1 }}>:</span>
                            <TimeUnit value={timeLeft.minutes} label={t('minute')} />
                            <span style={{ fontSize: '100px', color: '#93c5fd', fontWeight: '300', lineHeight: 1 }}>:</span>
                            <TimeUnit value={timeLeft.seconds} label={t('second')} />
                        </div>

                        <div style={{ marginTop: '24px', textAlign: 'center' }}>
                            <span style={{ fontSize: '20px', color: '#64748b', marginRight: '12px' }}>{t('current_time')}:</span>
                            <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e40af', fontFamily: 'monospace' }}>{currentTime}</span>
                        </div>
                    </>
                ) : (
                    <p style={{ fontSize: '36px', color: '#94a3b8' }}>ไม่มีรอบสอบที่กำลังดำเนินการ</p>
                )}
            </section>

            {config.announcements?.length > 0 && (
                <section style={{
                    width: '100%', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '20px',
                    padding: '24px 32px', border: '2px solid #bfdbfe', marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #e0e7ff' }}>
                        <Megaphone style={{ width: '28px', height: '28px', color: '#d97706' }} />
                        <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#334155', margin: 0 }}>{t('announcements')}</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {config.announcements.map((item: any, index: number) => {
                            const content = locale === 'en' ? (item.content_en || item.content) : item.content;
                            return (
                                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '26px', color: '#334155' }}>
                                    <span style={{
                                        flexShrink: 0, width: '36px', height: '36px', borderRadius: '50%',
                                        backgroundColor: '#3b82f6', color: 'white', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px'
                                    }}>
                                        {index + 1}
                                    </span>
                                    <p style={{ margin: 0, lineHeight: 1.4, fontWeight: 'bold' }} >{content}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '2px solid #e0e7ff' }}>
                <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none', fontSize: '16px' }}>
                    <Settings style={{ width: '20px', height: '20px' }} />
                    <span>{t('admin_panel')}</span>
                </Link>
                {currentSession && (
                    <span style={{ color: '#64748b', fontSize: '18px', fontFamily: 'monospace' }}>
                        {new Date(currentSession.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(currentSession.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>ExamID: {id}</div>
            </footer>
        </div>
    );
}

function TimeUnit({ value, label }: { value: number, label: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
                backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '20px',
                boxShadow: '0 15px 50px rgba(59,130,246,0.2)', padding: '20px 32px', border: '2px solid #dbeafe'
            }}>
                <span style={{ fontSize: '120px', fontWeight: '900', color: '#2563eb', fontFamily: 'monospace', lineHeight: 1 }}>
                    {String(value).padStart(2, '0')}
                </span>
            </div>
            <span style={{ fontSize: '22px', color: '#64748b', marginTop: '12px', fontWeight: '600' }}>{label}</span>
        </div>
    );
}
