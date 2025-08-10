import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import { ThemeProvider } from './theme-provider';
import { LanguageProvider } from './language-provider';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/Toast';

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes'
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
              <ToastProvider>
                <Providers>{children}</Providers>
              </ToastProvider>
            </ThemeProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
