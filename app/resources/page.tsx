'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FolderLock, ArrowLeft } from 'lucide-react';
import useSWR from 'swr';

import { useLocale } from '@/lib/LocaleContext';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ResourcesPage() {
    const { locale, setLocale, t } = useLocale();
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
            setErrorMsg(t('incorrect_subject_pin'));
            setPin('');
        }
    };

    if (error) return <div style={{ padding: '32px', color: '#dc2626' }}>{t('no_exam_data')}</div>;
    if (!config) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '48px', height: '48px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', padding: '32px', backgroundColor: '#f8fafc' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
                        <ArrowLeft style={{ width: '20px', height: '20px' }} />
                        {t('back_home')}
                    </Link>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setLocale('th')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: locale === 'th' ? '#3b82f6' : 'white', color: locale === 'th' ? 'white' : '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>TH</button>
                        <button onClick={() => setLocale('en')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: locale === 'en' ? '#3b82f6' : 'white', color: locale === 'en' ? 'white' : '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>EN</button>
                    </div>
                </div>

                {/* Info Header */}
                <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#1e40af', marginBottom: '12px' }}>
                        {locale === 'en' && config.title_en ? config.title_en : config.examTitle}
                    </h1>
                    <p style={{ fontSize: '18px', color: '#64748b' }}>{t('select_subject_docs')}</p>
                </div>

                {/* Subject Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                    {config.subjects?.map((subject: any) => (
                        <button
                            key={subject.id}
                            onClick={() => handleSubjectClick(subject)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '32px 24px',
                                backgroundColor: 'white',
                                border: '2px solid #e2e8f0',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                textAlign: 'center',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                                transition: 'all 0.2s',
                                outline: 'none'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(59,130,246,0.1)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)'; }}
                        >
                            <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '16px', marginBottom: '16px' }}>
                                <FolderLock style={{ width: '40px', height: '40px', color: '#3b82f6' }} />
                            </div>
                            <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>{subject.name}</h3>
                            <p style={{ fontSize: '14px', color: '#94a3b8' }}>{t('click_to_enter_pin')}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* PIN Modal */}
            {selectedSubject && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(4px)',
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
                        borderRadius: '24px',
                        padding: '32px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                    }}>
                        <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>{t('enter_subject_pin')}</h3>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>{t('subject_label')} {selectedSubject.name}</p>

                        <form onSubmit={handlePinSubmit}>
                            <input
                                type="password"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                placeholder="PIN"
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '16px',
                                    textAlign: 'center',
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: '#1e40af',
                                    marginBottom: '16px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                autoFocus
                            />
                            {errorMsg && <p style={{ color: '#ef4444', textAlign: 'center', marginBottom: '16px', fontWeight: '500' }}>{errorMsg}</p>}

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSubject(null)}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        backgroundColor: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        color: '#64748b',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    {t('confirm')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
