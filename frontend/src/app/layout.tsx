import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { AppShell } from '@/components/shell/app-shell';

export const metadata: Metadata = {
  title: 'Chitro — Conversations That Matter',
  description: 'A professional, mobile-first messaging application',
  keywords: ['messaging', 'chat', 'chitro', 'conversations'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-100 text-slate-900 min-h-screen flex justify-center selection:bg-blue-100 selection:text-blue-700 antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
