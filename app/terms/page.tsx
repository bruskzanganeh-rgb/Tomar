import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Användarvillkor — Amida',
  description: 'Användarvillkor for Amida, en tjänst av Babalisk AB.',
}

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Användarvillkor</h1>
        <p className="text-sm text-[#C7D2FE]/50 mb-10">Senast uppdaterad: 23 februari 2026</p>

        <div className="prose prose-invert prose-sm max-w-none text-[#C7D2FE]/80 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Om tjänsten</h2>
            <p>
              Amida ("Tjänsten") tillhandahålls av Babalisk AB, org.nr registrerat i Sverige.
              Tjänsten är en webbaserad plattform for hantering av uppdrag, fakturor och
              ekonomi, riktad till frilansmusiker och musikföretag.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Konto</h2>
            <p>
              For att använda Tjänsten behöver du skapa ett konto med en giltig e-postadress.
              Du ansvarar for att hålla dina inloggningsuppgifter säkra och for all aktivitet
              som sker under ditt konto.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Gratisplan och betaltjänster</h2>
            <p>
              Amida erbjuder en gratisplan med begränsad funktionalitet. Betalplaner (Pro, Team)
              ger tillgång till ytterligare funktioner. Betalning sker via Stripe och debiteras
              månadsvis eller årsvis enligt vald plan.
            </p>
            <p>
              Du kan uppgradera, nedgradera eller avsluta din prenumeration när som helst via
              inställningarna. Vid nedgradering behåller du din nuvarande plan till periodens slut.
              Återbetalningar sker inte for redan påbörjade perioder.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Användning</h2>
            <p>Du förbinder dig att:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Inte använda Tjänsten for olagliga ändamål.</li>
              <li>Inte försöka få obehörig åtkomst till andra användares data.</li>
              <li>Inte sprida skadlig kod eller belasta Tjänsten med automatiserade anrop utöver normalt bruk.</li>
              <li>Ange korrekta uppgifter i fakturor och företagsinformation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Ditt innehåll</h2>
            <p>
              Du äger all data du skapar i Tjänsten (uppdrag, fakturor, kvitton, etc.).
              Vi gör inte anspråk på immateriella rättigheter till ditt innehåll. Du ger oss
              en begränsad licens att lagra, visa och bearbeta ditt innehåll i den utsträckning
              som behövs for att leverera Tjänsten (t.ex. generera PDF-fakturor, AI-skanna kvitton).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Ansvarsbegränsning</h2>
            <p>
              Tjänsten tillhandahålls "i befintligt skick". Vi strävar efter hög tillgänglighet
              men garanterar inte avbrottsfri drift. Babalisk AB ansvarar inte for:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Indirekta skador, utebliven vinst eller förlorad data utöver vad som orsakats av grov vårdslöshet.</li>
              <li>Felaktigheter i AI-genererade kvittotolkningar — du ansvarar for att verifiera extraherade uppgifter.</li>
              <li>Tredjepartstjänsters tillgänglighet (Stripe, e-postleverantörer).</li>
            </ul>
            <p>
              Vårt totala ansvar begränsas till det belopp du betalat for Tjänsten under de
              senaste 12 månaderna.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Uppsägning</h2>
            <p>
              Du kan radera ditt konto när som helst. Vi förbehåller oss rätten att stänga
              av konton som bryter mot dessa villkor, efter rimligt varsel om inte omständigheterna
              kräver omedelbar åtgärd.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Ändringar av villkoren</h2>
            <p>
              Vi kan uppdatera dessa villkor. Väsentliga ändringar meddelas minst 30 dagar i
              förväg via e-post eller i Tjänsten. Fortsatt användning efter ändringarna träder
              i kraft innebär godkännande.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">9. Tillämplig lag</h2>
            <p>
              Dessa villkor regleras av svensk lag. Tvister avgörs av svensk allmän domstol
              med Stockholms tingsrätt som första instans.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">10. Kontakt</h2>
            <p>
              Frågor om dessa villkor besvaras av:<br />
              Babalisk AB<br />
              <a href="mailto:support@babalisk.com" className="text-[#F59E0B] hover:underline">support@babalisk.com</a>
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
            <Link href="/privacy" className="hover:text-[#C7D2FE]">Integritetspolicy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
