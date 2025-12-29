import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from '@/components/navigation/sidebar'
import { MobileHeader } from '@/components/navigation/mobile-header'
import { Toaster } from '@/components/ui/sonner'

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex h-screen flex-col md:flex-row overflow-hidden">
          <MobileHeader />
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="container mx-auto p-4 md:p-8">
              {children}
            </div>
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
