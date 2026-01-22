'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Download, AlertTriangle, FolderOpen } from 'lucide-react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ExamUnifiedResourcesPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [authorized, setAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isAuth = sessionStorage.getItem(`access_exam_${id}`);
            if (!isAuth) {
                router.replace(`/exam/${id}`);
            } else {
                setAuthorized(true);
            }
            setChecking(false);
        }
    }, [id, router]);

    const { data: filesData, error } = useSWR(authorized ? `/api/files?folder=${id}` : null, fetcher);

    if (checking) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
    );

    if (!authorized) return null;

    return (
        <div style={{ minHeight: '100vh', padding: '32px', backgroundColor: '#f8fafc' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Back Button */}
                <Link href={`/exam/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none', marginBottom: '24px', fontWeight: '500' }}>
                    <ArrowLeft style={{ width: '20px', height: '20px' }} />
                    ย้อนกลับไปหน้ารายวิชา
                </Link>

                {/* Header */}
                <div style={{ marginBottom: '32px', padding: '24px', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ padding: '12px', backgroundColor: '#fef9c3', borderRadius: '12px' }}>
                            <FolderOpen style={{ width: '32px', height: '32px', color: '#ca8a04' }} />
                        </div>
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e40af', margin: 0 }}>เอกสารประกอบการสอบทั้งหมด</h1>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '16px', margin: '8px 0 0' }}>รวมไฟล์ที่แชร์สำหรับการสอบนี้ทั้งหมด</p>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ padding: '24px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '2px solid #fecaca', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <AlertTriangle style={{ width: '24px', height: '24px' }} />
                        <span>ไม่สามารถโหลดรายชื่อไฟล์ได้ กรุณาลองใหม่อีกครั้ง</span>
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
                            href={`/api/view/${encodeURIComponent(id + '/' + file.path)}`}
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
                                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                            <Download style={{ width: '20px', height: '20px', color: '#94a3b8', flexShrink: 0, marginLeft: '12px' }} />
                        </a>
                    ))}
                </div>

                {/* Empty State */}
                {filesData && filesData.files && filesData.files.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '100px 24px', backgroundColor: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                        <FolderOpen style={{ width: '64px', height: '64px', color: '#cbd5e1', marginBottom: '16px', margin: '0 auto' }} />
                        <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>ยยังไม่มีไฟล์เอกสาร</h3>
                        <p style={{ color: '#94a3b8' }}>ยังไม่มีการอัปโหลดเอกสารสำหรับการสอบนี้</p>
                    </div>
                )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
