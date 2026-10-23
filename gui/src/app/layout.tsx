import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import CookieBanner from '@/components/common/CookieBanner';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'BEST Workspace',
  description:
    'Ultimate Workspace & Creative Ecosystem — AI todos, notes, boards, chat, teams.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <AuthProvider>
          {children}
          <CookieBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
