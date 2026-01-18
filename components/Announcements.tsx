'use client';

import { Megaphone } from 'lucide-react';

interface AnnouncementsProps {
    items: string[];
}

export default function Announcements({ items }: AnnouncementsProps) {
    if (!items || items.length === 0) return null;

    return (
        <div style={{
            width: '100%',
            backgroundColor: 'rgba(255,255,255,0.7)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #dbeafe',
            boxShadow: '0 4px 20px rgba(59,130,246,0.1)'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid #e0e7ff'
            }}>
                <div style={{
                    padding: '8px',
                    borderRadius: '8px',
                    backgroundColor: '#fef3c7',
                    color: '#d97706'
                }}>
                    <Megaphone style={{ width: '24px', height: '24px' }} />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#334155', margin: 0 }}>ประกาศสำคัญ</h2>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map((item, index) => (
                    <div
                        key={index}
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            fontSize: '18px',
                            color: '#334155'
                        }}
                    >
                        <span style={{
                            flexShrink: 0,
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '14px'
                        }}>
                            {index + 1}
                        </span>
                        <p style={{ margin: 0, lineHeight: 1.5 }}>{item}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
