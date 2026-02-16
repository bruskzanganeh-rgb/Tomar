import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from '@/components/navigation/header'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { SessionTracker } from '@/components/session-tracker'
import { createClient } from '@/lib/supabase/server'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Amida",
  description: "Gig and invoice management for musicians",
  metadataBase: new URL('https://amida.babalisk.com'),
  openGraph: {
    title: 'Amida',
    description: 'Gig and invoice management for freelance musicians',
    url: 'https://amida.babalisk.com',
    siteName: 'Amida',
    locale: 'sv_SE',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Amida',
    description: 'Gig and invoice management for freelance musicians',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Amida',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            {user ? (
              <div className="flex min-h-screen flex-col">
                <Header />
                <SessionTracker />
                <main className="flex-1 bg-background overflow-x-hidden">
                  <div className="container mx-auto p-4 md:p-8">
                    {children}
                  </div>
                </main>
              </div>
            ) : (
              children
            )}
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
