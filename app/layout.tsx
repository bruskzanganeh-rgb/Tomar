import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from '@/components/navigation/sidebar'
import { MobileHeader } from '@/components/navigation/mobile-header'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { SessionTracker } from '@/components/session-tracker'
import { createClient } from '@/lib/supabase/server'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Babalisk Manager",
  description: "Gig and invoice management for musicians",
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
              <div className="flex h-screen flex-col md:flex-row overflow-hidden">
                <MobileHeader />
                <Sidebar />
                <SessionTracker />
                <main className="flex-1 overflow-y-auto bg-background">
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
      </body>
    </html>
  );
}
