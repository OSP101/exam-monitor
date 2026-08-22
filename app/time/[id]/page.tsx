'use client';

import { useState, useEffect, useRef, use } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Settings, Lock, Unlock, Shield, Megaphone, ArrowLeft, Maximize, Minimize, Bell, X, Play, CheckCircle2, AlertTriangle, Check } from 'lucide-react';
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

// Sound alert settings
type AlertKey = 'hr1' | 'min30' | 'min10' | 'min5';
type EventKey = 'start' | 'timeout';
interface SoundSettings {
    enabled: boolean;
    tested: boolean;
    alerts: Record<AlertKey, boolean>;
    events: Record<EventKey, boolean>;
}
const ALERT_DEFS: { key: AlertKey; minutes: number; file: string; label: string; label_en: string }[] = [
    { key: 'hr1', minutes: 60, file: '/sound/1hr-1.mp3', label: 'เหลือ 1 ชั่วโมง', label_en: '1 hour left' },
    { key: 'min30', minutes: 30, file: '/sound/30min-1.mp3', label: 'เหลือ 30 นาที', label_en: '30 minutes left' },
    { key: 'min10', minutes: 10, file: '/sound/10min-1.mp3', label: 'เหลือ 10 นาที', label_en: '10 minutes left' },
    { key: 'min5', minutes: 5, file: '/sound/5min-1.mp3', label: 'เหลือ 5 นาที', label_en: '5 minutes left' },
];
const EVENT_DEFS: { key: EventKey; file: string; label: string; label_en: string }[] = [
    { key: 'start', file: '/sound/startexam-1.mp3', label: 'เริ่มสอบ', label_en: 'Exam starts' },
    { key: 'timeout', file: '/sound/timeout-1.mp3', label: 'หมดเวลาสอบ', label_en: 'Time is up' },
];
// Played instead of EVENT_DEFS['timeout'].file when another session follows immediately after —
// avoids telling students to leave the room when a next round is about to start in the same seat.
const TIMEOUT_TRANSITION_FILE = '/sound/timeout-to-next.mp3';
const TEST_SOUND_FILE = '/sound/test-1.mp3';
const DEFAULT_SOUND_SETTINGS: SoundSettings = {
    enabled: false,
    tested: false,
    alerts: { hr1: false, min30: false, min10: false, min5: false },
    events: { start: false, timeout: false },
};

