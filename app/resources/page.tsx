'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Eye, EyeOff, FileText, Search } from 'lucide-react';
import { useLocale } from '@/lib/LocaleContext';

type ExamSummary = {
    id: number;
    title?: string;
    examTitle?: string;
    title_en?: string;
    accessCode?: string | number | null;
    fileSharingEnabled?: boolean;
    files?: Array<{ name: string }>;
};

const getExamTitle = (exam: ExamSummary, locale: 'th' | 'en') => {
    if (locale === 'en' && exam.title_en?.trim()) {
        return exam.title_en.trim();
    }

    return exam.examTitle || exam.title || `Exam ${exam.id}`;
};

const getAccessCode = (exam: ExamSummary) => String(exam.accessCode ?? '');

export default function ResourcesIndexPage() {
    const router = useRouter();
    const { locale, setLocale } = useLocale();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [exams, setExams] = useState<ExamSummary[]>([]);
    const [selectedExam, setSelectedExam] = useState<ExamSummary | null>(null);
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [pinError, setPinError] = useState('');

    useEffect(() => {
        let active = true;

        const loadExams = async () => {
            try {
                setLoading(true);
                setError('');

                const examsResponse = await fetch('/api/exams');
                if (!examsResponse.ok) {
                    throw new Error('Failed to load exams');
                }

                const examList = await examsResponse.json();
                const details = await Promise.all(
                    examList.map(async (exam: { id: number }) => {
                        const response = await fetch(`/api/exams/${exam.id}`);
                        if (!response.ok) {
                            return null;
                        }

                        return response.json();
                    })
                );

                if (!active) {
                    return;
                }

                const visibleExams = details
                    .filter((exam): exam is ExamSummary => !!exam)
                    .filter((exam) => (exam.files?.length || 0) > 0);

                setExams(visibleExams);
            } catch (loadError) {
                console.error('Failed to load resources index', loadError);
                if (active) {
                    setError(locale === 'en' ? 'Unable to load shared documents' : 'ไม่สามารถโหลดรายการเอกสารได้');
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadExams();

        return () => {
            active = false;
        };
    }, [locale]);

    const filteredExams = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) {
            return exams;
        }

        return exams.filter((exam) => {
            const title = getExamTitle(exam, locale).toLowerCase();
            return title.includes(normalizedQuery) || String(exam.id).includes(normalizedQuery);
        });
    }, [exams, locale, query]);

    const openExam = (exam: ExamSummary) => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(`access_exam_${exam.id}`, 'true');
        }
        router.push(`/resources/exam/${exam.id}`);
    };

    const handleExamClick = (exam: ExamSummary) => {
        if (getAccessCode(exam).trim()) {
            setSelectedExam(exam);
            setPin('');
            setShowPin(false);
            setPinError('');
            return;
        }

        openExam(exam);
    };

    const handlePinSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedExam) {
            return;
        }

        if (pin === getAccessCode(selectedExam)) {
            openExam(selectedExam);
            return;
        }

        setPinError(locale === 'en' ? 'Incorrect access code' : 'รหัสเข้าดูเอกสารไม่ถูกต้อง');
        setPin('');
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 42%, #ffffff 100%)',
                padding: '32px 20px',
            }}
        >
            <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'end',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                        marginBottom: '24px',
                    }}
                >
                    {/* <Link
                        href="/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#64748b',
                            textDecoration: 'none',
                            fontWeight: 600,
                        }}
                    >
                        <ArrowLeft style={{ width: '20px', height: '20px' }} />
                        {locale === 'en' ? 'Back' : 'กลับหน้าหลัก'}
                    </Link> */}

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setLocale('th')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: locale === 'th' ? '#2563eb' : 'white', color: locale === 'th' ? 'white' : '#475569', cursor: 'pointer', fontWeight: 700 }}>TH</button>
                        <button onClick={() => setLocale('en')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: locale === 'en' ? '#2563eb' : 'white', color: locale === 'en' ? 'white' : '#475569', cursor: 'pointer', fontWeight: 700 }}>EN</button>
                    </div>
                </div>

                <div
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '28px',
                        padding: '28px',
                        border: '1px solid #dbeafe',
                        boxShadow: '0 20px 36px rgba(37,99,235,0.08)',
                        marginBottom: '24px',
                    }}
                >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '999px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>
                        <FileText style={{ width: '16px', height: '16px' }} />
                        {locale === 'en' ? 'Shared documents' : 'เอกสารที่แชร์'}
                    </div>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {locale === 'en' ? 'Choose a subject to open documents' : 'เลือกวิชาที่ต้องการเปิดเอกสาร'}
                    </h1>
                    <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: '15px' }}>
                        {locale === 'en'
                            ? 'Each exam in this list is treated as one subject. If an instructor set an access code, you will be asked before opening the files.'
                            : 'ในระบบนี้ การสอบแต่ละรายการจะถือเป็นหนึ่งวิชา หากอาจารย์ตั้งรหัสไว้ ระบบจะถามรหัสก่อนเปิดเอกสาร'}
                    </p>
                </div>

                <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <Search style={{ width: '16px', height: '16px', color: '#94a3b8', position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={locale === 'en' ? 'Search subject name' : 'ค้นหาชื่อวิชา'}
                        style={{ width: '100%', padding: '14px 16px 14px 40px', backgroundColor: 'white', border: '1px solid #dbeafe', borderRadius: '16px', color: '#0f172a', outline: 'none', boxShadow: '0 10px 18px rgba(15,23,42,0.04)' }}
                    />
                </div>

                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '96px 24px' }}>
                        <div style={{ width: '42px', height: '42px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : error ? (
                    <div style={{ padding: '24px', borderRadius: '18px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                        {error}
                    </div>
                ) : filteredExams.length === 0 ? (
                    <div style={{ padding: '84px 24px', textAlign: 'center', backgroundColor: 'white', borderRadius: '28px', border: '2px dashed #dbeafe' }}>
                        <BookOpen style={{ width: '64px', height: '64px', color: '#93c5fd', margin: '0 auto 16px' }} />
                        <h3 style={{ fontSize: '22px', color: '#1e293b', marginBottom: '10px' }}>
                            {locale === 'en' ? 'No shared subjects yet' : 'ยังไม่มีวิชาที่แชร์เอกสาร'}
                        </h3>
                        <p style={{ color: '#64748b', margin: 0 }}>
                            {locale === 'en' ? 'Please check again later.' : 'กรุณาลองใหม่อีกครั้งภายหลัง'}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        {filteredExams.map((exam) => (
                            <button
                                key={exam.id}
                                type="button"
                                onClick={() => handleExamClick(exam)}
                                style={{
                                    padding: '24px',
                                    borderRadius: '24px',
                                    border: '1px solid #dbeafe',
                                    backgroundColor: 'white',
                                    textAlign: 'left',
                                    boxShadow: '0 10px 22px rgba(15,23,42,0.05)',
                                    cursor: 'pointer',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div style={{ padding: '14px', borderRadius: '18px', backgroundColor: '#eff6ff' }}>
                                        <BookOpen style={{ width: '28px', height: '28px', color: '#2563eb' }} />
                                    </div>
                                    <div style={{ padding: '8px 10px', borderRadius: '999px', backgroundColor: '#f8fafc', color: '#475569', fontSize: '12px', fontWeight: 700 }}>
                                        {(exam.files?.length || 0)} {locale === 'en' ? 'file(s)' : 'ไฟล์'}
                                    </div>
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                                    {getExamTitle(exam, locale)}
                                </div>
                                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                                    {locale === 'en' ? `Exam #${exam.id}` : `การสอบ #${exam.id}`}
                                </div>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#1d4ed8', fontWeight: 700 }}>
                                    <FileText style={{ width: '16px', height: '16px' }} />
                                    {getAccessCode(exam).trim()
                                        ? (locale === 'en' ? 'Enter access code to open' : 'กรอกรหัสก่อนเปิดเอกสาร')
                                        : (locale === 'en' ? 'Open documents' : 'เปิดเอกสาร')}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selectedExam && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.68)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100 }}>
                    <div style={{ width: '100%', maxWidth: '420px', backgroundColor: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 24px 50px rgba(0,0,0,0.25)' }}>
                        <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                            {locale === 'en' ? 'Enter access code' : 'กรอกรหัสเข้าดูเอกสาร'}
                        </h3>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>
                            {getExamTitle(selectedExam, locale)} • {(selectedExam.files?.length || 0)} {locale === 'en' ? 'file(s)' : 'ไฟล์'}
                        </p>

                        <form onSubmit={handlePinSubmit}>
                            <div style={{ position: 'relative', marginBottom: '16px' }}>
                                <input
                                    type={showPin ? 'text' : 'password'}
                                    value={pin}
                                    onChange={(event) => setPin(event.target.value)}
                                    placeholder={locale === 'en' ? 'Access code' : 'รหัสเข้าดูเอกสาร'}
                                    style={{ width: '100%', padding: '16px', paddingRight: '50px', border: '2px solid #dbeafe', borderRadius: '16px', textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: '#1e40af', outline: 'none' }}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPin((prev) => !prev)}
                                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}
                                >
                                    {showPin ? <EyeOff size={22} /> : <Eye size={22} />}
                                </button>
                            </div>

                            {pinError && <p style={{ color: '#dc2626', textAlign: 'center', fontWeight: 'bold', marginBottom: '16px' }}>{pinError}</p>}

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedExam(null)}
                                    style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '12px', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    {locale === 'en' ? 'Cancel' : 'ยกเลิก'}
                                </button>
                                <button
                                    type="submit"
                                    style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    {locale === 'en' ? 'Open documents' : 'เปิดเอกสาร'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
