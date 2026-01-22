'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { FolderLock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ExamSubjectsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: config, error } = useSWR(`/api/exams/${id}`, fetcher);
    const router = useRouter();

    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [isExamPinModalOpen, setIsExamPinModalOpen] = useState(false);
    const [examPin, setExamPin] = useState('');
    const [showExamPin, setShowExamPin] = useState(false);

    const handleSubjectClick = (subject: any) => {
        setSelectedSubject(subject);
        setPin('');
        setShowPin(false);
        setErrorMsg('');
    };

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === selectedSubject.pin) {
            sessionStorage.setItem(`access_${selectedSubject.folder}`, 'true');
            router.push(`/resources/${selectedSubject.folder}`);
        } else {
            setErrorMsg('รหัสวิชาไม่ถูกต้อง');
            setPin('');
        }
    };

    const handleExamPinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Use String() to handle cases where PIN might be returned as number from DB (SQLite INTEGER column)
        if (String(examPin) === String(config.studentPin)) {
            sessionStorage.setItem(`access_exam_${config.id}`, 'true');
            router.push(`/resources/exam/${config.id}`);
        } else {
            setErrorMsg('รหัส PIN ไม่ถูกต้อง');
            setExamPin('');
        }
    };

    if (error) return <div style={{ padding: '32px', color: '#dc2626' }}>ไม่สามารถโหลดข้อมูลได้</div>;
    if (!config) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '48px', height: '48px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: '900px', marginBottom: '32px' }}>
                <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none', marginBottom: '24px' }}>
                    <ArrowLeft style={{ width: '20px', height: '20px' }} /> ย้อนกลับ
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>{config.examTitle}</h1>
                        <p style={{ fontSize: '20px', color: '#64748b' }}>กรุณาเลือกรายวิชาหรือเอกสารที่ต้องการเข้าดู</p>
                    </div>
                    {config.fileSharingEnabled && (
                        <button
                            onClick={() => { setIsExamPinModalOpen(true); setErrorMsg(''); setExamPin(''); setShowExamPin(false); }}
                            style={{
                                padding: '16px 24px', backgroundColor: '#eab308', color: '#854d0e', border: 'none', borderRadius: '16px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(234, 179, 8, 0.3)', display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            <FolderLock style={{ width: '24px', height: '24px' }} />
                            ดูเอกสารเตรียมสอบ (ทั้งหมด)
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', width: '100%', maxWidth: '900px' }}>
                {config.subjects?.map((subject: any) => (
                    <button
                        key={subject.id}
                        onClick={() => handleSubjectClick(subject)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '40px 24px',
                            backgroundColor: 'white',
                            border: '2px solid #bfdbfe',
                            borderRadius: '24px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            boxShadow: '0 8px 30px rgba(59,130,246,0.1)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                        onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                    >
                        <div style={{ padding: '16px', backgroundColor: '#dbeafe', borderRadius: '16px', marginBottom: '16px' }}>
                            <FolderLock style={{ width: '48px', height: '48px', color: '#2563eb' }} />
                        </div>
                        <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>{subject.name}</h3>
                        <p style={{ fontSize: '16px', color: '#64748b' }}>{subject.id}</p>
                    </button>
                ))}
            </div>

            {selectedSubject && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100 }}>
                    <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>กรอกรหัสวิชา</h3>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>วิชา: {selectedSubject.name}</p>

                        <form onSubmit={handlePinSubmit}>
                            <div style={{ position: 'relative', marginBottom: '16px' }}>
                                <input
                                    type={showPin ? "text" : "password"}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    placeholder="รหัสวิชา"
                                    style={{ width: '100%', padding: '16px', paddingRight: '50px', border: '3px solid #bfdbfe', borderRadius: '16px', textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: '#1e40af', outline: 'none' }}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPin(!showPin)}
                                    style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}
                                >
                                    {showPin ? <EyeOff size={24} /> : <Eye size={24} />}
                                </button>
                            </div>
                            {errorMsg && <p style={{ color: '#dc2626', textAlign: 'center', fontWeight: 'bold', marginBottom: '16px' }}>{errorMsg}</p>}

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="button" onClick={() => setSelectedSubject(null)} style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '12px', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>ยกเลิก</button>
                                <button type="submit" style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>ยืนยัน</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isExamPinModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100 }}>
                    <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#854d0e', marginBottom: '8px' }}>กรอกรหัส Student PIN</h3>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>เข้าดูเอกสารทั้งหมดของการสอบนี้</p>

                        <form onSubmit={handleExamPinSubmit}>
                            <div style={{ position: 'relative', marginBottom: '16px' }}>
                                <input
                                    type={showExamPin ? "text" : "password"}
                                    value={examPin}
                                    onChange={(e) => setExamPin(e.target.value)}
                                    placeholder="Student PIN"
                                    style={{ width: '100%', padding: '16px', paddingRight: '50px', border: '3px solid #fde047', borderRadius: '16px', textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: '#854d0e', outline: 'none' }}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowExamPin(!showExamPin)}
                                    style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#ca8a04', cursor: 'pointer' }}
                                >
                                    {showExamPin ? <EyeOff size={24} /> : <Eye size={24} />}
                                </button>
                            </div>
                            {errorMsg && <p style={{ color: '#dc2626', textAlign: 'center', fontWeight: 'bold', marginBottom: '16px' }}>{errorMsg}</p>}

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="button" onClick={() => setIsExamPinModalOpen(false)} style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '12px', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>ยกเลิก</button>
                                <button type="submit" style={{ flex: 1, padding: '14px', backgroundColor: '#eab308', border: 'none', borderRadius: '12px', color: '#854d0e', fontWeight: 'bold', cursor: 'pointer' }}>เข้าถึงเอกสาร</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
