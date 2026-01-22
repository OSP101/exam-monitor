'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Download, AlertTriangle, FolderOpen } from 'lucide-react';
import useSWR from 'swr';
import { use } from 'react';

import { useLocale } from '@/lib/LocaleContext';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SubjectResourcesPage({ params }: { params: Promise<{ subject: string }> }) {
    const { locale, setLocale, t } = useLocale();
    const router = useRouter();
    const { subject } = use(params);

    const [authorized, setAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isAuth = sessionStorage.getItem(`access_${subject}`);
            if (!isAuth) {
                router.replace('/resources');
            } else {
                setAuthorized(true);
            }
            setChecking(false);
        }
    }, [subject, router]);

    const { data: filesData, error } = useSWR(authorized ? `/api/files?folder=${subject}` : null, fetcher);

    if (checking) return null;
    if (!authorized) return null;

    return (
        <div style={{ minHeight: '100vh', padding: '32px', backgroundColor: '#f8fafc' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <Link href="/resources" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
                        <ArrowLeft style={{ width: '20px', height: '20px' }} />
                        {t('back_to_subjects')}
                    </Link>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setLocale('th')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: locale === 'th' ? '#3b82f6' : 'white', color: locale === 'th' ? 'white' : '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>TH</button>
                        <button onClick={() => setLocale('en')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: locale === 'en' ? '#3b82f6' : 'white', color: locale === 'en' ? 'white' : '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>EN</button>
                    </div>
                </div>

                {/* Header Info */}
                <div style={{ marginBottom: '32px', padding: '32px', backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '12px' }}>
                            <FolderOpen style={{ width: '32px', height: '32px', color: '#3b82f6' }} />
                        </div>
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{t('documents')}: {subject}</h1>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '16px', margin: '8px 0 0' }}>{t('file_list_in_folder')}</p>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <AlertTriangle style={{ width: '24px', height: '24px' }} />
                        <span>{t('error_loading_files')}</span>
                    </div>
                )}

                {/* Loading */}
                {!filesData && !error && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px' }}>
                        <div style={{ width: '40px', height: '40px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {/* File Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                    {filesData?.files?.map((file: any, index: number) => (
                        <a
                            key={index}
                            href={`/api/view/${subject}/${file.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '20px',
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '16px',
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(59,130,246,0.1)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}
                        >
                            <div style={{ padding: '10px', backgroundColor: '#eff6ff', borderRadius: '10px', marginRight: '16px' }}>
                                <FileText style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                                    {file.name}
                                </h4>
                                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                            <Download style={{ width: '20px', height: '20px', color: '#94a3b8', flexShrink: 0, marginLeft: '12px' }} />
                        </a>
                    ))}
                </div>

                {/* Special Link for JavaWeb_Resource */}
                {subject === 'JavaWeb_Resource' && (
                    <div style={{ marginTop: '32px' }}>
                        <a
                            href={`http://10.199.10.10`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '24px',
                                backgroundColor: '#fdf4ff',
                                border: '2px dashed #e9d5ff',
                                borderRadius: '20px',
                                textDecoration: 'none',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#d8b4fe'; e.currentTarget.style.backgroundColor = '#f5e6ff'; }}
                            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e9d5ff'; e.currentTarget.style.backgroundColor = '#fdf4ff'; }}
                        >
                            <div style={{ padding: '12px', backgroundColor: '#f5e6ff', borderRadius: '12px', marginRight: '20px' }}>
                                <FileText style={{ width: '32px', height: '32px', color: '#a855f7' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: '#7e22ce', marginBottom: '4px' }}>
                                    Username and Password Database
                                </h4>
                                <p style={{ fontSize: '15px', color: '#9333ea', margin: 0 }}>
                                    {locale === 'en' ? 'Database credentials for the exam' : 'ข้อมูลผู้ใช้และรหัสผ่านสำหรับฐานข้อมูลที่ต้องใช้'}
                                </p>
                            </div>
                            <Download style={{ width: '24px', height: '24px', color: '#d8b4fe' }} />
                        </a>
                    </div>
                )}

                {/* Empty State */}
                {filesData?.files?.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '100px 24px', backgroundColor: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                        <FolderOpen style={{ width: '64px', height: '64px', color: '#cbd5e1', marginBottom: '16px', margin: '0 auto' }} />
                        <p style={{ fontSize: '18px', color: '#64748b' }}>{t('no_files_found')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
