'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, FileSearch, FileText, FolderOpen, Search } from 'lucide-react';
import useSWR from 'swr';
import { use } from 'react';
import { useLocale } from '@/lib/LocaleContext';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function SubjectResourcesPage({ params }: { params: Promise<{ subject: string }> }) {
    const { locale, setLocale } = useLocale();
    const router = useRouter();
    const searchParams = useSearchParams();
    const examId = searchParams.get('exam') || '';
    const { subject } = use(params);

    const [authorized, setAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const newKey = examId ? `access_${examId}_${subject}` : null;
            const legacyKey = `access_${subject}`;
            const isAuth = (newKey && sessionStorage.getItem(newKey)) || sessionStorage.getItem(legacyKey);

            if (!isAuth) {
                router.replace(examId ? `/resources/exam/${examId}` : '/resources');
            } else {
                setAuthorized(true);
            }
            setChecking(false);
        }
    }, [examId, subject, router]);

    const { data: filesData, error } = useSWR(authorized ? `/api/files?folder=${subject}` : null, fetcher);

    const filteredFiles = useMemo(() => {
        const files = filesData?.files || [];
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return files;
        return files.filter((file: any) => file.name.toLowerCase().includes(normalizedQuery));
    }, [filesData?.files, query]);

    if (checking) return null;
    if (!authorized) return null;

    return (
        <div style={{ minHeight: '100vh', padding: '32px', background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '12px', flexWrap: 'wrap' }}>
                    <Link href={examId ? `/resources/exam/${examId}` : '/resources'} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
                        <ArrowLeft style={{ width: '20px', height: '20px' }} />
                        {locale === 'en' ? 'Back to document subjects' : 'กลับไปหน้าวิชาเอกสาร'}
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
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{locale === 'en' ? 'Documents' : 'เอกสาร'}: {subject}</h1>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '16px', margin: '8px 0 0' }}>
                        {locale === 'en'
                            ? 'All shared files in this subject.'
                            : 'รายการเอกสารที่แชร์สำหรับวิชานี้'}
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

                {error && (
                    <div style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', marginBottom: '24px' }}>
                        {locale === 'en' ? 'Unable to load files' : 'ไม่สามารถโหลดรายการไฟล์ได้'}
                    </div>
                )}

                {!filesData && !error && (
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
                                href={`/api/view/${subject}/${file.path}`}
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
                                    boxShadow: '0 6px 16px rgba(0,0,0,0.03)'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                            >
                                <div style={{ padding: '10px', backgroundColor: '#eff6ff', borderRadius: '10px', marginRight: '16px' }}>
                                    <FileText style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                                        {file.name}
                                    </h4>
                                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                                        {formatBytes(file.size)}
                                    </p>
                                </div>
                                <Download style={{ width: '20px', height: '20px', color: '#94a3b8', flexShrink: 0, marginLeft: '12px' }} />
                            </a>
                        ))}
                    </div>
                )}

                {filesData?.files?.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '100px 24px', backgroundColor: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                        <FolderOpen style={{ width: '64px', height: '64px', color: '#cbd5e1', marginBottom: '16px', margin: '0 auto' }} />
                        <p style={{ fontSize: '18px', color: '#64748b' }}>{locale === 'en' ? 'No files found' : 'ไม่พบไฟล์ในวิชานี้'}</p>
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
