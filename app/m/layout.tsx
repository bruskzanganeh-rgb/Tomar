import { BottomNav } from '@/components/mobile/bottom-nav'

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-4 pt-4">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
