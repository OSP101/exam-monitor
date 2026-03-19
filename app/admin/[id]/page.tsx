'use client';

import { useState, useEffect, use } from 'react';
import useSWR from 'swr';
import { Settings, Save, Lock, Megaphone, Clock, Plus, Trash2, ArrowLeft, FolderLock, ShieldCheck, Eye, EyeOff, Languages } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/lib/LocaleContext';
import ExamFilesManager from '@/components/ExamFilesManager';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ExamAdminPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: exam, mutate } = useSWR(`/api/exams/${id}`, fetcher);
    const router = useRouter();
    const { locale, setLocale, t } = useLocale();

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [showLoginPin, setShowLoginPin] = useState(false);
    const [showAdminPin, setShowAdminPin] = useState(false);
    const [showAccessCode, setShowAccessCode] = useState(false);
    const [showSubjectPinIdx, setShowSubjectPinIdx] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');

    const [formData, setFormData] = useState<any>({
        examTitle: '',
        title_en: '',
        adminPin: '',
        accessCode: '',
        sessions: [],
        announcements: [],
        subjects: [],
        fileSharingEnabled: false
    });

    useEffect(() => {
        if (exam) {
            setFormData({
                examTitle: exam.examTitle || '',
                title_en: exam.title_en || '',
                adminPin: exam.adminPin || '',
                sessions: exam.sessions || [],
                announcements: exam.announcements || [],
                subjects: exam.subjects || [],
                fileSharingEnabled: exam.fileSharingEnabled || false,
                accessCode: exam.accessCode || ''
            });
        }
    }, [exam]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (exam && pin === exam.adminPin) {
            setIsAuthenticated(true);
            setErrorMsg('');
        } else {
            setErrorMsg(t('incorrect_pin'));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveMsg('');
        try {
            const res = await fetch(`/api/exams/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, adminPinInput: pin })
            });

            if (res.ok) {
                setSaveMsg(t('save_success'));
                // Parallel revalidation
                mutate();
                setTimeout(() => {
                    mutate(); // Second revalidation just in case
                    setSaveMsg('');
                }, 3000);
            } else {
                const data = await res.json();
                setSaveMsg(data.error || t('save_failed'));
            }
        } catch (e) {
            setSaveMsg(t('error_occurred'));
        } finally {
            setSaving(false);
        }
    };

    const handleTranslateAll = async () => {
        setSaving(true);
        setSaveMsg(t('translating_msg'));
        try {
            const translate = async (text: string) => {
                if (!text || text.trim() === '') return '';
                const res = await fetch('/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, target: 'en' })
                });
                const data = await res.json();
                return data.translated || '';
            };

            const title_en = formData.title_en || await translate(formData.examTitle);

            const sessions = await Promise.all(formData.sessions.map(async (s: any) => ({
                ...s,
                name_en: s.name_en || await translate(s.name)
            })));

            const announcements = await Promise.all(formData.announcements.map(async (a: any) => {
                const content = typeof a === 'string' ? a : (a.content || '');
                const currentEn = typeof a === 'string' ? '' : (a.content_en || '');
                return {
                    content: content,
                    content_en: currentEn || await translate(content)
                };
            }));

            setFormData({ ...formData, title_en, sessions, announcements });
            setSaveMsg(t('translate_success'));
        } catch (e) {
            console.error(e);
            setSaveMsg(t('translate_failed'));
        } finally {
            setSaving(false);
        }
    };

    // Helper for 24h input format
    const formatTo24hInput = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().slice(0, 16);
    };

    // Handlers
    const handleSessionChange = (idx: number, field: string, val: string) => {
        const newSessions = [...formData.sessions];
        newSessions[idx] = { ...newSessions[idx], [field]: val };
        setFormData({ ...formData, sessions: newSessions });
    };

    const addSession = () => {
        setFormData({
            ...formData,
            sessions: [...formData.sessions, { id: 'temp_' + Date.now(), name: t('round_label') + (formData.sessions.length + 1), startTime: "", endTime: "" }]
        });
    };

    const removeSession = (idx: number) => {
        const newSessions = formData.sessions.filter((_: any, i: number) => i !== idx);
        setFormData({ ...formData, sessions: newSessions });
    };

    const handleAnnouncementChange = (idx: number, field: string, val: string) => {
        const newAnn = [...formData.announcements];
        const current = typeof newAnn[idx] === 'string' ? { content: newAnn[idx], content_en: "" } : { ...newAnn[idx] };
        current[field] = val;
        newAnn[idx] = current;
        setFormData({ ...formData, announcements: newAnn });
    };

    const addAnnouncement = () => {
        setFormData({ ...formData, announcements: [...formData.announcements, { content: "", content_en: "" }] });
    };

    const removeAnnouncement = (idx: number) => {
        const newAnn = formData.announcements.filter((_: any, i: number) => i !== idx);
        setFormData({ ...formData, announcements: newAnn });
    };

    const handleSubjectChange = (idx: number, field: string, val: string) => {
        const newSubjects = [...formData.subjects];
        newSubjects[idx] = { ...newSubjects[idx], [field]: val };
        setFormData({ ...formData, subjects: newSubjects });
    };

    const addSubject = () => {
        setFormData({
            ...formData,
            subjects: [...formData.subjects, { id: 'temp_' + Date.now(), subject_id: "", name: "", folder: "", pin: "" }]
        });
    };

    const removeSubject = (idx: number) => {
        const newSubjects = formData.subjects.filter((_: any, i: number) => i !== idx);
        setFormData({ ...formData, subjects: newSubjects });
    };

    if (!exam) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
            <div style={{ width: '48px', height: '48px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    // Login Screen
    if (!isAuthenticated) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', padding: '16px' }}>
                <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '16px', maxWidth: '400px', width: '100%', border: '1px solid #334155', textAlign: 'center' }}>
                    <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none', marginBottom: '24px', fontSize: '14px' }}>
                        <ArrowLeft style={{ width: '16px', height: '16px' }} /> {t('back')}
                    </Link>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                        <div style={{ padding: '12px', backgroundColor: '#3b82f6', borderRadius: '50%' }}>
                            <Lock style={{ width: '32px', height: '32px', color: 'white' }} />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>{t('admin_pin')}</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>{t('settings_for')} {exam.examTitle}</p>
                    <form onSubmit={handleLogin}>
                        <div style={{ position: 'relative', marginBottom: '16px' }}>
                            <input
                                type={showLoginPin ? "text" : "password"}
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                placeholder={t('enter_admin_pin')}
                                style={{
                                    width: '100%', padding: '14px', backgroundColor: '#334155', border: '1px solid #475569', borderRadius: '8px',
                                    color: 'white', textAlign: 'center', fontSize: '20px', outline: 'none'
                                }}
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowLoginPin(!showLoginPin)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                            >
                                {showLoginPin ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {errorMsg && <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>{errorMsg}</p>}
                        <button type="submit" style={{
                            width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer'
                        }}>
                            {t('confirm')}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', padding: '32px', backgroundColor: '#0f172a', color: 'white' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* Navbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Link href="/admin" style={{ padding: '8px', color: '#94a3b8' }}>
                            <ArrowLeft style={{ width: '24px', height: '24px' }} />
                        </Link>
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>{t('exam_settings')}</h1>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', marginRight: '12px' }}>
                            <button onClick={() => setLocale('th')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: locale === 'th' ? '#3b82f6' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>TH</button>
                            <button onClick={() => setLocale('en')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: locale === 'en' ? '#3b82f6' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>EN</button>
                        </div>
                        <Link href={`/time/${id}`} target="_blank" style={{ padding: '10px 20px', backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid #3b82f6', borderRadius: '8px', color: '#60a5fa', textDecoration: 'none', fontSize: '14px' }}>
                            {t('time_monitor_view')}
                        </Link>
                        <Link href={`/exam/${id}`} target="_blank" style={{ padding: '10px 20px', backgroundColor: 'rgba(168,85,247,0.1)', border: '1px solid #a855f7', borderRadius: '8px', color: '#a855f7', textDecoration: 'none', fontSize: '14px' }}>
                            {t('student_view')}
                        </Link>
                    </div>
                </div>

                {/* Section: General */}
                <div style={{ padding: '24px', backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings style={{ width: '18px', height: '18px', color: '#60a5fa' }} /> {t('general_info')}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ fontSize: '14px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>{t('exam_title_th')}</label>
                            <input
                                type="text"
                                value={formData.examTitle}
                                onChange={(e) => setFormData({ ...formData, examTitle: e.target.value })}
                                style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white', outline: 'none' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '14px', color: '#60a5fa', display: 'block', marginBottom: '8px' }}>{t('exam_title_en')}</label>
                            <input
                                type="text"
                                value={formData.title_en}
                                onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                                style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white', outline: 'none' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '14px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>{t('admin_pin_edit')}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showAdminPin ? "text" : "password"}
                                    value={formData.adminPin}
                                    onChange={(e) => setFormData({ ...formData, adminPin: e.target.value })}
                                    style={{ width: '100%', padding: '12px', paddingRight: '45px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white', outline: 'none' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowAdminPin(!showAdminPin)}
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                                >
                                    {showAdminPin ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '14px', color: '#facc15', display: 'block', marginBottom: '8px' }}>
                                {locale === 'en' ? 'Access Code (for viewing documents)' : 'รหัสเข้าดูเอกสาร'}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showAccessCode ? "text" : "password"}
                                    value={formData.accessCode}
                                    onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                                    placeholder="e.g. 1234"
                                    style={{ width: '100%', padding: '12px', paddingRight: '45px', backgroundColor: '#0f172a', border: '1px solid #eab308', borderRadius: '8px', color: 'white', outline: 'none' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowAccessCode(!showAccessCode)}
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#ca8a04', cursor: 'pointer' }}
                                >
                                    {showAccessCode ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                

                {/* Section: Sessions */}
                <div style={{ padding: '24px', backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock style={{ width: '18px', height: '18px', color: '#fbbf24' }} /> {t('sessions')}
                        </h3>
                        <button onClick={addSession} style={{ padding: '6px 12px', backgroundColor: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid #3b82f6', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                            + {t('add_session')}
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {formData.sessions.map((s: any, idx: number) => (
                            <div key={s.id || idx} style={{ padding: '16px', backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', position: 'relative' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr auto', gap: '12px', alignItems: 'end' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>{t('session_name_th')}</label>
                                            <input type="text" value={s.name} onChange={(e) => handleSessionChange(idx, 'name', e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: 'white' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: '#60a5fa', display: 'block', marginBottom: '4px' }}>{t('session_name_en')}</label>
                                            <input type="text" value={s.name_en || ''} onChange={(e) => handleSessionChange(idx, 'name_en', e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: 'white' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>{t('start_time')}</label>
                                        <input type="datetime-local" value={s.startTime} onChange={(e) => handleSessionChange(idx, 'startTime', e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: 'white', colorScheme: 'dark' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>{t('end_time')}</label>
                                        <input type="datetime-local" value={s.endTime} onChange={(e) => handleSessionChange(idx, 'endTime', e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: 'white', colorScheme: 'dark' }} />
                                    </div>
                                    <button onClick={() => removeSession(idx)} style={{ padding: '8px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                        <Trash2 style={{ width: '18px', height: '18px' }} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section: Announcements */}
                <div style={{ padding: '24px', backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Megaphone style={{ width: '18px', height: '18px', color: '#4ade80' }} /> {t('announcements')}
                        </h3>
                        <button onClick={addAnnouncement} style={{ padding: '6px 12px', backgroundColor: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid #22c55e', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                            + {t('add_announcement')}
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {formData.announcements.map((ann: any, idx: number) => {
                            const content = typeof ann === 'string' ? ann : (ann.content || '');
                            const content_en = typeof ann === 'string' ? '' : (ann.content_en || '');
                            return (
                                <div key={'ann_' + idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
                                    <input type="text" value={content} onChange={(e) => handleAnnouncementChange(idx, 'content', e.target.value)} placeholder={t('announcement_th')} style={{ padding: '12px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white' }} />
                                    <input type="text" value={content_en} onChange={(e) => handleAnnouncementChange(idx, 'content_en', e.target.value)} placeholder={t('announcement_en')} style={{ padding: '12px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white' }} />
                                    <button onClick={() => removeAnnouncement(idx)} style={{ padding: '8px 12px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                        <Trash2 style={{ width: '18px', height: '18px' }} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Section: Subjects (Resources) */}
                {/* <div style={{ padding: '24px', backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FolderLock style={{ width: '18px', height: '18px', color: '#a855f7' }} /> {t('subjects_info')}
                        </h3>
                        <button onClick={addSubject} style={{ padding: '6px 12px', backgroundColor: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid #a855f7', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                            + {t('add_subject')}
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {formData.subjects.map((s: any, idx: number) => (
                            <div key={s.id || idx} style={{ padding: '16px', backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>{t('subject_code')}</label>
                                        <input type="text" value={s.subject_id} onChange={(e) => handleSubjectChange(idx, 'subject_id', e.target.value)} placeholder="JAVA101" style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: 'white' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>{t('subject_name')}</label>
                                        <input type="text" value={s.name} onChange={(e) => handleSubjectChange(idx, 'name', e.target.value)} placeholder="Java Programming" style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: 'white' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>{t('folder_name')}</label>
                                        <input type="text" value={s.folder} onChange={(e) => handleSubjectChange(idx, 'folder', e.target.value)} placeholder="java-mid" style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: 'white' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>{t('file_access_pin')}</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={showSubjectPinIdx === idx ? "text" : "password"}
                                                value={s.pin}
                                                onChange={(e) => handleSubjectChange(idx, 'pin', e.target.value)}
                                                placeholder="1234"
                                                style={{ width: '100%', padding: '8px', paddingRight: '35px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: 'white' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowSubjectPinIdx(showSubjectPinIdx === idx ? null : idx)}
                                                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                                            >
                                                {showSubjectPinIdx === idx ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <button onClick={() => removeSubject(idx)} style={{ padding: '8px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                        <Trash2 style={{ width: '18px', height: '18px' }} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div> */}

                <ExamFilesManager examId={String(exam.id)} adminPin={pin} />

                {/* Floating Save Button */}
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '20px', backgroundColor: 'rgba(15,23,42,0.9)', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'center', gap: '20px', zIndex: 100 }}>
                    <div style={{ maxWidth: '900px', width: '100%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px' }}>
                        {saveMsg && <span style={{ color: (saveMsg.includes('สำเร็จ') || saveMsg.includes('Success')) ? '#4ade80' : (saveMsg.includes('Processing') || saveMsg.includes('ประมวลผล') ? '#60a5fa' : '#f87171') }}>{saveMsg}</span>}
                        <button onClick={handleTranslateAll} disabled={saving} style={{ padding: '14px 20px', backgroundColor: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid #3b82f6', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Languages style={{ width: '20px', height: '20px' }} />
                            {t('translate_all')}
                        </button>
                        <button onClick={handleSave} disabled={saving} style={{ padding: '14px 40px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '18px', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 8px 15px rgba(59,130,246,0.3)' }}>
                            <Save style={{ width: '20px', height: '20px', marginRight: '8px', display: 'inline-block' }} />
                            {saving ? t('saving') : t('save_settings')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

