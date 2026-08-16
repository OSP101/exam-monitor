'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, FolderLock, LibraryBig } from 'lucide-react';
import useSWR from 'swr';
import Link from 'next/link';
import { useLocale } from '@/lib/LocaleContext';
import Footer from '@/components/Footer';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ExamSubjectsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: config, error } = useSWR(`/api/exams/${id}`, fetcher);
    const router = useRouter();
    const { locale, setLocale } = useLocale();

    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubjectClick = (subject: any) => {
        setSelectedSubject(subject);
        setPin('');
        setShowPin(false);
        setErrorMsg('');
    };

    const handlePinSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedSubject) return;

        try {
            const res = await fetch(`/api/exams/${id}/verify-access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: selectedSubject.folder, pin })
            });
            if (res.ok) {
                sessionStorage.setItem(`access_${id}_${selectedSubject.folder}`, 'true');
                router.push(`/resources/${selectedSubject.folder}?exam=${id}`);
                return;
            }
            const data = await res.json().catch(() => null);
            if (data?.error) {
                setErrorMsg(data.error);
                setPin('');
                return;
            }
        } catch (error) {
            console.error('Failed to verify subject PIN', error);
        }

        setErrorMsg(locale === 'en' ? 'Incorrect PIN' : 'รหัสไม่ถูกต้อง');
        setPin('');
    };

    if (error) {
        return <div style={{ padding: '32px', color: '#dc2626' }}>{locale === 'en' ? 'Unable to load exam information' : 'ไม่สามารถโหลดข้อมูลการสอบได้'}</div>;
    }

    if (!config) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '48px', height: '48px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 42%, #ffffff 100%)' }}>
            <div style={{ width: '100%', maxWidth: '980px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
                    <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none' }}>
                        <ArrowLeft style={{ width: '20px', height: '20px' }} />
                        {locale === 'en' ? 'Back' : 'กลับ'}
                    </Link>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setLocale('th')} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: locale === 'th' ? '#3b82f6' : 'white', color: locale === 'th' ? 'white' : '#64748b', cursor: 'pointer' }}>TH</button>
                        <button onClick={() => setLocale('en')} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: locale === 'en' ? '#3b82f6' : 'white', color: locale === 'en' ? 'white' : '#64748b', cursor: 'pointer' }}>EN</button>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '18px', flexWrap: 'wrap' }}>
                    <div>
                        <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>
                            {locale === 'en' ? (config.title_en || config.examTitle) : config.examTitle}
                        </h1>
                        <p style={{ fontSize: '20px', color: '#64748b', margin: 0 }}>
                            {locale === 'en'
                                ? 'Select a subject to continue, or open the document subject page.'
                                : 'เลือกวิชาเพื่อดำเนินการต่อ หรือเปิดหน้ารวมวิชาที่มีเอกสาร'}
                        </p>
                    </div>

                    <Link
                        href={`/resources/exam/${config.id}`}
                        style={{
                            padding: '16px 24px',
                            backgroundColor: '#eab308',
                            color: '#854d0e',
                            border: 'none',
                            borderRadius: '16px',
                            fontWeight: 'bold',
                            fontSize: '18px',
                            boxShadow: '0 4px 15px rgba(234, 179, 8, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textDecoration: 'none'
                        }}
                    >
                        <LibraryBig style={{ width: '24px', height: '24px' }} />
                        {locale === 'en' ? 'Document subjects' : 'วิชาที่มีเอกสาร'}
                    </Link>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', width: '100%', maxWidth: '980px' }}>
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
                        <p style={{ fontSize: '16px', color: '#64748b', margin: 0 }}>{subject.subject_id}</p>
                    </button>
                ))}
            </div>

            {selectedSubject && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100 }}>
                    <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>
                            {locale === 'en' ? 'Enter subject PIN' : 'กรอกรหัสวิชา'}
                        </h3>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>{selectedSubject.name}</p>

                        <form onSubmit={handlePinSubmit}>
                            <div style={{ position: 'relative', marginBottom: '16px' }}>
                                <input
                                    type={showPin ? 'text' : 'password'}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    placeholder={locale === 'en' ? 'Subject PIN' : 'รหัสวิชา'}
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
                                <button type="button" onClick={() => setSelectedSubject(null)} style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '12px', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>
                                    {locale === 'en' ? 'Cancel' : 'ยกเลิก'}
                                </button>
                                <button type="submit" style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                                    {locale === 'en' ? 'Confirm' : 'ยืนยัน'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
