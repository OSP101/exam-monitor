'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Settings, Lock, Unlock, Shield, Megaphone } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TimePage() {
    // Real-time sync: refresh every 3 seconds
    const { data: config } = useSWR('/api/config', fetcher, { refreshInterval: 3000 });

    const [isLocked, setIsLocked] = useState(true);
    const [pin, setPin] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [currentSessionIndex, setCurrentSessionIndex] = useState(0);

    // Timer state
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [status, setStatus] = useState<'WAITING' | 'RUNNING' | 'EXPIRED'>('WAITING');
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
        if (config?.sessions) {
            const now = new Date().getTime();
            let foundIndex = config.sessions.findIndex((s: any) => {
                const start = new Date(s.startTime).getTime();
                const end = new Date(s.endTime).getTime();
                return now >= start && now < end;
            });
            if (foundIndex === -1) {
                foundIndex = config.sessions.findIndex((s: any) => new Date(s.startTime).getTime() > now);
            }
            if (foundIndex === -1 && config.sessions.length > 0) {
                foundIndex = config.sessions.length - 1;
            }
            if (foundIndex !== -1) setCurrentSessionIndex(foundIndex);
        }
    }, [config]);

    const currentSession = config?.sessions?.[currentSessionIndex];

    // Timer calculation
    useEffect(() => {
        if (!currentSession) return;

        const calculateTime = () => {
            const now = new Date().getTime();
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
            setCurrentTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };

        calculateTime();
        const timer = setInterval(calculateTime, 1000);
        return () => clearInterval(timer);
    }, [currentSession]);

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (config && pin === config.adminPin) {
            setIsLocked(false);
            setErrorMsg('');
            setPin('');
        } else {
            setErrorMsg('รหัสผ่านไม่ถูกต้อง');
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

    // Lock Screen
    if (isLocked) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                <div style={{
                    width: '100%',
                    maxWidth: '420px',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    borderRadius: '24px',
                    padding: '48px',
                    boxShadow: '0 25px 50px rgba(59,130,246,0.2)',
                    border: '2px solid #bfdbfe'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                        <div style={{ padding: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 10px 30px rgba(59,130,246,0.4)' }}>
                            <Shield style={{ width: '48px', height: '48px', color: 'white' }} />
                        </div>
                    </div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', textAlign: 'center', color: '#1e40af', marginBottom: '12px' }}>{config.examTitle}</h1>
                    <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '32px', fontSize: '18px' }}>กรุณาใส่รหัสเพื่อเปิดใช้งาน</p>

                    <form onSubmit={handleUnlock}>
                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="รหัสผ่าน"
                            style={{
                                width: '100%',
                                padding: '20px',
                                backgroundColor: 'white',
                                border: '3px solid #bfdbfe',
                                borderRadius: '16px',
                                textAlign: 'center',
                                fontSize: '28px',
                                fontWeight: 'bold',
                                color: '#1e40af',
                                marginBottom: '16px',
                                outline: 'none'
                            }}
                            autoFocus
                        />
                        {errorMsg && <p style={{ color: '#dc2626', textAlign: 'center', fontWeight: '600', marginBottom: '16px', fontSize: '18px' }}>{errorMsg}</p>}
                        <button
                            type="submit"
                            style={{
                                width: '100%',
                                padding: '20px',
                                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '22px',
                                border: 'none',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                boxShadow: '0 10px 30px rgba(59,130,246,0.3)'
                            }}
                        >
                            <Unlock style={{ width: '28px', height: '28px' }} /> ปลดล็อค
                        </button>
                        <Link href='/admin' className='text-blue-500 hover:text-blue-700 font-bold mt-4 text-center'>ไปหน้า Admin</Link>
                    </form>
                </div>
            </div>
        );
    }

    // Status styles
    const statusStyles: any = {
        WAITING: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d', label: 'รอเริ่มสอบ' },
        RUNNING: { bg: '#d1fae5', text: '#047857', border: '#6ee7b7', label: 'กำลังสอบ' },
        EXPIRED: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5', label: 'หมดเวลาสอบ' }
    };
    const currentStyle = statusStyles[status];

    // Active Monitor - LARGE TEXT for projector
    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e40af', margin: 0 }}>{config.examTitle}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {currentSession && (
                        <span style={{ fontSize: '18px', color: '#64748b', fontWeight: '500' }}>
                            รอบ {currentSessionIndex + 1} / {config.sessions.length}
                        </span>
                    )}
                    <button
                        onClick={() => setIsLocked(true)}
                        style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.8)', border: '2px solid #bfdbfe', cursor: 'pointer' }}
                    >
                        <Lock style={{ width: '24px', height: '24px', color: '#64748b' }} />
                    </button>
                </div>
            </header>

            {/* Main Timer - VERY LARGE */}
            <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {currentSession ? (
                    <>
                        {/* Session Name & Status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '40px', fontWeight: 'bold', color: '#334155', margin: 0 }}>{currentSession.name}</h2>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '12px 24px',
                                borderRadius: '999px',
                                backgroundColor: currentStyle.bg,
                                color: currentStyle.text,
                                border: `3px solid ${currentStyle.border}`,
                                fontWeight: 'bold',
                                fontSize: '24px'
                            }}>
                                {currentStyle.label}
                            </div>
                        </div>

                        {/* Timer Numbers - HUGE */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                            <TimeUnit value={timeLeft.hours} label="ชม." />
                            <span style={{ fontSize: '100px', color: '#93c5fd', fontWeight: '300', lineHeight: 1 }}>:</span>
                            <TimeUnit value={timeLeft.minutes} label="นาที" />
                            <span style={{ fontSize: '100px', color: '#93c5fd', fontWeight: '300', lineHeight: 1 }}>:</span>
                            <TimeUnit value={timeLeft.seconds} label="วินาที" />
                        </div>

                        {/* Current Time */}
                        <div style={{ marginTop: '24px', textAlign: 'center' }}>
                            <span style={{ fontSize: '20px', color: '#64748b', marginRight: '12px' }}>เวลาปัจจุบัน:</span>
                            <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e40af', fontFamily: 'monospace' }}>{currentTime}</span>
                        </div>
                    </>
                ) : (
                    <p style={{ fontSize: '36px', color: '#94a3b8' }}>ไม่มีรอบสอบที่กำลังดำเนินการ</p>
                )}
            </section>

            {/* Announcements - LARGER TEXT */}
            {config.announcements && config.announcements.length > 0 && (
                <section style={{
                    width: '100%',
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    borderRadius: '20px',
                    padding: '24px 32px',
                    border: '2px solid #bfdbfe',
                    marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #e0e7ff' }}>
                        <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#d97706' }}>
                            <Megaphone style={{ width: '28px', height: '28px' }} />
                        </div>
                        <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#334155', margin: 0 }}>ประกาศสำคัญ</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {config.announcements.map((item: string, index: number) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '26px', color: '#334155' }}>
                                <span style={{
                                    flexShrink: 0,
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '18px'
                                }}>
                                    {index + 1}
                                </span>
                                <p style={{ margin: 0, lineHeight: 1.4, fontWeight: 'bold' }} >{item}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '2px solid #e0e7ff' }}>
                <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none', fontSize: '16px' }}>
                    <Settings style={{ width: '20px', height: '20px' }} />
                    <span>การตั้งค่า</span>
                </Link>
                {currentSession && (
                    <span style={{ color: '#64748b', fontSize: '18px', fontFamily: 'monospace' }}>
                        {new Date(currentSession.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(currentSession.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
                <Link
                    href="/"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        backgroundColor: '#f0f9ff',
                        border: '2px solid #bae6fd',
                        borderRadius: '12px',
                        color: '#0369a1',
                        fontWeight: 'bold',
                        textDecoration: 'none'
                    }}
                >
                    เอกสารประกอบการสอบ
                </Link>
            </footer>
        </div>
    );
}

function TimeUnit({ value, label }: { value: number, label: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                borderRadius: '20px',
                boxShadow: '0 15px 50px rgba(59,130,246,0.2)',
                padding: '20px 32px',
                border: '2px solid #dbeafe'
            }}>
                <span style={{
                    fontSize: '120px',
                    fontWeight: '900',
                    color: '#2563eb',
                    fontFamily: 'monospace',
                    lineHeight: 1
                }}>
                    {String(value).padStart(2, '0')}
                </span>
            </div>
            <span style={{ fontSize: '22px', color: '#64748b', marginTop: '12px', fontWeight: '600' }}>{label}</span>
        </div>
    );
}
