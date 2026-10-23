import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import CookieBanner from '@/components/common/CookieBanner';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'BEST Workspace',
    template: '%s · BEST Workspace',
  },
  description:
    'Ultimate Workspace & Creative Ecosystem — AI-powered todos, notes, boards, realtime chat, teams and billing.',
  applicationName: 'BEST Workspace',
  authors: [{ name: 'BEST' }],
  keywords: [
    'workspace',
    'productivity',
    'AI todos',
    'notes',
    'kanban',
    'chat',
    'teams',
    'BEST',
    'DOVYE',
  ],
  icons: { icon: '/favicon.ico' },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: 'BEST Workspace',
    title: 'BEST Workspace',
    description:
      'AI todos, notes, visual boards, realtime chat and team analytics in one premium workspace.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BEST Workspace',
    description: 'Ultimate Workspace & Creative Ecosystem',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7fb' },
    { media: '(prefers-color-scheme: dark)', color: '#07090f' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.variable}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <CookieBanner />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
