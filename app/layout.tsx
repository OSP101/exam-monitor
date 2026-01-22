import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/lib/LocaleContext";

const kanit = Kanit({
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  subsets: ['thai', 'latin'],
  variable: '--font-kanit'
});

export const metadata: Metadata = {
  title: "Exam Monitor",
  description: "Monitor for Exam Hall",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={kanit.variable} style={{ colorScheme: 'light' }}>
      <body
        className={`${kanit.className} antialiased min-h-screen`}
        style={{
          background: 'linear-gradient(to bottom right, #eff6ff, #eef2ff, #e0f2fe)',
          color: '#1e293b'
        }}
      >
        <LocaleProvider>
          <main className="relative w-full min-h-screen">
            {children}
          </main>
        </LocaleProvider>
      </body>
    </html>
  );
}
