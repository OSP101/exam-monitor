'use client';

import { useDeferredValue, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import {
    Download,
    Eye,
    FileText,
    RefreshCw,
    Search,
    Trash2,
    UploadCloud,
} from 'lucide-react';
import { useLocale } from '@/lib/LocaleContext';

type FileRecord = {
    name: string;
    fullPath: string;
    size: number;
    mimeType?: string;
    isPublished: boolean;
    publishedAt?: string | null;
    lastUploadedAt?: string | null;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const buildViewHref = (fullPath: string, adminPin?: string) => {
    const encoded = fullPath.split('/').map(encodeURIComponent).join('/');
    const pinQuery = adminPin ? `?adminPin=${encodeURIComponent(adminPin)}` : '';
    return `/api/view/${encoded}${pinQuery}`;
};

const buildDownloadHref = (fullPath: string, adminPin?: string) => {
    const params = new URLSearchParams({ path: fullPath });
    if (adminPin) params.set('adminPin', adminPin);
    return `/api/files/download?${params.toString()}`;
};

const canPreview = (mimeType?: string) => {
    if (!mimeType) return false;
    return mimeType.includes('pdf') || mimeType.startsWith('image/') || mimeType.startsWith('text/');
};

export default function ExamFilesManager({
    examId,
    adminPin,
}: {
    examId: string;
    adminPin: string;
}) {
    const { locale } = useLocale();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);
    const [uploadMessage, setUploadMessage] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const filesUrl = adminPin
        ? `/api/files?folder=${encodeURIComponent(examId)}&includeUnpublished=1&adminPin=${encodeURIComponent(adminPin)}`
        : null;
    const { data, mutate, isLoading } = useSWR(filesUrl, fetcher);

    const files = ((data?.files || []) as FileRecord[]).filter((file) => file.isPublished);
    const filteredFiles = useMemo(() => {
        const query = deferredSearch.trim().toLowerCase();
        return files.filter((file) => !query || file.name.toLowerCase().includes(query));
    }, [deferredSearch, files]);

    const selectedRecord = filteredFiles.find((file) => file.fullPath === selectedFile) || filteredFiles[0] || null;

    const uploadSingleFile = (file: File, index: number, total: number) => new Promise<void>((resolve, reject) => {
        const formData = new FormData();
        formData.append('folder', examId);
        formData.append('adminPin', adminPin);
        formData.append('publishNow', 'true');
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/files');
        xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            const fileProgress = event.loaded / event.total;
            const overallProgress = ((index + fileProgress) / total) * 100;
            setUploadProgress(Math.round(overallProgress));
            setUploadMessage(
                locale === 'en'
                    ? `Uploading ${index + 1}/${total}: ${file.name}`
                    : `กำลังอัปโหลด ${index + 1}/${total}: ${file.name}`
            );
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
                return;
            }

            try {
                const data = JSON.parse(xhr.responseText);
                reject(new Error(data.error || 'Upload failed'));
            } catch {
                reject(new Error('Upload failed'));
            }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
    });

    const uploadFiles = async (incomingFiles: File[]) => {
        if (!adminPin) {
            setUploadMessage(locale === 'en' ? 'Admin PIN is required.' : 'ต้องมี Admin PIN ก่อน');
            return;
        }
        if (incomingFiles.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);
        const failures: string[] = [];

        for (let index = 0; index < incomingFiles.length; index += 1) {
            try {
                await uploadSingleFile(incomingFiles[index], index, incomingFiles.length);
            } catch (error) {
                failures.push(`${incomingFiles[index].name}: ${(error as Error).message}`);
            }
        }

        setIsUploading(false);
        setUploadProgress(100);
        setUploadMessage(
            failures.length === 0
                ? (locale === 'en'
                    ? `Uploaded and shared ${incomingFiles.length} file(s).`
                    : `อัปโหลดและแชร์เอกสารสำเร็จ ${incomingFiles.length} ไฟล์`)
                : failures.join(' | ')
        );
        mutate();
    };

    const handleDelete = async (file: FileRecord) => {
        const confirmed = window.confirm(
            locale === 'en'
                ? `Delete ${file.name}?`
                : `ลบไฟล์ ${file.name} ใช่หรือไม่`
        );
        if (!confirmed) return;

        const res = await fetch('/api/files', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: file.fullPath, adminPin }),
        });
        if (!res.ok) {
            const payload = await res.json().catch(() => null);
            setUploadMessage(payload?.error || (locale === 'en' ? 'Delete failed.' : 'ลบไฟล์ไม่สำเร็จ'));
            return;
        }
        setUploadMessage(locale === 'en' ? `Deleted ${file.name}` : `ลบ ${file.name} แล้ว`);
        mutate();
    };

    return (
        <div style={{ padding: '24px', backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', marginBottom: '100px' }}>
            <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <FileText style={{ width: '18px', height: '18px', color: '#a855f7' }} />
                    {locale === 'en' ? 'Upload Exam Documents' : 'อัปโหลดเอกสารสอบ'}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '8px', marginBottom: 0 }}>
                    {locale === 'en'
                        ? 'Upload files here and students can access them immediately.'
                        : 'อัปโหลดไฟล์จากส่วนนี้ แล้วผู้สอบจะเห็นเอกสารได้ทันที'}
                </p>
            </div>

            <div
                onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    uploadFiles(Array.from(event.dataTransfer.files || []));
                }}
                style={{
                    padding: '22px',
                    borderRadius: '16px',
                    border: `2px dashed ${isDragging ? '#60a5fa' : '#334155'}`,
                    backgroundColor: isDragging ? 'rgba(59,130,246,0.12)' : '#0f172a',
                    marginBottom: '18px',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: 'rgba(96,165,250,0.14)' }}>
                            <UploadCloud style={{ width: '24px', height: '24px', color: '#60a5fa' }} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                                {locale === 'en' ? 'Drag files here or choose files' : 'ลากไฟล์มาวาง หรือกดเลือกไฟล์'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                                {locale === 'en'
                                    ? 'Every upload is shared immediately.'
                                    : 'ทุกไฟล์ที่อัปโหลดจากตรงนี้จะถูกแชร์ทันที'}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={isUploading}
                        style={{
                            padding: '10px 14px',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 600,
                            cursor: isUploading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {locale === 'en' ? 'Choose Files' : 'เลือกไฟล์'}
                    </button>
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(event) => {
                            const incomingFiles = Array.from(event.target.files || []);
                            uploadFiles(incomingFiles);
                            event.currentTarget.value = '';
                        }}
                    />
                </div>

                <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '220px', height: '10px', borderRadius: '999px', backgroundColor: '#111827', overflow: 'hidden' }}>
                        <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #60a5fa, #34d399)' }} />
                    </div>
                    <div style={{ fontSize: '13px', color: '#cbd5e1', minWidth: '180px' }}>
                        {isUploading ? `${uploadProgress}%` : uploadMessage}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                    <Search style={{ width: '16px', height: '16px', color: '#64748b', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={locale === 'en' ? 'Search files...' : 'ค้นหาไฟล์...'}
                        style={{ width: '100%', padding: '10px 14px 10px 36px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: 'white' }}
                    />
                </div>

                <button
                    type="button"
                    onClick={() => mutate()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: '#cbd5e1', cursor: 'pointer' }}
                >
                    <RefreshCw style={{ width: '16px', height: '16px' }} />
                    {locale === 'en' ? 'Refresh' : 'รีเฟรช'}
                </button>
            </div>

            <div >
                <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #334155', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) 120px 180px', padding: '12px 16px', color: '#94a3b8', fontSize: '12px', borderBottom: '1px solid #334155' }}>
                        <div>{locale === 'en' ? 'File' : 'ไฟล์'}</div>
                        <div>{locale === 'en' ? 'Size' : 'ขนาด'}</div>
                        <div>{locale === 'en' ? 'Actions' : 'การจัดการ'}</div>
                    </div>

                    {isLoading && (
                        <div style={{ padding: '20px 16px', color: '#94a3b8' }}>
                            {locale === 'en' ? 'Loading files...' : 'กำลังโหลดรายการไฟล์...'}
                        </div>
                    )}

                    {!isLoading && filteredFiles.length === 0 && (
                        <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8' }}>
                            {locale === 'en' ? 'No uploaded files yet.' : 'ยังไม่มีไฟล์ที่อัปโหลด'}
                        </div>
                    )}

                    {!isLoading && filteredFiles.map((file) => (
                        <div key={file.fullPath} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) 120px 180px', padding: '14px 16px', borderBottom: '1px solid #172033', alignItems: 'center', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => setSelectedFile(file.fullPath)}
                                style={{ background: 'none', border: 'none', color: 'inherit', textAlign: 'left', cursor: 'pointer', minWidth: 0 }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                                        <FileText style={{ width: '18px', height: '18px' }} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{file.name}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                            {locale === 'en' ? 'Shared immediately' : 'แชร์ให้ผู้สอบแล้วทันที'}
                                        </div>
                                    </div>
                                </div>
                            </button>

                            <div style={{ color: '#cbd5e1' }}>{formatBytes(file.size)}</div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button type="button" onClick={() => setSelectedFile(file.fullPath)} style={{ padding: '8px', backgroundColor: '#111827', border: '1px solid #334155', borderRadius: '8px', color: '#cbd5e1', cursor: 'pointer' }}>
                                    <Eye style={{ width: '15px', height: '15px' }} />
                                </button>
                                <a href={buildDownloadHref(file.fullPath, adminPin)} target="_blank" rel="noreferrer" style={{ padding: '8px', backgroundColor: '#111827', border: '1px solid #334155', borderRadius: '8px', color: '#cbd5e1' }}>
                                    <Download style={{ width: '15px', height: '15px' }} />
                                </a>
                                <button type="button" onClick={() => handleDelete(file)} style={{ padding: '8px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid transparent', borderRadius: '8px', color: '#f87171', cursor: 'pointer' }}>
                                    <Trash2 style={{ width: '15px', height: '15px' }} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* {selectedRecord && (
                    <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #334155', overflow: 'hidden' }}>
                        <div style={{ padding: '16px', borderBottom: '1px solid #334155' }}>
                            <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>{selectedRecord.name}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                {locale === 'en' ? 'Students can open this file now.' : 'ผู้สอบสามารถเปิดไฟล์นี้ได้แล้ว'}
                            </div>
                        </div>

                        {canPreview(selectedRecord.mimeType) ? (
                            <iframe
                                title={selectedRecord.name}
                                src={buildViewHref(selectedRecord.fullPath, adminPin)}
                                style={{ width: '100%', minHeight: '520px', border: 'none', backgroundColor: 'white' }}
                            />
                        ) : (
                            <div style={{ padding: '30px 20px', color: '#94a3b8', textAlign: 'center' }}>
                                {locale === 'en'
                                    ? 'Preview is not available for this file type. Use download instead.'
                                    : 'ไฟล์ประเภทนี้ยังไม่รองรับการพรีวิว กรุณาดาวน์โหลดแทน'}
                            </div>
                        )}
                    </div>
                )} */}
            </div>
        </div>
    );
}
