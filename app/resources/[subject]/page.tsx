'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Download, AlertTriangle, FolderOpen } from 'lucide-react';
import useSWR from 'swr';
import { use } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SubjectResourcesPage({ params }: { params: Promise<{ subject: string }> }) {
    const router = useRouter();
    const { subject } = use(params);

    const [authorized, setAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isAuth = sessionStorage.getItem(`access_${subject}`);
            if (!isAuth) {
                router.replace('/');
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
        <div style={{ minHeight: '100vh', padding: '32px' }}>
            <div style={{ maxWidth: '1500px', margin: '0 auto' }}>
                {/* Back Button */}
                <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none', marginBottom: '24px', fontWeight: '500' }}>
                    <ArrowLeft style={{ width: '20px', height: '20px' }} />
                    เลือกวิชาอื่น
                </Link>

                {/* Header */}
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '12px' }}>
                            <FolderOpen style={{ width: '32px', height: '32px', color: '#2563eb' }} />
                        </div>
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e40af', margin: 0 }}>เอกสาร: {subject}</h1>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '16px' }}>รายการไฟล์ทั้งหมดในโฟลเดอร์นี้</p>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ padding: '24px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '2px solid #fecaca', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertTriangle style={{ width: '24px', height: '24px' }} />
                        <span>ไม่สามารถโหลดรายชื่อไฟล์ได้ หรือโฟลเดอร์ไม่ถูกต้อง</span>
                    </div>
                )}

                {/* Loading */}
                {!filesData && !error && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
                        <div style={{ width: '40px', height: '40px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {/* File Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
                    {filesData?.files?.map((file: any, index: number) => (
                        <a
                            key={index}
                            href={`/api/view/${subject}/${file.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                padding: '20px',
                                backgroundColor: 'rgba(255,255,255,0.9)',
                                border: '2px solid #bfdbfe',
                                borderRadius: '12px',
                                textDecoration: 'none',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(59,130,246,0.2)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '10px', marginRight: '16px' }}>
                                <FileText style={{ width: '24px', height: '24px', color: '#2563eb' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1e40af', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                                    {file.name}
                                </h4>
                                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                            <Download style={{ width: '20px', height: '20px', color: '#94a3b8', flexShrink: 0 }} />
                        </a>
                    ))}


                </div>
                <div style={{ marginTop: '50px' }}>
                    <Link
                            href={`http://10.199.10.10`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                padding: '20px',
                                backgroundColor: 'rgba(255,255,255,0.9)',
                                border: '2px solid #bfdbfe',
                                borderRadius: '12px',
                                textDecoration: 'none',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(59,130,246,0.2)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '10px', marginRight: '16px' }}>
                                <FileText style={{ width: '24px', height: '24px', color: '#2563eb' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1e40af', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={"เอกสารประกอบการสอบ"}>
                                    Username and Password Database
                                </h4>
                                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                                    ข้อมูลผู้ใช้และรหัสผ่านสำหรับฐานข้อมูลที่ต้องใช้
                                </p>
                            </div>
                            </Link>

                        </div>

                {/* Empty State */}
                {filesData?.files?.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                        <FolderOpen style={{ width: '48px', height: '48px', marginBottom: '16px', opacity: 0.5 }} />
                        <p style={{ fontSize: '18px' }}>ไม่พบไฟล์ในโฟลเดอร์นี้</p>
                    </div>
                )}
            </div>
        </div>
    );
}
