'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

type ModalProps = {
    open: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children?: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: number;
    theme?: 'dark' | 'light';
};

export default function Modal({
    open,
    onClose,
    title,
    children,
    footer,
    maxWidth = 440,
    theme = 'dark',
}: ModalProps) {
    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', onKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open) return null;

    const dark = theme === 'dark';

    return (
        <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                backgroundColor: 'rgba(2, 6, 23, 0.72)',
                backdropFilter: 'blur(4px)',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    backgroundColor: dark ? '#1e293b' : '#ffffff',
                    border: dark ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '28px',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
                    color: dark ? '#f1f5f9' : '#0f172a',
                }}
            >
                {title !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1.4 }}>{title}</div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            style={{ background: 'none', border: 'none', color: dark ? '#94a3b8' : '#64748b', cursor: 'pointer', padding: '4px', lineHeight: 0, flexShrink: 0 }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}
                <div>{children}</div>
                {footer && <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>{footer}</div>}
            </div>
        </div>
    );
}
