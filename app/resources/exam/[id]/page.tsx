'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Eye, EyeOff, FileSearch, FileText, FolderOpen, Search } from 'lucide-react';
import useSWR from 'swr';
import { useLocale } from '@/lib/LocaleContext';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ExamResourcesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { locale, setLocale } = useLocale();
    const [authorized, setAuthorized] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [query, setQuery] = useState('');
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [pinError, setPinError] = useState('');

    const { data: config, error: configError } = useSWR(`/api/exams/${id}`, fetcher);
    const { data: filesData, error: filesError } = useSWR(
        authorized ? `/api/files?folder=${id}&publishedOnly=1` : null,
        fetcher
    );

    useEffect(() => {
        if (!config || typeof window === 'undefined') {
            return;
        }

        const hasPin = !!config?.hasAccessCode;
        const hasAccess = sessionStorage.getItem(`access_exam_${id}`) === 'true';

        setAuthorized(!hasPin || hasAccess);
        setCheckingAuth(false);
    }, [config, id]);

    const examTitle = useMemo(() => {
        if (!config) {
            return '';
        }

        if (locale === 'en' && config.title_en?.trim()) {
            return config.title_en.trim();
        }

        return config.examTitle || `Exam ${id}`;
    }, [config, id, locale]);

    const filteredFiles = useMemo(() => {
        const files = filesData?.files || [];
        const normalizedQuery = query.trim().toLowerCase();

        if (!normalizedQuery) {
            return files;
        }

        return files.filter((file: any) => String(file.name || '').toLowerCase().includes(normalizedQuery));
    }, [filesData?.files, query]);

    const handlePinSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!config) {
            return;
        }

        try {
            const res = await fetch(`/api/exams/${id}/verify-access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessCode: pin })
            });
            if (res.ok) {
                sessionStorage.setItem(`access_exam_${id}`, 'true');
                setAuthorized(true);
                setPin('');
                setPinError('');
                return;
            }
        } catch (error) {
            console.error('Failed to verify access code', error);
        }

        setPinError(locale === 'en' ? 'Incorrect access code' : 'รหัสเข้าดูเอกสารไม่ถูกต้อง');
        setPin('');
    };

    if (configError) {
        return <div style={{ padding: '32px', color: '#dc2626' }}>{locale === 'en' ? 'Unable to load exam documents' : 'ไม่สามารถโหลดเอกสารของวิชานี้ได้'}</div>;
    }

    if (!config || checkingAuth) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
                <div style={{ width: '42px', height: '42px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!authorized) {
        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 45%, #ffffff 100%)', padding: '32px 20px' }}>
                <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                        <Link href="/resources" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>
                            <ArrowLeft style={{ width: '20px', height: '20px' }} />
                            {locale === 'en' ? 'Back' : 'กลับหน้ารายวิชา'}
                        </Link>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setLocale('th')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: locale === 'th' ? '#2563eb' : 'white', color: locale === 'th' ? 'white' : '#475569', cursor: 'pointer', fontWeight: 700 }}>TH</button>
                            <button onClick={() => setLocale('en')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: locale === 'en' ? '#2563eb' : 'white', color: locale === 'en' ? 'white' : '#475569', cursor: 'pointer', fontWeight: 700 }}>EN</button>
                        </div>
                    </div>

                    <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 24px 50px rgba(15,23,42,0.08)', border: '1px solid #dbeafe' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
                            {locale === 'en' ? 'Enter access code' : 'กรอกรหัสเข้าดูเอกสาร'}
                        </h1>
                        <p style={{ color: '#64748b', margin: '0 0 24px' }}>{examTitle}</p>

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

                            <button
                                type="submit"
                                style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                {locale === 'en' ? 'Open documents' : 'เปิดเอกสาร'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', padding: '32px', background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '12px', flexWrap: 'wrap' }}>
                    <Link href="/resources" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
                        <ArrowLeft style={{ width: '20px', height: '20px' }} />
                        {locale === 'en' ? 'Back to subjects' : 'กลับหน้ารายวิชา'}
                    </Link>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setLocale('th')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: locale === 'th' ? '#3b82f6' : 'white', color: locale === 'th' ? 'white' : '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>TH</button>
                        <button onClick={() => setLocale('en')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: locale === 'en' ? '#3b82f6' : 'white', color: locale === 'en' ? 'white' : '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>EN</button>
                    </div>
                </div>

                <div style={{ marginBottom: '24px', padding: '28px', backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #dbeafe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '12px' }}>
                            <FolderOpen style={{ width: '32px', height: '32px', color: '#3b82f6' }} />
                        </div>
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                            {locale === 'en' ? 'Documents' : 'เอกสาร'}: {examTitle}
                        </h1>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '16px', margin: '8px 0 0' }}>
                        {locale === 'en' ? 'All files uploaded by the instructor for this subject.' : 'เอกสารทั้งหมดที่อาจารย์อัปโหลดไว้สำหรับวิชานี้'}
                    </p>
                </div>

                <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <Search style={{ width: '16px', height: '16px', color: '#94a3b8', position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={locale === 'en' ? 'Search file name' : 'ค้นหาชื่อไฟล์'}
                        style={{ width: '100%', padding: '14px 16px 14px 40px', borderRadius: '16px', border: '1px solid #dbeafe', backgroundColor: 'white', color: '#0f172a', outline: 'none' }}
                    />
                </div>

                {filesError && (
                    <div style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', marginBottom: '24px' }}>
                        {locale === 'en' ? 'Unable to load files' : 'ไม่สามารถโหลดรายการไฟล์ได้'}
                    </div>
                )}

                {!filesData && !filesError && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px' }}>
                        <div style={{ width: '40px', height: '40px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {filesData && filteredFiles.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
                        {filteredFiles.map((file: any, index: number) => (
                            <a
                                key={`${file.name}-${index}`}
                                href={`/api/view/${id}/${file.path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '20px',
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '18px',
                                    textDecoration: 'none',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 6px 16px rgba(0,0,0,0.03)',
                                }}
                                onMouseOver={(event) => {
                                    event.currentTarget.style.transform = 'translateY(-4px)';
                                    event.currentTarget.style.borderColor = '#3b82f6';
                                }}
                                onMouseOut={(event) => {
                                    event.currentTarget.style.transform = 'translateY(0)';
                                    event.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                            >
                                <div style={{ padding: '10px', backgroundColor: '#eff6ff', borderRadius: '10px', marginRight: '16px' }}>
                                    <FileText style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                                        {file.name}
                                    </h4>
                                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{formatBytes(file.size)}</p>
                                </div>
                                <Download style={{ width: '20px', height: '20px', color: '#94a3b8', flexShrink: 0, marginLeft: '12px' }} />
                            </a>
                        ))}
                    </div>
                )}

                {filesData?.files?.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '100px 24px', backgroundColor: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                        <FolderOpen style={{ width: '64px', height: '64px', color: '#cbd5e1', marginBottom: '16px', margin: '0 auto' }} />
                        <p style={{ fontSize: '18px', color: '#64748b' }}>{locale === 'en' ? 'No files found' : 'ยังไม่มีไฟล์ในวิชานี้'}</p>
                    </div>
                )}

                {filesData?.files?.length > 0 && filteredFiles.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '100px 24px', backgroundColor: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                        <FileSearch style={{ width: '64px', height: '64px', color: '#cbd5e1', marginBottom: '16px', margin: '0 auto' }} />
                        <p style={{ fontSize: '18px', color: '#64748b' }}>{locale === 'en' ? 'No files match your search' : 'ไม่พบไฟล์ที่ตรงกับคำค้นหา'}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
