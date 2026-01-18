'use client';

import { useEffect, useState } from 'react';
import { Clock, Timer as TimerIcon, AlertTriangle } from 'lucide-react';

interface TimerProps {
    startTime: string;
    endTime: string;
    sessionName: string;
    onExpire?: () => void;
}

export default function Timer({ startTime, endTime, sessionName, onExpire }: TimerProps) {
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
    const [status, setStatus] = useState<'WAITING' | 'RUNNING' | 'EXPIRED'>('WAITING');

    useEffect(() => {
        const calculateTime = () => {
            const now = new Date().getTime();
            const start = new Date(startTime).getTime();
            const end = new Date(endTime).getTime();

            if (now < start) {
                setStatus('WAITING');
                const diff = start - now;
                return {
                    hours: Math.floor((diff / (1000 * 60 * 60))),
                    minutes: Math.floor((diff / 1000 / 60) % 60),
                    seconds: Math.floor((diff / 1000) % 60),
                };
            } else if (now < end) {
                setStatus('RUNNING');
                const diff = end - now;
                return {
                    hours: Math.floor((diff / (1000 * 60 * 60))),
                    minutes: Math.floor((diff / 1000 / 60) % 60),
                    seconds: Math.floor((diff / 1000) % 60),
                };
            } else {
                setStatus('EXPIRED');
                if (onExpire) onExpire();
                return { hours: 0, minutes: 0, seconds: 0 };
            }
        };

        setTimeLeft(calculateTime());
        const timer = setInterval(() => setTimeLeft(calculateTime()), 1000);
        return () => clearInterval(timer);
    }, [startTime, endTime, onExpire]);

    if (!timeLeft) return null;

    const statusStyles = {
        WAITING: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d', label: 'รอเริ่มสอบ', Icon: Clock },
        RUNNING: { bg: '#d1fae5', text: '#047857', border: '#6ee7b7', label: 'กำลังสอบ', Icon: TimerIcon },
        EXPIRED: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5', label: 'หมดเวลาสอบ', Icon: AlertTriangle }
    };

    const currentStyle = statusStyles[status];
    const Icon = currentStyle.Icon;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Session Name & Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#334155', margin: 0 }}>{sessionName}</h2>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '999px',
                    backgroundColor: currentStyle.bg,
                    color: currentStyle.text,
                    border: `2px solid ${currentStyle.border}`,
                    fontWeight: 'bold'
                }}>
                    <Icon style={{ width: '20px', height: '20px' }} />
                    <span>{currentStyle.label}</span>
                </div>
            </div>

            {/* Time Display */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <TimeUnit value={timeLeft.hours} label="ชม." />
                <span style={{ fontSize: '64px', color: '#93c5fd', fontWeight: '300' }}>:</span>
                <TimeUnit value={timeLeft.minutes} label="นาที" />
                <span style={{ fontSize: '64px', color: '#93c5fd', fontWeight: '300' }}>:</span>
                <TimeUnit value={timeLeft.seconds} label="วินาที" />
            </div>
        </div>
    );
}

function TimeUnit({ value, label }: { value: number, label: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(59,130,246,0.15)',
                padding: '16px 24px',
                border: '1px solid #dbeafe'
            }}>
                <span style={{
                    fontSize: '80px',
                    fontWeight: '900',
                    color: '#2563eb',
                    fontFamily: 'monospace',
                    lineHeight: 1
                }}>
                    {String(value).padStart(2, '0')}
                </span>
            </div>
            <span style={{ fontSize: '16px', color: '#64748b', marginTop: '8px', fontWeight: '500' }}>{label}</span>
        </div>
    );
}
