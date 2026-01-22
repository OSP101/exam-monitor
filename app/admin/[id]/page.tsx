'use client';

import { useState, useEffect, use, useRef } from 'react';
import useSWR from 'swr';
import { Settings, Save, Lock, Megaphone, Clock, Plus, Trash2, ArrowLeft, FolderLock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ExamAdminPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: exam, mutate } = useSWR(`/api/exams/${id}`, fetcher);
    const router = useRouter();

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [showLoginPin, setShowLoginPin] = useState(false);
    const [showAdminPin, setShowAdminPin] = useState(false);
    const [showStudentPin, setShowStudentPin] = useState(false);
    const [showSubjectPinIdx, setShowSubjectPinIdx] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');

    const [formData, setFormData] = useState<any>({
        examTitle: '',
        adminPin: '',
        studentPin: '',
        sessions: [],
        announcements: [],
        subjects: [],
        fileSharingEnabled: false
    });

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState('');
    // Files list state (exam-level)
    const filesFolderParam = exam?.id ? `${exam.id}` : '';
    const { data: filesList, mutate: mutateFiles } = useSWR(() => filesFolderParam ? `/api/files?folder=${encodeURIComponent(filesFolderParam)}` : null, fetcher);
    const examFileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (exam) {
            setFormData({
                examTitle: exam.examTitle || '',
                adminPin: exam.adminPin || '',
                sessions: exam.sessions || [],
                announcements: exam.announcements || [],
                subjects: exam.subjects || [],
                fileSharingEnabled: exam.fileSharingEnabled || false,
                studentPin: exam.studentPin || ''
            });
        }
    }, [exam]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (exam && pin === exam.adminPin) {
            setIsAuthenticated(true);
            setErrorMsg('');
        } else {
            setErrorMsg('รหัสผ่านไม่ถูกต้อง');
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
                setSaveMsg('บันทึกสำเร็จ!');
                mutate();
                setTimeout(() => setSaveMsg(''), 3000);
            } else {
                const data = await res.json();
                setSaveMsg(data.error || 'บันทึกไม่สำเร็จ');
            }
        } catch (e) {
            setSaveMsg('เกิดข้อผิดพลาด');
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

    // Helper to convert file to base64
    const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => { const result = reader.result as string; const b64 = result.split(',')[1]; resolve(b64); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    // Handlers
    const handleSessionChange = (idx: number, field: string, val: string) => {
        const newSessions = [...formData.sessions];
        newSessions[idx] = { ...newSessions[idx], [field]: val };
        setFormData({ ...formData, sessions: newSessions });
    };

    const addSession = () => {
        setFormData({
            ...formData,
            sessions: [...formData.sessions, { id: 'temp_' + Date.now(), name: "รอบที่ " + (formData.sessions.length + 1), startTime: "", endTime: "" }]
        });
    };

    const removeSession = (idx: number) => {
        const newSessions = formData.sessions.filter((_: any, i: number) => i !== idx);
        setFormData({ ...formData, sessions: newSessions });
    };

    const handleAnnouncementChange = (idx: number, val: string) => {
        const newAnn = [...formData.announcements];
        newAnn[idx] = val;
        setFormData({ ...formData, announcements: newAnn });
    };

    const addAnnouncement = () => {
        setFormData({ ...formData, announcements: [...formData.announcements, ""] });
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
                        <ArrowLeft style={{ width: '16px', height: '16px' }} /> ย้อนกลับ
                    </Link>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                        <div style={{ padding: '12px', backgroundColor: '#3b82f6', borderRadius: '50%' }}>
                            <Lock style={{ width: '32px', height: '32px', color: 'white' }} />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Admin PIN</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>การตั้งค่าสำหรับ: {exam.examTitle}</p>
                    <form onSubmit={handleLogin}>
                        <div style={{ position: 'relative', marginBottom: '16px' }}>
                            <input
                                type={showLoginPin ? "text" : "password"}
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                placeholder="กรอกรหัส Admin"
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
                            ยืนยัน
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
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>ตั้งค่าห้องสอบ</h1>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <Link href={`/time/${id}`} target="_blank" style={{ padding: '10px 20px', backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid #3b82f6', borderRadius: '8px', color: '#60a5fa', textDecoration: 'none', fontSize: '14px' }}>
                            เปิดหน้าจอเวลา
                        </Link>
                        <Link href={`/exam/${id}`} target="_blank" style={{ padding: '10px 20px', backgroundColor: 'rgba(168,85,247,0.1)', border: '1px solid #a855f7', borderRadius: '8px', color: '#a855f7', textDecoration: 'none', fontSize: '14px' }}>
                            เปิดหน้าเด็ก
                        </Link>
                    </div>
                </div>

                {/* Section: General */}
                <div style={{ padding: '24px', backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings style={{ width: '18px', height: '18px', color: '#60a5fa' }} /> ข้อมูลทั่วไป
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ fontSize: '14px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>ชื่อการสอบ / ชื่อวิชา</label>
                            <input
                                type="text"
                                value={formData.examTitle}
                                onChange={(e) => setFormData({ ...formData, examTitle: e.target.value })}
                                style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white', outline: 'none' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '14px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>รหัส Admin PIN ใหม่</label>
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
                            <label style={{ fontSize: '14px', color: '#facc15', display: 'block', marginBottom: '8px' }}>รหัส PIN สำหรับนักศึกษา (สิทธิ์ดูไฟล์ทั้งหมด)</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showStudentPin ? "text" : "password"}
                                    value={formData.studentPin}
                                    onChange={(e) => setFormData({ ...formData, studentPin: e.target.value })}
                                    placeholder="เช่น 1234"
                                    style={{ width: '100%', padding: '12px', paddingRight: '45px', backgroundColor: '#0f172a', border: '1px solid #eab308', borderRadius: '8px', color: 'white', outline: 'none' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowStudentPin(!showStudentPin)}
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#ca8a04', cursor: 'pointer' }}
                                >
                                    {showStudentPin ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Sessions */}
                <div style={{ padding: '24px', backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock style={{ width: '18px', height: '18px', color: '#fbbf24' }} /> รอบการสอบ (เซสชัน)
                        </h3>
                        <button onClick={addSession} style={{ padding: '6px 12px', backgroundColor: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid #3b82f6', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                            + เพิ่มรอบ
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {formData.sessions.map((s: any, idx: number) => (
                            <div key={s.id || idx} style={{ padding: '16px', backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', position: 'relative' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr auto', gap: '12px', alignItems: 'end' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>ชื่อรอบ</label>
                                        <input type="text" value={s.name} onChange={(e) => handleSessionChange(idx, 'name', e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: 'white' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>เริ่ม (24 ชม.)</label>
                                        <input type="datetime-local" value={s.startTime} onChange={(e) => handleSessionChange(idx, 'startTime', e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: 'white', colorScheme: 'dark' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>สิ้นสุด (24 ชม.)</label>
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
                            <Megaphone style={{ width: '18px', height: '18px', color: '#4ade80' }} /> ข้อความประชาสัมพันธ์
                        </h3>
                        <button onClick={addAnnouncement} style={{ padding: '6px 12px', backgroundColor: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid #22c55e', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                            + เพิ่มข้อความ
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {formData.announcements.map((ann: string, idx: number) => (
                            <div key={'ann_' + idx} style={{ display: 'flex', gap: '8px' }}>
                                <input type="text" value={ann} onChange={(e) => handleAnnouncementChange(idx, e.target.value)} style={{ flex: 1, padding: '12px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white' }} />
                                <button onClick={() => removeAnnouncement(idx)} style={{ padding: '8px 12px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                    <Trash2 style={{ width: '18px', height: '18px' }} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section: Subjects (Resources) */}
                <div style={{ padding: '24px', backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FolderLock style={{ width: '18px', height: '18px', color: '#a855f7' }} /> รายการวิชา (เข้าดูสไลด์)
                        </h3>
                        <button onClick={addSubject} style={{ padding: '6px 12px', backgroundColor: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid #a855f7', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                            + เพิ่มวิชา
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {formData.subjects.map((s: any, idx: number) => (
                            <div key={s.id || idx} style={{ padding: '16px', backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>รหัสย่อ (ID)</label>
                                        <input type="text" value={s.subject_id} onChange={(e) => handleSubjectChange(idx, 'subject_id', e.target.value)} placeholder="JAVA101" style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: 'white' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>ชื่อวิชา</label>
                                        <input type="text" value={s.name} onChange={(e) => handleSubjectChange(idx, 'name', e.target.value)} placeholder="Java Programming" style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: 'white' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>ชื่อโฟลเดอร์</label>
                                        <input type="text" value={s.folder} onChange={(e) => handleSubjectChange(idx, 'folder', e.target.value)} placeholder="java-mid" style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: 'white' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>PIN สำหรับวิชา</label>
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
                </div>

                {/* Section: Files (exam-level) */}
                <div style={{ padding: '24px', backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', marginBottom: '100px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Settings style={{ width: '18px', height: '18px', color: '#a855f7' }} /> ไฟล์การสอบ (รวม)
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '13px', color: '#94a3b8' }}>เปิดแชร์หน้าไฟล์:</label>
                            <input
                                type="checkbox"
                                checked={formData.fileSharingEnabled}
                                onChange={(e) => setFormData({ ...formData, fileSharingEnabled: e.target.checked })}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                        <button onClick={() => examFileInputRef.current?.click()} disabled={!formData.fileSharingEnabled || !isAuthenticated} style={{ padding: '8px 12px', background: 'linear-gradient(90deg,#0b1220,#111827)', border: '1px solid #2b3440', borderRadius: '8px', color: '#cbd5e1', cursor: (!formData.fileSharingEnabled || !isAuthenticated) ? 'not-allowed' : 'pointer' }}>
                            อัปโหลดไฟล์ไปยังการสอบ
                        </button>
                        <input ref={examFileInputRef} type="file" multiple onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length === 0) return;
                            if (!pin) { alert('กรุณาล็อกอินด้วย Admin PIN ก่อนอัปโหลด'); return; }
                            let success = 0;
                            let failed: string[] = [];
                            try {
                                setUploading(true);
                                for (let i = 0; i < files.length; i++) {
                                    const file = files[i];
                                    setUploadMsg(`กำลังอัปโหลด ${i + 1}/${files.length} : ${file.name}`);
                                    try {
                                        const b64 = await fileToBase64(file);
                                        const res = await fetch('/api/files', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ folder: `${exam?.id}`, filename: file.name, contentBase64: b64, adminPin: pin })
                                        });
                                        if (res.ok) {
                                            success++;
                                        } else {
                                            const data = await res.json();
                                            failed.push(`${file.name}: ${data.error || 'failed'}`);
                                        }
                                    } catch (innerErr) {
                                        console.error('upload file error', innerErr);
                                        failed.push(`${file.name}: error`);
                                    }
                                }
                                if (failed.length === 0) {
                                    setUploadMsg(`อัปโหลดสำเร็จ ${success}/${files.length}`);
                                } else {
                                    setUploadMsg(`อัปโหลดเสร็จ โดยสำเร็จ ${success}/${files.length}. ผิดพลาด: ${failed.join('; ')}`);
                                }
                                mutateFiles();
                            } catch (err) {
                                console.error(err);
                                setUploadMsg('เกิดข้อผิดพลาดระหว่างอัปโหลด');
                            } finally {
                                setUploading(false);
                            }
                        }} style={{ display: 'none' }} />
                        <div style={{ color: '#94a3b8', fontSize: '13px' }}>{uploading ? 'กำลังอัปโหลด...' : (uploadMsg || 'ยังไม่มีการอัปโหลดล่าสุด')}</div>
                    </div>

                    {!filesList && <div style={{ color: '#94a3b8' }}>กำลังโหลด...</div>}
                    {filesList && filesList.files && filesList.files.length === 0 && <div style={{ color: '#94a3b8' }}>ยังไม่มีไฟล์</div>}
                    {filesList && filesList.files && (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #172033' }}>
                                        <th style={{ padding: '10px 8px' }}>ชื่อไฟล์</th>
                                        <th style={{ padding: '10px 8px' }}>ขนาด</th>
                                        <th style={{ padding: '10px 8px' }}>การกระทำ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filesList.files.map((f: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #0b1220' }}>
                                            <td style={{ padding: '10px 8px' }}>
                                                <a href={`/api/view/${encodeURIComponent(`${exam.id}/${f.path}`)}`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>{f.name}</a>
                                            </td>
                                            <td style={{ padding: '10px 8px' }}>{(f.size / 1024).toFixed(1)} KB</td>
                                            <td style={{ padding: '10px 8px' }}>
                                                <a href={`/api/files/download?path=${encodeURIComponent(`${exam.id}/${f.path}`)}`} target="_blank" rel="noreferrer" style={{ marginRight: '8px', color: '#60a5fa' }}>ดาวน์โหลด</a>
                                                <button onClick={async () => {
                                                    if (!confirm('ลบไฟล์นี้หรือไม่?')) return;
                                                    try {
                                                        const res = await fetch('/api/files', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: `${exam.id}/${f.path}`, adminPin: pin }) });
                                                        if (res.ok) { mutateFiles(); } else { const data = await res.json(); alert(data.error || 'Delete failed'); }
                                                    } catch (e) { console.error(e); }
                                                }} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>ลบ</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Floating Save Button */}
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '20px', backgroundColor: 'rgba(15,23,42,0.9)', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'center', gap: '20px', zIndex: 100 }}>
                    <div style={{ maxWidth: '900px', width: '100%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px' }}>
                        {saveMsg && <span style={{ color: saveMsg.includes('สำเร็จ') ? '#4ade80' : '#f87171' }}>{saveMsg}</span>}
                        <button onClick={handleSave} disabled={saving} style={{ padding: '14px 40px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '18px', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 8px 15px rgba(59,130,246,0.3)' }}>
                            <Save style={{ width: '20px', height: '20px', marginRight: '8px', display: 'inline-block' }} />
                            {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
