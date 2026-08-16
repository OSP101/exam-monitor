export default function Footer({ dark = false }: { dark?: boolean }) {
    return (
        <footer style={{ textAlign: 'center', marginTop: '48px', padding: '16px 0 32px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: dark ? '#94a3b8' : '#64748b' }}>
                © {new Date().getFullYear()} College of Computing, Khon Kaen University
            </p>
            <p style={{ margin: 0, marginTop: '4px', fontSize: '12px', color: dark ? '#94a3b8' : '#64748b' }}>
                Developed by{' '}
                <a
                    href="https://osp101.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: dark ? '#60a5fa' : '#2563eb', textDecoration: 'underline' }}
                >
                    ITII Development Team
                </a>
            </p>
        </footer>
    );
}
