import Link from 'next/link';

export default function NotFound() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            textAlign: 'center'
        }}>
            <div style={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                padding: '48px',
                borderRadius: '24px',
                border: '2px solid #bfdbfe',
                boxShadow: '0 20px 50px rgba(59,130,246,0.15)',
                maxWidth: '500px'
            }}>
                {/* 404 Number */}
                <h1 style={{
                    fontSize: '120px',
                    fontWeight: '900',
                    color: '#3b82f6',
                    lineHeight: 1,
                    margin: 0,
                    marginBottom: '16px',
                    textShadow: '0 4px 20px rgba(59,130,246,0.3)'
                }}>
                    404
                </h1>

                {/* Message */}
                <h2 style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#1e40af',
                    marginBottom: '16px'
                }}>
                    ไม่พบหน้าที่ต้องการ
                </h2>

                <p style={{
                    fontSize: '18px',
                    color: '#64748b',
                    marginBottom: '32px',
                    lineHeight: 1.6
                }}>
                    หน้าที่คุณกำลังค้นหาอาจถูกย้าย ลบ หรือไม่มีอยู่
                </p>

                {/* Back Button */}
                <Link
                    href="/"
                    style={{
                        display: 'inline-block',
                        padding: '16px 32px',
                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        boxShadow: '0 8px 25px rgba(59,130,246,0.3)'
                    }}
                >
                    กลับหน้าหลัก
                </Link>
            </div>
        </div>
    );
}
