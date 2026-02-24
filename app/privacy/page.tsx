import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Integritetspolicy',
  description: 'Integritetspolicy för Amida, en tjänst av Babalisk AB.',
  alternates: { canonical: 'https://amida.babalisk.com/privacy' },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0B1E3A]">
      <header className="border-b border-[#1a3a5c] bg-[#0B1E3A]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Amida" width={32} height={32} />
            <span className="text-lg font-semibold tracking-tight text-white">Amida</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Integritetspolicy</h1>
        <p className="text-sm text-[#C7D2FE]/50 mb-10">Senast uppdaterad: 23 februari 2026</p>

        <div className="prose prose-invert prose-sm max-w-none text-[#C7D2FE]/80 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Personuppgiftsansvarig</h2>
            <p>
              Babalisk AB ansvarar for behandlingen av dina personuppgifter i samband med
              tjänsten Amida (amida.babalisk.com). Kontakta oss vid frågor:
            </p>
            <p>E-post: <a href="mailto:support@babalisk.com" className="text-[#F59E0B] hover:underline">support@babalisk.com</a></p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Vilka uppgifter vi samlar in</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-white">Kontouppgifter</strong> — e-postadress och lösenord (krypterat) vid registrering.</li>
              <li><strong className="text-white">Företagsinformation</strong> — företagsnamn, organisationsnummer, adress, bankuppgifter som du anger i inställningarna.</li>
              <li><strong className="text-white">Uppdrag och fakturor</strong> — datum, arvoden, klientnamn, fakturadata som du skapar i tjänsten.</li>
              <li><strong className="text-white">Kvitton och bilagor</strong> — bilder du laddar upp for kvittoskanning eller som bilagor till uppdrag.</li>
              <li><strong className="text-white">Betalningsuppgifter</strong> — hanteras av Stripe. Vi lagrar inte kortnummer.</li>
              <li><strong className="text-white">Teknisk data</strong> — IP-adress, webbläsartyp och enhetsinformation for säkerhet och prestanda.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Varfor vi behandlar dina uppgifter</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Leverera och förbättra tjänsten (avtalsgrund).</li>
              <li>Hantera ditt konto och prenumeration.</li>
              <li>Skicka fakturor och påminnelser via e-post på din begäran.</li>
              <li>AI-bearbetning av kvitton for att extrahera belopp och leverantör.</li>
              <li>Förhindra missbruk och upprätthålla säkerhet (berättigat intresse).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Tredjeparter</h2>
            <p>Vi delar uppgifter med följande tjänster, alla med adekvata skyddsåtgärder:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-white">Supabase</strong> (EU) — databas och autentisering.</li>
              <li><strong className="text-white">Stripe</strong> (USA, EU SCC) — betalningshantering.</li>
              <li><strong className="text-white">Resend</strong> (USA, EU SCC) — e-postutskick av fakturor.</li>
              <li><strong className="text-white">Anthropic</strong> (USA, EU SCC) — AI-analys av kvitton. Bilddata används inte for modellträning.</li>
              <li><strong className="text-white">Vercel</strong> (USA, EU SCC) — hosting och CDN.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Lagring och radering</h2>
            <p>
              Dina uppgifter lagras så länge du har ett aktivt konto. Om du raderar ditt konto
              tar vi bort alla personuppgifter inom 30 dagar, med undantag for data vi är
              skyldiga att behålla enligt bokföringslagen (7 år for fakturadata).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Dina rättigheter (GDPR)</h2>
            <p>Du har rätt att:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-white">Få tillgång</strong> till dina personuppgifter.</li>
              <li><strong className="text-white">Rätta</strong> felaktiga uppgifter.</li>
              <li><strong className="text-white">Radera</strong> dina uppgifter ("rätten att bli glömd").</li>
              <li><strong className="text-white">Exportera</strong> dina uppgifter i ett maskinläsbart format.</li>
              <li><strong className="text-white">Invända</strong> mot behandling baserad på berättigat intresse.</li>
              <li><strong className="text-white">Lämna klagomål</strong> till Integritetsskyddsmyndigheten (IMY).</li>
            </ul>
            <p>Kontakta <a href="mailto:support@babalisk.com" className="text-[#F59E0B] hover:underline">support@babalisk.com</a> for att utöva dina rättigheter.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Cookies</h2>
            <p>
              Amida använder enbart nödvändiga cookies for autentisering (Supabase session-cookies)
              och språkval. Vi använder inga spårningscookies eller tredjepartscookies for reklam.
              Vercel Analytics samlar in anonymiserad prestandadata utan cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Ändringar</h2>
            <p>
              Vi kan uppdatera denna policy. Väsentliga ändringar meddelas via e-post eller
              i tjänsten. Fortsatt användning efter ändringar innebär att du godkänner den
              uppdaterade policyn.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-[#1a3a5c] py-8">
        <div className="mx-auto max-w-3xl px-6 flex items-center justify-between text-sm text-[#C7D2FE]/50">
          <Link href="/" className="flex items-center gap-2 hover:text-[#C7D2FE]">
            <Image src="/logo.png" alt="Amida" width={24} height={24} />
            <span>Amida</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-[#C7D2FE]">Användarvillkor</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