export default function TimePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    // Real-time sync: refresh every 3 seconds
    const { data: config } = useSWR(`/api/exams/${id}`, fetcher, { refreshInterval: 3000 });
    const { locale, setLocale, t } = useLocale();

    // Server/client clock offset (ms) so the countdown matches the server even if the
    // projector machine's clock is wrong. Polled separately from the exam config (and
    // much less often, since clock drift doesn't change second-to-second) so that the
    // config poll's response can stay dedup-able by SWR.
    const { data: serverTimeData } = useSWR('/api/server-time', fetcher, { refreshInterval: 30000 });
    const serverOffsetRef = useRef(0);
    useEffect(() => {
        if (typeof serverTimeData?.time === 'number') {
            serverOffsetRef.current = serverTimeData.time - Date.now();
        }
    }, [serverTimeData]);

    const [isLocked, setIsLocked] = useState(true);
    const [pin, setPin] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
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

    const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [status, setStatus] = useState<'WAITING' | 'RUNNING' | 'EXPIRED'>('WAITING');
    const [currentTime, setCurrentTime] = useState('');

    // Sound alert settings (per-exam, stored locally on this projector/computer)
    const [soundSettings, setSoundSettings] = useState<SoundSettings>(DEFAULT_SOUND_SETTINGS);
    const [soundModalOpen, setSoundModalOpen] = useState(false);
    const [soundDraft, setSoundDraft] = useState<SoundSettings | null>(null);
    const [testingSound, setTestingSound] = useState(false);
    const firedAlertsRef = useRef<Set<AlertKey>>(new Set());
    const firedEventsRef = useRef<Set<EventKey>>(new Set());
    const soundSettingsRef = useRef(soundSettings);
    useEffect(() => { soundSettingsRef.current = soundSettings; }, [soundSettings]);

    // Plays alert/event sounds one at a time (never overlapping) — matters when a
    // session's "time's up" sound and the next session's "start" sound land close together.
    const soundQueueRef = useRef<Promise<void>>(Promise.resolve());
    const enqueueSound = (file: string) => {
        soundQueueRef.current = soundQueueRef.current.then(() => new Promise<void>(resolve => {
            const audio = new Audio(file);
            const done = () => resolve();
            audio.addEventListener('ended', done, { once: true });
            audio.addEventListener('error', done, { once: true });
            audio.play().catch(done);
            setTimeout(done, 20000);
        }));
    };

    useEffect(() => {
        try {
            const raw = localStorage.getItem(`examSound:${id}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                setSoundSettings({
                    ...DEFAULT_SOUND_SETTINGS,
                    ...parsed,
                    alerts: { ...DEFAULT_SOUND_SETTINGS.alerts, ...parsed.alerts },
                    events: { ...DEFAULT_SOUND_SETTINGS.events, ...parsed.events },
                });
            }
        } catch { /* ignore malformed/inaccessible storage */ }
    }, [id]);

    const openSoundModal = () => {
        setSoundDraft({ ...soundSettings, alerts: { ...soundSettings.alerts }, events: { ...soundSettings.events } });
        setSoundModalOpen(true);
    };
    const closeSoundModal = () => {
        setSoundModalOpen(false);
        setSoundDraft(null);
        setTestingSound(false);
    };
    const toggleSoundEnabled = () => {
        setSoundDraft(d => d ? { ...d, enabled: !d.enabled } : d);
    };
    const playTestSound = () => {
        if (testingSound) return;
        setTestingSound(true);
        const audio = new Audio(TEST_SOUND_FILE);
        const finish = () => {
            setTestingSound(false);
            setSoundDraft(d => d ? { ...d, tested: true } : d);
        };
        audio.addEventListener('ended', finish, { once: true });
        audio.addEventListener('error', finish, { once: true });
        audio.play().catch(finish);
        setTimeout(finish, 6000);
    };

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

        // 2. If nothing running, find the NEXT UPCOMING session — the one that starts
        // soonest, not just the first one in array order (sessions aren't guaranteed
        // to be stored chronologically, e.g. if added or edited out of order).
        if (idx === -1) {
            let soonestStart = Infinity;
            sessions.forEach((s: any, i: number) => {
                const start = new Date(s.startTime).getTime();
                if (start > now && start < soonestStart) {
                    soonestStart = start;
                    idx = i;
                }
            });
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

    // Identity of the displayed session (its own db id, falling back to a start+end
    // composite) — NOT the array index, which can be reused by a different session
    // after one earlier in the list is deleted. Resetting fired alerts/events by index
    // alone would let a new session silently inherit another session's already-fired flags.
    const currentSessionKey = currentSession ? String(currentSession.id ?? `${currentSession.startTime}|${currentSession.endTime}`) : null;
    useEffect(() => {
        firedAlertsRef.current = new Set();
        firedEventsRef.current = new Set();
    }, [currentSessionKey]);

    const sessionDurationMinutes = currentSession
        ? Math.round((new Date(currentSession.endTime).getTime() - new Date(currentSession.startTime).getTime()) / 60000)
        : 0;

    const toggleSoundAlert = (key: AlertKey, minutes: number) => {
        setSoundDraft(d => {
            if (!d || !d.tested) return d;
            if (minutes > sessionDurationMinutes) return d;
            return { ...d, alerts: { ...d.alerts, [key]: !d.alerts[key] } };
        });
    };
    const toggleSoundEvent = (key: EventKey) => {
        setSoundDraft(d => {
            if (!d || !d.tested) return d;
            return { ...d, events: { ...d.events, [key]: !d.events[key] } };
        });
    };
    const applySoundSettings = () => {
        if (!soundDraft) return;
        if (soundDraft.enabled && !soundDraft.tested) return;
        const alerts = { ...soundDraft.alerts };
        ALERT_DEFS.forEach(a => { if (a.minutes > sessionDurationMinutes) alerts[a.key] = false; });
        const finalSettings: SoundSettings = { ...soundDraft, alerts };
        setSoundSettings(finalSettings);
        try { localStorage.setItem(`examSound:${id}`, JSON.stringify(finalSettings)); } catch { /* ignore */ }
        closeSoundModal();
    };

    // Timer calculation
    useEffect(() => {
        if (!currentSession) return;

        const calculateTime = () => {
            const now = Date.now() + serverOffsetRef.current;
            const activeSoundSettings = soundSettingsRef.current;

            const fireEvent = (key: EventKey, file: string) => {
                if (!activeSoundSettings.enabled) return;
                if (!activeSoundSettings.events[key]) return;
                if (firedEventsRef.current.has(key)) return;
                firedEventsRef.current.add(key);
                enqueueSound(file);
            };

            const start = new Date(currentSession.startTime).getTime();
            const end = new Date(currentSession.endTime).getTime();

            // Fire "time's up" for THIS session as soon as it ends, before checking
            // whether the display is about to auto-advance to the next session —
            // otherwise a session with another one right after would skip this sound entirely.
            if (now >= end) {
                const isLastSession = currentSessionIndex === (config?.sessions?.length ?? 1) - 1;
                const timeoutDef = EVENT_DEFS.find(e => e.key === 'timeout');
                const timeoutFile = isLastSession ? (timeoutDef?.file ?? '/sound/timeout-1.mp3') : TIMEOUT_TRANSITION_FILE;
                fireEvent('timeout', timeoutFile);
            }

            // Re-check if we should be on a different session (automatic transition)
            if (config?.sessions) {
                const bestIdx = getActiveSessionIndex(config.sessions);
                if (bestIdx !== currentSessionIndex) {
                    setCurrentSessionIndex(bestIdx);
                    return; // Next interval will pick up the new session
                }
            }

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

                const startDef = EVENT_DEFS.find(e => e.key === 'start');
                fireEvent('start', startDef?.file ?? '/sound/startexam-1.mp3');

                if (activeSoundSettings.enabled) {
                    const remainSeconds = Math.floor(diff / 1000);
                    // A backgrounded/throttled tab can skip straight past a threshold by
                    // several minutes before its next tick. Only actually play the sound
                    // if we caught it close to the moment it crossed — a stale threshold
                    // (way past due) is marked fired silently instead of playing a "1 hour
                    // left" cue when only a few minutes actually remain.
                    const STALE_ALERT_MARGIN_SECONDS = 90;
                    ALERT_DEFS.forEach(a => {
                        if (!activeSoundSettings.alerts[a.key]) return;
                        if (firedAlertsRef.current.has(a.key)) return;
                        if (remainSeconds <= a.minutes * 60) {
                            firedAlertsRef.current.add(a.key);
                            const staleness = a.minutes * 60 - remainSeconds;
                            if (staleness <= STALE_ALERT_MARGIN_SECONDS) {
                                enqueueSound(a.file);
                            }
                        }
                    });
                }
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

    // Color grading by remaining-time ratio (continuous gradient, no hard switches)
    let theme: any;
    let isPulsing = false;

    if (status === 'RUNNING' && currentSession) {
        const remainMs = ((timeLeft.hours * 3600) + (timeLeft.minutes * 60) + timeLeft.seconds) * 1000;
        const startMs = new Date(currentSession.startTime).getTime();
        const endMs = new Date(currentSession.endTime).getTime();
        const totalMs = endMs - startMs;
        const ratio = totalMs > 0 ? remainMs / totalMs : 1;
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

    // Active Monitor
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden', background: `linear-gradient(180deg, ${theme.bg1} 0%, ${theme.bg2} 100%)`, transition: 'background 0.8s ease' }}>
            <style>{`
                @keyframes edge-pulse {
                    0% { box-shadow: inset 0 0 0 5px ${theme.glow}, inset 0 0 30px 0 rgba(239,68,68,0); }
                    50% { box-shadow: inset 0 0 0 14px ${theme.ring}, inset 0 0 90px 0 ${theme.glow}; }
                    100% { box-shadow: inset 0 0 0 5px ${theme.glow}, inset 0 0 30px 0 rgba(239,68,68,0); }
                }
                @keyframes sound-bar {
                    0%, 100% { transform: scaleY(0.3); }
                    50% { transform: scaleY(1); }
                }
            `}</style>
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 60,
                boxShadow: `inset 0 0 0 6px ${theme.glow}`,
                transition: 'box-shadow 1s linear',
                animation: isPulsing ? 'edge-pulse 1s ease-in-out infinite' : 'none',
            }} />
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
                        onClick={toggleFullscreen}
                        title={isFullscreen ? (locale === 'th' ? 'ออกจากเต็มจอ' : 'Exit fullscreen') : (locale === 'th' ? 'เต็มจอ' : 'Fullscreen')}
                        style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.8)', border: '2px solid #bfdbfe', cursor: 'pointer' }}
                    >
                        {isFullscreen ? <Minimize style={{ width: '24px', height: '24px', color: '#64748b' }} /> : <Maximize style={{ width: '24px', height: '24px', color: '#64748b' }} />}
                    </button>
                    <button
                        onClick={openSoundModal}
                        title={soundSettings.enabled
                            ? (locale === 'th' ? `ตั้งค่าเสียงเตือน (เปิดใช้งาน • ${Object.values(soundSettings.alerts).filter(Boolean).length + Object.values(soundSettings.events).filter(Boolean).length} จุด)` : `Sound alerts (on • ${Object.values(soundSettings.alerts).filter(Boolean).length + Object.values(soundSettings.events).filter(Boolean).length} set)`)
                            : (locale === 'th' ? 'ตั้งค่าเสียงเตือน' : 'Sound alert settings')}
                        style={{ position: 'relative', padding: '12px', borderRadius: '12px', backgroundColor: soundSettings.enabled ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.8)', border: `2px solid ${soundSettings.enabled ? '#3b82f6' : '#bfdbfe'}`, cursor: 'pointer' }}
                    >
                        <Bell style={{ width: '24px', height: '24px', color: soundSettings.enabled ? '#3b82f6' : '#64748b' }} />
                        {soundSettings.enabled && (
                            <span style={{ position: 'absolute', top: '6px', right: '6px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e', border: '2px solid white' }} />
                        )}
                    </button>
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
                            <TimeUnit value={timeLeft.hours} label={t('hour')} color={theme.text} />
                            <span style={{ fontSize: '100px', color: theme.text, opacity: 0.45, fontWeight: '300', lineHeight: 1, transition: 'color 1s linear' }}>:</span>
                            <TimeUnit value={timeLeft.minutes} label={t('minute')} color={theme.text} />
                            <span style={{ fontSize: '100px', color: theme.text, opacity: 0.45, fontWeight: '300', lineHeight: 1, transition: 'color 1s linear' }}>:</span>
                            <TimeUnit value={timeLeft.seconds} label={t('second')} color={theme.text} />
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
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                    <p style={{ margin: 0, fontSize: '18px', color: '#94a3b8' }}>

                        © {new Date().getFullYear()} CP-KKU | Developed by{' '}
                        <a
                            href="https://osp101.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#60a5fa', textDecoration: 'underline' }}
                        >
                            ITII Development Team
                        </a>
                    </p>
                </div>
            </footer>

            {soundModalOpen && soundDraft && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '24px' }}>
                    <div style={{ width: '100%', maxWidth: '560px', maxHeight: '85vh', overflowY: 'auto', backgroundColor: 'white', borderRadius: '24px', padding: '36px', boxShadow: '0 25px 50px rgba(59,130,246,0.25)', border: '2px solid #bfdbfe' }}>

                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '12px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 8px 20px rgba(59,130,246,0.35)' }}>
                                    <Bell style={{ width: '24px', height: '24px', color: 'white' }} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#1e40af' }}>{locale === 'th' ? 'ตั้งค่าเสียงเตือน' : 'Sound Alert Settings'}</h2>
                                    <p style={{ margin: '2px 0 0', fontSize: '14px', color: '#94a3b8' }}>
                                        {locale === 'en' ? (config.title_en || config.examTitle) : config.examTitle}
                                        {currentSession ? ` · ${locale === 'th' ? `รอบ ${currentSessionIndex + 1}/${config.sessions.length}` : `Session ${currentSessionIndex + 1}/${config.sessions.length}`}` : ''}
                                    </p>
                                </div>
                            </div>
                            <button onClick={closeSoundModal} style={{ padding: '8px', borderRadius: '10px', border: 'none', backgroundColor: '#f1f5f9', cursor: 'pointer' }}>
                                <X style={{ width: '18px', height: '18px', color: '#64748b' }} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '2px solid #e2e8f0', marginBottom: '18px' }}>
                            <div>
                                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#334155' }}>{locale === 'th' ? 'เปิดใช้งานเสียงเตือน' : 'Enable sound alerts'}</p>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>{locale === 'th' ? 'เล่นเสียงเตือนอัตโนมัติเมื่อใกล้หมดเวลาสอบ (เฉพาะห้องนี้)' : 'Automatically play a sound as the exam nears its end (this room only)'}</p>
                            </div>
                            <div onClick={toggleSoundEnabled} style={{ width: '52px', height: '30px', borderRadius: '999px', backgroundColor: soundDraft.enabled ? '#3b82f6' : '#cbd5e1', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background-color 0.15s ease' }}>
                                <div style={{ position: 'absolute', top: '3px', left: soundDraft.enabled ? '25px' : '3px', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.25)', transition: 'left 0.15s ease' }} />
                            </div>
                        </div>

                        {soundDraft.enabled ? (
                            <div>
                                <div style={{ padding: '18px', borderRadius: '16px', border: '2px solid #dbeafe', backgroundColor: '#eff6ff', marginBottom: '18px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1e40af' }}>{locale === 'th' ? 'ทดสอบเสียง' : 'Test sound'}</p>
                                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', lineHeight: 1.4 }}>{locale === 'th' ? 'กดทดสอบเพื่อปรับระดับเสียงลำโพง/คอมพิวเตอร์ในห้องสอบให้ดังพอดีก่อนเริ่มสอบจริง' : 'Play a test sound to set the room speaker volume before the exam starts'}</p>
                                        </div>
                                        <button
                                            onClick={playTestSound}
                                            disabled={testingSound}
                                            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: testingSound ? 'default' : 'pointer', fontWeight: 'bold', fontSize: '14px', backgroundColor: testingSound ? '#3b82f6' : (soundDraft.tested ? '#f1f5f9' : '#3b82f6'), color: testingSound ? 'white' : (soundDraft.tested ? '#334155' : 'white') }}
                                        >
                                            {testingSound ? (
                                                <>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '16px' }}>
                                                        <span style={{ width: '4px', height: '16px', backgroundColor: 'white', borderRadius: '4px', display: 'inline-block', animation: 'sound-bar 0.9s ease-in-out infinite' }} />
                                                        <span style={{ width: '4px', height: '16px', backgroundColor: 'white', borderRadius: '4px', display: 'inline-block', animation: 'sound-bar 0.9s ease-in-out infinite 0.15s' }} />
                                                        <span style={{ width: '4px', height: '16px', backgroundColor: 'white', borderRadius: '4px', display: 'inline-block', animation: 'sound-bar 0.9s ease-in-out infinite 0.3s' }} />
                                                    </span>
                                                    {locale === 'th' ? 'กำลังเล่น...' : 'Playing...'}
                                                </>
                                            ) : (
                                                <>
                                                    <Play style={{ width: '16px', height: '16px' }} />
                                                    {soundDraft.tested ? (locale === 'th' ? 'ทดสอบอีกครั้ง' : 'Test again') : (locale === 'th' ? 'ทดสอบเสียง' : 'Play test sound')}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    {soundDraft.tested && !testingSound && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', color: '#047857', fontSize: '13px', fontWeight: 600 }}>
                                            <CheckCircle2 style={{ width: '16px', height: '16px' }} />
                                            {locale === 'th' ? 'ทดสอบเสียงแล้ว — ปรับระดับเสียงเรียบร้อย' : 'Sound tested — volume is set'}
                                        </div>
                                    )}
                                </div>

                                <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', marginBottom: '16px' }}>
                                    <p style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 600, color: '#334155' }}>{locale === 'th' ? 'เสียงแจ้งเหตุการณ์สำคัญ' : 'Key event sounds'}</p>

                                    {soundDraft.tested ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {EVENT_DEFS.map(ev => {
                                                const checked = soundDraft.events[ev.key];
                                                return (
                                                    <div key={ev.key} onClick={() => toggleSoundEvent(ev.key)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', backgroundColor: checked ? 'rgba(59,130,246,0.08)' : 'transparent', cursor: 'pointer' }}>
                                                        <div style={{ width: '22px', height: '22px', borderRadius: '7px', border: `2px solid ${checked ? '#3b82f6' : '#cbd5e1'}`, backgroundColor: checked ? '#3b82f6' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            {checked && <Check style={{ width: '14px', height: '14px', color: 'white' }} />}
                                                        </div>
                                                        <span style={{ fontSize: '15px', fontWeight: 500, color: '#334155' }}>{locale === 'th' ? ev.label : ev.label_en}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1', color: '#94a3b8', fontSize: '14px' }}>
                                            <Lock style={{ width: '18px', height: '18px' }} />
                                            {locale === 'th' ? 'กรุณาทดสอบเสียงก่อน จึงจะเลือกเสียงเหตุการณ์ได้' : 'Test the sound first to choose event sounds'}
                                        </div>
                                    )}
                                </div>

                                <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#334155' }}>{locale === 'th' ? 'เตือนเมื่อเหลือเวลา' : 'Remind when time remaining is'}</p>
                                        {soundDraft.tested && (
                                            <span style={{ fontSize: '13px', color: '#64748b' }}>
                                                {locale === 'th' ? `เลือกแล้ว ${Object.values(soundDraft.alerts).filter(Boolean).length} จุด` : `${Object.values(soundDraft.alerts).filter(Boolean).length} selected`}
                                            </span>
                                        )}
                                    </div>

                                    {soundDraft.tested ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {ALERT_DEFS.map(a => {
                                                const disabled = a.minutes > sessionDurationMinutes;
                                                const checked = soundDraft.alerts[a.key];
                                                return (
                                                    <div key={a.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 14px', borderRadius: '12px', backgroundColor: checked ? 'rgba(59,130,246,0.08)' : (disabled ? '#f8fafc' : 'transparent') }}>
                                                        <div onClick={() => toggleSoundAlert(a.key, a.minutes)} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: disabled ? 'not-allowed' : 'pointer' }}>
                                                            <div style={{ width: '22px', height: '22px', borderRadius: '7px', border: `2px solid ${disabled ? '#e2e8f0' : (checked ? '#3b82f6' : '#cbd5e1')}`, backgroundColor: checked && !disabled ? '#3b82f6' : (disabled ? '#f1f5f9' : 'white'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                {checked && !disabled && <Check style={{ width: '14px', height: '14px', color: 'white' }} />}
                                                            </div>
                                                            <span style={{ fontSize: '15px', fontWeight: 500, color: disabled ? '#cbd5e1' : '#334155' }}>{locale === 'th' ? a.label : a.label_en}</span>
                                                        </div>
                                                        {disabled && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '34px', color: '#b45309', fontSize: '12px' }}>
                                                                <AlertTriangle style={{ width: '13px', height: '13px' }} />
                                                                {locale === 'th'
                                                                    ? `ต้องการรอบสอบอย่างน้อย ${a.minutes} นาที (รอบนี้ยาว ${sessionDurationMinutes} นาที)`
                                                                    : `Needs a session of at least ${a.minutes} min (this session is ${sessionDurationMinutes} min)`}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1', color: '#94a3b8', fontSize: '14px' }}>
                                            <Lock style={{ width: '18px', height: '18px' }} />
                                            {locale === 'th' ? 'กรุณาทดสอบเสียงก่อน จึงจะเลือกช่วงเวลาเตือนได้' : 'Test the sound first to choose alert times'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', color: '#94a3b8', fontSize: '14px', textAlign: 'center' }}>
                                {locale === 'th' ? 'เสียงเตือนถูกปิดใช้งานสำหรับห้องสอบนี้' : 'Sound alerts are disabled for this room'}
                            </div>
                        )}

                        <div style={{ marginTop: '22px' }}>
                            {soundDraft.enabled && !soundDraft.tested && (
                                <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#dc2626', textAlign: 'right' }}>
                                    {locale === 'th' ? 'กรุณาทดสอบเสียงก่อนกด "นำไปใช้"' : 'Please test the sound before applying'}
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button onClick={closeSoundModal} style={{ padding: '12px 22px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>
                                    {locale === 'th' ? 'ยกเลิก' : 'Cancel'}
                                </button>
                                <button
                                    onClick={applySoundSettings}
                                    disabled={soundDraft.enabled && !soundDraft.tested}
                                    style={{ padding: '12px 26px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: (soundDraft.enabled && !soundDraft.tested) ? 'not-allowed' : 'pointer', background: (soundDraft.enabled && !soundDraft.tested) ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white', opacity: (soundDraft.enabled && !soundDraft.tested) ? 0.7 : 1 }}
                                >
                                    {locale === 'th' ? 'นำไปใช้' : 'Apply'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* <Footer dark /> */}
        </div>
    );
}

function TimeUnit({ value, label, color }: { value: number, label: string, color: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
                backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '20px',
                boxShadow: '0 15px 50px rgba(59,130,246,0.2)', padding: '20px 32px', border: '2px solid #dbeafe'
            }}>
                <span style={{ fontSize: '120px', fontWeight: '900', color, fontFamily: 'monospace', lineHeight: 1, transition: 'color 1s linear' }}>
                    {String(value).padStart(2, '0')}
                </span>
            </div>
            <span style={{ fontSize: '22px', color: '#64748b', marginTop: '12px', fontWeight: '600' }}>{label}</span>
        </div>
    );
}
