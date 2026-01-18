'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Settings, Save, Lock, Megaphone, Clock, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminPage() {
    const { data: config, mutate } = useSWR('/api/config', fetcher);
    const router = useRouter();

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');

    const [formData, setFormData] = useState<any>({
        examTitle: '',
        sessions: [],
        announcements: [],
        adminPin: ''
    });

    useEffect(() => {
        if (config) {
            setFormData({
                ...config,
                sessions: config.sessions || [],
                announcements: config.announcements || []
            });
        }
    }, [config]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (config && pin === config.adminPin) {
            setIsAuthenticated(true);
            setErrorMsg('');
        } else {
            setErrorMsg('รหัสผ่านผิด');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveMsg('');
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, adminPin: pin })
            });

            if (res.ok) {
                setSaveMsg('บันทึกสำเร็จ!');
                mutate();
                setTimeout(() => setSaveMsg(''), 3000);
            } else {
                setSaveMsg('บันทึกไม่สำเร็จ');
            }
        } catch (e) {
            setSaveMsg('เกิดข้อผิดพลาด');
        } finally {
            setSaving(false);
        }
    };

    // Session handlers
    const handleSessionChange = (idx: number, field: string, val: string) => {
        const newSessions = [...formData.sessions];
        newSessions[idx] = { ...newSessions[idx], [field]: val };
        setFormData({ ...formData, sessions: newSessions });
    };

    const addSession = () => {
        setFormData({
            ...formData,
            sessions: [...formData.sessions, { name: "รอบสอบใหม่", startTime: "", endTime: "" }]
        });
    };

    const removeSession = (idx: number) => {
        const newSessions = formData.sessions.filter((_: any, i: number) => i !== idx);
        setFormData({ ...formData, sessions: newSessions });
    };

    // Announcement handlers
    const handleAnnouncementChange = (idx: number, val: string) => {
        const newAnn = [...formData.announcements];
        newAnn[idx] = val;
        setFormData({ ...formData, announcements: newAnn });
    };

    const addAnnouncement = () => {
        setFormData({ ...formData, announcements: [...formData.announcements, "ประกาศใหม่"] });
    };

    const removeAnnouncement = (idx: number) => {
        const newAnn = formData.announcements.filter((_: any, i: number) => i !== idx);
        setFormData({ ...formData, announcements: newAnn });
    };

    if (!config) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
            <div style={{ width: '48px', height: '48px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    // Login Screen
    if (!isAuthenticated) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', padding: '16px' }}>
                <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '16px', maxWidth: '400px', width: '100%', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                        <div style={{ padding: '12px', backgroundColor: '#3b82f6', borderRadius: '50%' }}>
                            <Lock style={{ width: '32px', height: '32px', color: 'white' }} />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: '24px' }}>Admin Login</h2>
                    <form onSubmit={handleLogin}>
                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="Enter Admin PIN"
                            style={{
                                width: '100%',
                                padding: '14px',
                                backgroundColor: '#334155',
                                border: '1px solid #475569',
                                borderRadius: '8px',
                                color: 'white',
                                textAlign: 'center',
                                fontSize: '20px',
                                marginBottom: '16px',
                                outline: 'none'
                            }}
                            autoFocus
                        />
                        {errorMsg && <p style={{ color: '#f87171', textAlign: 'center', marginBottom: '16px' }}>{errorMsg}</p>}
                        <button
                            type="submit"
                            style={{
                                width: '100%',
                                padding: '14px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                fontSize: '18px',
                                cursor: 'pointer'
                            }}
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Admin Dashboard
    return (
        <div style={{ minHeight: '100vh', padding: '32px', backgroundColor: '#0f172a', color: 'white' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Settings style={{ width: '32px', height: '32px', color: '#60a5fa' }} />
                        การตั้งค่าระบบ
                    </h1>
                    <button
                        onClick={() => router.push('/time')}
                        style={{ padding: '10px 20px', backgroundColor: '#334155', border: 'none', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer' }}
                    >
                        กลับหน้าจอเวลา
                    </button>
                </div>

                {/* General Settings */}
                <div style={{ padding: '24px', backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings style={{ width: '20px', height: '20px', color: '#94a3b8' }} />
                        ทั่วไป
                    </h3>
                    <div>
                        <label style={{ fontSize: '14px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>ชื่อการสอบ</label>
                        <input
                            type="text"
                            value={formData.examTitle}
                            onChange={(e) => setFormData({ ...formData, examTitle: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: '#0f172a',
                                border: '1px solid #475569',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '16px',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>

                {/* Sessions */}
                <div style={{ padding: '24px', backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
                            รอบการสอบ
                        </h3>
                        <button
                            onClick={addSession}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                backgroundColor: 'rgba(59,130,246,0.2)',
                                color: '#60a5fa',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            <Plus style={{ width: '16px', height: '16px' }} /> เพิ่มรอบ
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {formData.sessions.map((session: any, idx: number) => (
                            <div key={idx} style={{ padding: '16px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', position: 'relative' }}>
                                <button
                                    onClick={() => removeSession(idx)}
                                    style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        padding: '8px',
                                        backgroundColor: 'rgba(239,68,68,0.2)',
                                        color: '#f87171',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Trash2 style={{ width: '16px', height: '16px' }} />
                                </button>

                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>ชื่อรอบ</label>
                                    <input
                                        type="text"
                                        value={session.name}
                                        onChange={(e) => handleSessionChange(idx, 'name', e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #475569',
                                            borderRadius: '8px',
                                            color: 'white',
                                            fontSize: '16px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>เวลาเริ่ม</label>
                                        <input
                                            type="datetime-local"
                                            value={session.startTime ? session.startTime.slice(0, 16) : ''}
                                            onChange={(e) => handleSessionChange(idx, 'startTime', e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                backgroundColor: '#1e293b',
                                                border: '1px solid #475569',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '14px',
                                                outline: 'none',
                                                colorScheme: 'dark'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>เวลาสิ้นสุด</label>
                                        <input
                                            type="datetime-local"
                                            value={session.endTime ? session.endTime.slice(0, 16) : ''}
                                            onChange={(e) => handleSessionChange(idx, 'endTime', e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                backgroundColor: '#1e293b',
                                                border: '1px solid #475569',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '14px',
                                                outline: 'none',
                                                colorScheme: 'dark'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {formData.sessions.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>ยังไม่มีรอบสอบ</p>
                        )}
                    </div>
                </div>

                {/* Announcements */}
                <div style={{ padding: '24px', backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', marginBottom: '100px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Megaphone style={{ width: '20px', height: '20px', color: '#4ade80' }} />
                            ประกาศ
                        </h3>
                        <button
                            onClick={addAnnouncement}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                backgroundColor: 'rgba(74,222,128,0.2)',
                                color: '#4ade80',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            <Plus style={{ width: '16px', height: '16px' }} /> เพิ่มประกาศ
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {formData.announcements.map((ann: string, idx: number) => (
                            <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                                <input
                                    type="text"
                                    value={ann}
                                    onChange={(e) => handleAnnouncementChange(idx, e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        backgroundColor: '#0f172a',
                                        border: '1px solid #475569',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '16px',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    onClick={() => removeAnnouncement(idx)}
                                    style={{
                                        padding: '12px',
                                        backgroundColor: 'rgba(239,68,68,0.2)',
                                        color: '#f87171',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Trash2 style={{ width: '18px', height: '18px' }} />
                                </button>
                            </div>
                        ))}
                        {formData.announcements.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>ยังไม่มีประกาศ</p>
                        )}
                    </div>
                </div>

                {/* Save Button */}
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '16px 32px',
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    borderTop: '1px solid #334155',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    {saveMsg && (
                        <span style={{ color: saveMsg.includes('สำเร็จ') ? '#4ade80' : '#f87171', fontWeight: '500' }}>
                            {saveMsg}
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '14px 32px',
                            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            fontSize: '18px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.7 : 1
                        }}
                    >
                        <Save style={{ width: '20px', height: '20px' }} />
                        {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                    </button>
                </div>
            </div>
        </div>
    );
}
