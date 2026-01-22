'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Settings, Clock, Users, ArrowRight, Layout, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HomePage() {

  const router = useRouter();

  useEffect(() => {
    router.push('/admin');
  }, []);

  return (
    <div style={{ minHeight: '100vh', padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Hero Section */}
      {/* <div style={{ textAlign: 'center', marginBottom: '60px', maxWidth: '800px' }}>
        <div style={{ display: 'inline-flex', padding: '12px', backgroundColor: '#dbeafe', borderRadius: '20px', marginBottom: '24px' }}>
          <ShieldCheck style={{ width: '48px', height: '48px', color: '#2563eb' }} />
        </div>
        <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#1e40af', marginBottom: '16px', letterSpacing: '-0.02em' }}>
          Exam Monitor & Resources
        </h1>
        <p style={{ fontSize: '20px', color: '#64748b', lineHeight: 1.6 }}>
          ระบบควบคุมเวลาสอบและกระจายเอกสารประกอบการสอบ <br />
          กรุณาเลือกห้องสอบหรือวิชาที่คุณต้องการเข้าถึง
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', width: '100%', maxWidth: '1100px' }}>
        {exams.map((exam: any) => (
          <div
            key={exam.id}
            style={{
              backgroundColor: 'rgba(255,255,255,0.9)',
              border: '2px solid #bfdbfe',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 10px 30px rgba(59,130,246,0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e40af', marginBottom: '24px' }}>{exam.title}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Link
                href={`/exam/${exam.id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '24px 16px',
                  backgroundColor: '#f8fafc',
                  border: '2px solid #e2e8f0',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  color: '#334155'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#a855f7'; e.currentTarget.style.backgroundColor = '#faf5ff'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
              >
                <div style={{ padding: '12px', backgroundColor: '#f3e8ff', borderRadius: '12px' }}>
                  <Users style={{ width: '32px', height: '32px', color: '#a855f7' }} />
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '18px' }}>สำหรับนักศึกษา</span>
              </Link>

              <Link
                href={`/time/${exam.id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '24px 16px',
                  backgroundColor: '#f8fafc',
                  border: '2px solid #e2e8f0',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  color: '#334155'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#fbbf24'; e.currentTarget.style.backgroundColor = '#fffbeb'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
              >
                <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '12px' }}>
                  <Clock style={{ width: '32px', height: '32px', color: '#fbbf24' }} />
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '18px' }}>สำหรับห้องสอบ</span>
              </Link>
            </div>
          </div>
        ))}

        {exams.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '24px', border: '2px dashed #bfdbfe' }}>
            <Layout style={{ width: '48px', height: '48px', color: '#94a3b8', marginBottom: '16px' }} />
            <p style={{ fontSize: '18px', color: '#64748b' }}>ยังไม่มีข้อมูลรอบการสอบ กรุณาแจ้งผู้ดูแลระบบ</p>
          </div>
        )}
      </div>

      <Link
        href="/admin"
        style={{
          marginTop: '60px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#64748b',
          textDecoration: 'none',
          fontWeight: '600',
          fontSize: '16px',
          padding: '12px 24px',
          borderRadius: '12px',
          backgroundColor: 'rgba(255,255,255,0.5)',
          border: '1px solid #e2e8f0'
        }}
      >
        <Settings style={{ width: '20px', height: '20px' }} />
        <span>สำหรับผู้ดูแลระบบ (Admin Dashboard)</span>
        <ArrowRight style={{ width: '16px', height: '16px' }} />
      </Link> 
      */}
    </div>
  );
}
