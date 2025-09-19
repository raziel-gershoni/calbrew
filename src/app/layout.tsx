import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import { ThemeProvider } from './theme-provider';
import { LanguageProvider } from './language-provider';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/Toast';
import { Analytics } from '@vercel/analytics/next';
import HebcalLocalesProvider from '@/components/HebcalLocalesProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Calbrew - Hebrew Calendar Event Manager',
  description:
    'Manage your Hebrew calendar events with Google Calendar integration',
  keywords: [
    'Hebrew calendar',
    'Jewish calendar',
    'events',
    'calendar management',
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CalBrew',
  },
  icons: {
    icon: [
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/icon-192x192.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta name='apple-mobile-web-app-status-bar-style' content='default' />
        <meta name='apple-mobile-web-app-title' content='CalBrew' />
        <meta name='mobile-web-app-capable' content='yes' />
        <meta name='msapplication-TileColor' content='#3b82f6' />
        <meta name='msapplication-tap-highlight' content='no' />
        <link rel='apple-touch-icon' href='/icons/icon-192x192.png' />
        <link
          rel='icon'
          type='image/png'
          sizes='96x96'
          href='/favicon-96x96.png'
        />
        <link
          rel='icon'
          type='image/png'
          sizes='192x192'
          href='/favicon-192x192.png'
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <LanguageProvider>
            <ThemeProvider
              attribute='class'
              defaultTheme='system'
              enableSystem
              disableTransitionOnChange
            >
              <HebcalLocalesProvider>
                <ToastProvider>
                  <Providers>{children}</Providers>
                </ToastProvider>
              </HebcalLocalesProvider>
            </ThemeProvider>
          </LanguageProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
