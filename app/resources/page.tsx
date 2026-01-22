'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FolderLock, ArrowLeft } from 'lucide-react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ResourcesPage() {
    // Default to exam 1 if accessed directly
    const { data: config, error } = useSWR('/api/exams/1', fetcher);
    const router = useRouter();

    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [pin, setPin] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubjectClick = (subject: any) => {
        setSelectedSubject(subject);
        setPin('');
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

    if (error) return <div style={{ padding: '32px', color: '#dc2626' }}>ไม่พบข้อมูลรายวิชา</div>;
    if (!config) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '48px', height: '48px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', padding: '32px' }}>
            {/* Back Button */}
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none', marginBottom: '24px', fontWeight: '500' }}>
                <ArrowLeft style={{ width: '20px', height: '20px' }} />
                กลับหน้าหลัก
            </Link>

            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>{config.examTitle}</h1>
                <p style={{ fontSize: '18px', color: '#475569' }}>เลือกรายวิชาที่ต้องการเข้าดูเอกสาร (ต้องใช้รหัสวิชา)</p>
            </div>

            {/* Subject Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', maxWidth: '900px' }}>
                {config.subjects?.map((subject: any) => (
                    <button
                        key={subject.id}
                        onClick={() => handleSubjectClick(subject)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '32px 24px',
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            border: '2px solid #bfdbfe',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            boxShadow: '0 8px 30px rgba(59,130,246,0.15)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                        onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                    >
                        <div style={{ padding: '16px', backgroundColor: '#dbeafe', borderRadius: '12px', marginBottom: '16px' }}>
                            <FolderLock style={{ width: '40px', height: '40px', color: '#2563eb' }} />
                        </div>
                        <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>{subject.name}</h3>
                        <p style={{ fontSize: '14px', color: '#64748b' }}>คลิกเพื่อใส่รหัสวิชา</p>
                    </button>
                ))}
            </div>

            {/* PIN Modal */}
            {selectedSubject && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    zIndex: 100
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '400px',
                        backgroundColor: 'white',
                        borderRadius: '20px',
                        padding: '32px',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
                    }}>
                        <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>กรอกรหัสวิชา</h3>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>วิชา: {selectedSubject.name}</p>

                        <form onSubmit={handlePinSubmit}>
                            <input
                                type="password"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                placeholder="รหัสวิชา"
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    border: '2px solid #bfdbfe',
                                    borderRadius: '12px',
                                    textAlign: 'center',
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: '#1e40af',
                                    marginBottom: '16px',
                                    outline: 'none'
                                }}
                                autoFocus
                            />
                            {errorMsg && <p style={{ color: '#dc2626', textAlign: 'center', marginBottom: '16px' }}>{errorMsg}</p>}

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSubject(null)}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        backgroundColor: '#f1f5f9',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: '#475569',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ยืนยัน
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
