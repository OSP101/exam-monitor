'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Settings, Plus, Layout, ExternalLink, Trash2, Clock, Users, Eye, EyeOff, Monitor, CheckSquare, Square } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/lib/LocaleContext';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminDashboard() {
    const { data: exams, mutate } = useSWR('/api/exams', fetcher);
    const { locale, setLocale, t } = useLocale();
    const [newTitle, setNewTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [sessionChecked, setSessionChecked] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        fetch('/api/admin/verify')
            .then((res) => res.json())
            .then((data) => {
                if (data.ok) setIsAuthenticated(true);
            })
            .catch(() => {})
            .finally(() => setSessionChecked(true));
    }, []);

    const handleLogout = async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        setIsAuthenticated(false);
    };

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
        console.log('Deleting exam id:', id);
        if (!confirm(t('confirm_delete_exam'))) return;
        const pin = prompt(t('prompt_admin_pin'));
        if (!pin) return;

        try {
            const res = await fetch(`/api/exams/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Pin': pin
                },
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
        if (!sessionChecked) {
            return (
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
                    <div style={{ width: '48px', height: '48px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            );
        }
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
                <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '16px', maxWidth: '420px', width: '100%', border: '1px solid #334155', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', gap: '8px' }}>
                        <button onClick={() => setLocale('th')} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: locale === 'th' ? '#3b82f6' : 'transparent', color: locale === 'th' ? 'white' : '#64748b', cursor: 'pointer' }}>TH</button>
                        <button onClick={() => setLocale('en')} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: locale === 'en' ? '#3b82f6' : 'transparent', color: locale === 'en' ? 'white' : '#64748b', cursor: 'pointer' }}>EN</button>
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>{t('login_admin')}</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '16px' }}>{t('login_admin_sub')}</p>
                    <form onSubmit={async (e) => { e.preventDefault(); setAuthError(''); try { const res = await fetch('/api/admin/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminPin: pin }) }); if (res.ok) { setIsAuthenticated(true); } else { const data = await res.json(); setAuthError(data.error || t('incorrect_pin')); } } catch { setAuthError('Error'); } }}>
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
                            <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600' }}>{t('login')}</button>
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
                        {t('admin_dashboard')}
                    </h1>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setLocale('th')} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: locale === 'th' ? '#3b82f6' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>TH</button>
                            <button onClick={() => setLocale('en')} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: locale === 'en' ? '#3b82f6' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>EN</button>
                        </div>
                        {selectedIds.length > 0 && (
                            <Link
                                href={`/time/multi?ids=${selectedIds.join(',')}`}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#8b5cf6', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}
                            >
                                <Monitor size={20} /> {locale === 'th' ? `เปิดคุมสอบรวม (${selectedIds.length})` : `Launch Multi-Monitor (${selectedIds.length})`}
                            </Link>
                        )}
                        <Link
                            href="/"
                            style={{ color: '#94a3b8', textDecoration: 'none', border: '1px solid #334155', padding: '10px 16px', borderRadius: '8px', fontWeight: '500' }}
                        >
                            {t('home')}
                        </Link>
                        <button
                            onClick={handleLogout}
                            style={{ color: '#94a3b8', backgroundColor: 'transparent', border: '1px solid #334155', padding: '10px 16px', borderRadius: '8px', fontWeight: '500', cursor: 'pointer' }}
                        >
                            {t('logout')}
                        </button>
                    </div>
                </div>

                {/* Create New Exam */}
                <div style={{ padding: '32px', backgroundColor: '#1e293b', borderRadius: '20px', border: '1px solid #334155', marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Plus style={{ width: '24px', height: '24px', color: '#4ade80' }} />
                        {t('create_exam')}
                    </h2>
                    <form onSubmit={handleCreate} style={{ display: 'flex', gap: '16px' }}>
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder={t('exam_name_placeholder')}
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
                            {isCreating ? (locale === 'th' ? 'กำลังสร้าง...' : 'Creating...') : t('create_exam')}
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
                                border: selectedIds.includes(exam.id) ? '2px solid #8b5cf6' : '1px solid #334155',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'all 0.2s',
                                position: 'relative'
                            }}
                        >
                            <div
                                onClick={() => {
                                    setSelectedIds(prev => prev.includes(exam.id) ? prev.filter(id => id !== exam.id) : [...prev, exam.id]);
                                }}
                                style={{ position: 'absolute', top: '16px', right: '16px', cursor: 'pointer', color: selectedIds.includes(exam.id) ? '#8b5cf6' : '#475569' }}
                            >
                                {selectedIds.includes(exam.id) ? <CheckSquare size={24} /> : <Square size={24} />}
                            </div>
                            <h3 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '12px', color: '#f1f5f9', paddingRight: '30px' }}>{locale === 'en' ? (exam.title_en || exam.title) : exam.title}</h3>
                            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
                                {locale === 'th' ? 'สร้างเมื่อ: ' : 'Created at: '} {new Date(exam.created_at).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US')}
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
                                    {t('manage_settings')}
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
                                        {t('time_monitor_view')}
                                    </Link>
                                    <Link
                                        href={`/resources`}
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
                                        {t('student_view')}
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
                                    {t('delete_exam')}
                                </button>
                            </div>
                        </div>
                    ))}
                    {exams.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}>
                            <Layout style={{ width: '64px', height: '64px', margin: '0 auto 16px', opacity: 0.3 }} />
                            <p>{t('no_exams')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
