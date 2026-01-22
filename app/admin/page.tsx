'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Settings, Plus, Layout, ExternalLink, Trash2, Clock, Users, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminDashboard() {
    const { data: exams, mutate } = useSWR('/api/exams', fetcher);
    const [newTitle, setNewTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [authError, setAuthError] = useState('');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle) return;

        setIsCreating(true);
        try {
            const res = await fetch('/api/exams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle })
            });
            if (res.ok) {
                setNewTitle('');
                mutate();
            }
        } catch (e) {
            console.error('Failed to create exam');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรอบการสอบนี้? ข้อมูลทั้งหมดรวมถึงประกาศและเซสชันจะถูกลบถาวร')) return;
        const pin = prompt('กรุณากรอกรหัส Admin PIN เพื่อยืนยันการลบ');
        if (!pin) return;

        try {
            const res = await fetch(`/api/exams/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminPinInput: pin })
            });
            if (res.ok) {
                mutate();
            } else {
                const data = await res.json();
                alert(data.error || 'Delete failed');
            }
        } catch (e) {
            console.error('Failed to delete exam', e);
        }
    };

    if (!isAuthenticated) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
                <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '16px', maxWidth: '420px', width: '100%', border: '1px solid #334155', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>เข้าสู่ระบบผู้ดูแล</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '16px' }}>กรุณากรอกรหัส Admin เพื่อเข้าสู่แดชบอร์ด</p>
                    <form onSubmit={async (e) => { e.preventDefault(); setAuthError(''); try { const res = await fetch('/api/admin/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminPin: pin }) }); if (res.ok) { setIsAuthenticated(true); } else { setAuthError('รหัสไม่ถูกต้อง'); } } catch { setAuthError('เกิดข้อผิดพลาด'); } }}>
                        <div style={{ position: 'relative', marginBottom: '12px' }}>
                            <input
                                type={showPin ? "text" : "password"}
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                placeholder="Admin PIN"
                                style={{ width: '100%', padding: '14px', backgroundColor: '#334155', border: '1px solid #475569', borderRadius: '8px', color: 'white', textAlign: 'center', fontSize: '16px', outline: 'none' }}
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPin(!showPin)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                            >
                                {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {authError && <div style={{ color: '#f87171', marginBottom: '12px' }}>{authError}</div>}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600' }}>เข้าสู่ระบบ</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    if (!exams) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
            <div style={{ width: '48px', height: '48px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', padding: '40px 20px', backgroundColor: '#0f172a', color: 'white' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ padding: '10px', backgroundColor: '#3b82f6', borderRadius: '12px' }}>
                            <Settings style={{ width: '32px', height: '32px', color: 'white' }} />
                        </div>
                        ระบบจัดการการสอบหลายห้อง
                    </h1>
                    <Link
                        href="/"
                        style={{ color: '#94a3b8', textDecoration: 'none', border: '1px solid #334155', padding: '8px 16px', borderRadius: '8px' }}
                    >
                        ไปหน้าแรก
                    </Link>
                </div>

                {/* Create New Exam */}
                <div style={{ padding: '32px', backgroundColor: '#1e293b', borderRadius: '20px', border: '1px solid #334155', marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Plus style={{ width: '24px', height: '24px', color: '#4ade80' }} />
                        สร้างห้องสอบใหม่
                    </h2>
                    <form onSubmit={handleCreate} style={{ display: 'flex', gap: '16px' }}>
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="ชื่อห้องสอบ หรือ ชื่อวิชา (เช่น ห้อง 501 - Java)"
                            style={{
                                flex: 1,
                                padding: '14px 20px',
                                backgroundColor: '#0f172a',
                                border: '1px solid #475569',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '16px',
                                outline: 'none'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={isCreating}
                            style={{
                                padding: '14px 28px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                cursor: isCreating ? 'not-allowed' : 'pointer',
                                transition: 'opacity 0.2s'
                            }}
                        >
                            {isCreating ? 'กำลังสร้าง...' : 'สร้างห้องสอบ'}
                        </button>
                    </form>
                </div>

                {/* Exams List */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                    {exams.map((exam: any) => (
                        <div
                            key={exam.id}
                            style={{
                                padding: '24px',
                                backgroundColor: '#1e293b',
                                borderRadius: '20px',
                                border: '1px solid #334155',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'transform 0.2s, border-color 0.2s'
                            }}
                        >
                            <h3 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '12px', color: '#f1f5f9' }}>{exam.title}</h3>
                            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
                                สร้างเมื่อ: {new Date(exam.created_at).toLocaleDateString('th-TH')}
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <Link
                                    href={`/admin/${exam.id}`}
                                    target="_blank"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '12px',
                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                        color: '#60a5fa',
                                        borderRadius: '10px',
                                        textDecoration: 'none',
                                        fontWeight: '600'
                                    }}
                                >
                                    <Settings style={{ width: '18px', height: '18px' }} />
                                    จัดการตั้งค่า
                                </Link>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <Link
                                        href={`/time/${exam.id}`}
                                        target="_blank"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            padding: '10px',
                                            backgroundColor: 'rgba(251, 191, 36, 0.1)',
                                            color: '#fbbf24',
                                            borderRadius: '10px',
                                            textDecoration: 'none',
                                            fontSize: '14px'
                                        }}
                                    >
                                        <Clock style={{ width: '16px', height: '16px' }} />
                                        หน้าจอเวลา
                                    </Link>
                                    <Link
                                        href={`/exam/${exam.id}`}
                                        target="_blank"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            padding: '10px',
                                            backgroundColor: 'rgba(168, 85, 247, 0.1)',
                                            color: '#a855f7',
                                            borderRadius: '10px',
                                            textDecoration: 'none',
                                            fontSize: '14px'
                                        }}
                                    >
                                        <Users style={{ width: '16px', height: '16px' }} />
                                        หน้าเด็ก
                                    </Link>
                                </div>

                                <button
                                    onClick={() => handleDelete(exam.id)}
                                    style={{
                                        marginTop: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '10px',
                                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                        color: '#f87171',
                                        border: 'none',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    <Trash2 style={{ width: '16px', height: '16px' }} />
                                    ลบห้องสอบนี้
                                </button>
                            </div>
                        </div>
                    ))}
                    {exams.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}>
                            <Layout style={{ width: '64px', height: '64px', margin: '0 auto 16px', opacity: 0.3 }} />
                            <p>ยังไม่มีห้องสอบ คลิก "สร้างห้องสอบใหม่" ด้านบนเพื่อเริ่ม</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
