import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Freelance Musician Invoice Template: What to Include & Free Download',
  description: 'Learn exactly what to include on a freelance musician invoice, avoid common mistakes, and get a free template. Covers VAT, payment terms, and more.',
  alternates: { canonical: 'https://amida.babalisk.com/blog/freelance-musician-invoice-template' },
  openGraph: {
    title: 'Freelance Musician Invoice Template: What to Include & Free Download',
    description: 'A complete guide to creating professional invoices as a freelance musician.',
    url: 'https://amida.babalisk.com/blog/freelance-musician-invoice-template',
    type: 'article',
  },
}

export default function FreelanceMusicianInvoiceTemplatePage() {
  return (
    <div className="min-h-screen bg-[#0B1E3A]">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: 'Freelance Musician Invoice Template: What to Include & Free Download',
            description: 'A complete guide to creating professional invoices as a freelance musician.',
            url: 'https://amida.babalisk.com/blog/freelance-musician-invoice-template',
            datePublished: '2026-02-24',
            dateModified: '2026-02-24',
            author: { '@type': 'Organization', name: 'Amida', url: 'https://amida.babalisk.com' },
            publisher: { '@type': 'Organization', name: 'Amida', url: 'https://amida.babalisk.com' },
            mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://amida.babalisk.com/blog/freelance-musician-invoice-template' },
          }),
        }}
      />

      <header className="border-b border-[#1a3a5c] bg-[#0B1E3A]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Amida" width={32} height={32} />
            <span className="text-lg font-semibold tracking-tight text-white">Amida</span>
          </Link>
          <Link href="/signup" className="text-sm text-[#F59E0B] hover:text-[#F59E0B]/80 font-medium">
            Get started free
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-[#C7D2FE]/50 hover:text-[#C7D2FE] transition-colors mb-8">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to blog
        </Link>

        <article>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
            Freelance Musician Invoice Template: What to Include & Free Download
          </h1>
          <p className="text-sm text-[#C7D2FE]/50 mb-10">February 24, 2026</p>

          <div className="prose prose-invert prose-sm max-w-none text-[#C7D2FE]/80 space-y-6">
            <p className="text-base leading-relaxed">
              As a freelance musician, getting paid should be the easy part. You rehearsed, you performed, you delivered. But if your invoice is missing key details &mdash; or worse, looks unprofessional &mdash; payment can be delayed for weeks. A clear, well-structured invoice protects you legally, speeds up payment, and shows clients you run a real business.
            </p>
            <p>
              In this guide we&apos;ll walk through exactly what every freelance musician invoice needs, the most common mistakes to avoid, and how to handle taxes and VAT. At the end you&apos;ll find a free template you can start using today.
            </p>

            <h2 className="text-xl font-semibold text-white pt-4">Why invoicing matters for musicians</h2>
            <p>
              Many freelance musicians start out sending informal payment requests &mdash; a quick text message or an email with their bank details. That works until it doesn&apos;t. Without a proper invoice you have no paper trail for tax season, no legal proof of the agreed fee, and no way to chase late payments professionally.
            </p>
            <p>
              Professional invoicing also helps you stand out. Orchestras, venues and event planners work with dozens of freelancers. A clean invoice signals that you&apos;re organized and easy to work with &mdash; making it more likely they&apos;ll book you again.
            </p>

            <h2 className="text-xl font-semibold text-white pt-4">What to include on a freelance musician invoice</h2>
            <p>
              Every invoice you send should contain the following elements. Missing even one can cause delays or disputes.
            </p>

            <h3 className="text-lg font-medium text-white">1. Your full name and contact details</h3>
            <p>
              Include your legal name (or business name if you operate as a company), address, phone number and email. If you have a tax registration number or VAT number, include that too. This is required by law in most countries and makes it easy for the client&apos;s accounting department to process your invoice.
            </p>

            <h3 className="text-lg font-medium text-white">2. Client details</h3>
            <p>
              List the client&apos;s name and address. For corporate clients (orchestras, production companies, venues), use the official company name. Double-check spelling &mdash; an invoice addressed to the wrong entity can be rejected outright.
            </p>

            <h3 className="text-lg font-medium text-white">3. Invoice number</h3>
            <p>
              Use a sequential numbering system (e.g. INV-001, INV-002). This helps both you and the client track payments and is required for tax compliance in most jurisdictions. Never reuse an invoice number, even if you void the original.
            </p>

            <h3 className="text-lg font-medium text-white">4. Invoice date and due date</h3>
            <p>
              The invoice date is when you issue the invoice. The due date is when payment is expected. Common terms are &ldquo;Net 14&rdquo; (14 days) or &ldquo;Net 30&rdquo; (30 days). For one-off gigs, Net 14 is standard. If the client has specific payment terms, follow those &mdash; but always state the due date explicitly.
            </p>

            <h3 className="text-lg font-medium text-white">5. Description of services</h3>
            <p>
              Be specific. Instead of &ldquo;Music performance&rdquo;, write &ldquo;Violin performance at [Event Name], [Venue], [Date]&rdquo;. If you played multiple gigs, list each one as a separate line item with its own date and fee. This eliminates confusion and makes it harder for clients to dispute charges.
            </p>

            <h3 className="text-lg font-medium text-white">6. Fee breakdown</h3>
            <p>
              Show the fee for each line item, any additional charges (travel, equipment rental, rehearsal time), and the subtotal. If you charge different rates for rehearsals vs. performances, make that clear. Transparency builds trust.
            </p>

            <h3 className="text-lg font-medium text-white">7. Tax and VAT</h3>
            <p>
              If you&apos;re VAT-registered, show the net amount, the VAT rate, the VAT amount, and the gross total. If you&apos;re exempt or below the threshold, include a note explaining why (e.g. &ldquo;Small business exemption under [local regulation]&rdquo;). Different countries have different rules for performing artists &mdash; some cultural services are VAT-exempt or subject to a reduced rate. Check with a local accountant if you&apos;re unsure.
            </p>

            <h3 className="text-lg font-medium text-white">8. Payment details</h3>
            <p>
              Include your bank account number (IBAN for international payments), bank name, and any reference the client should use when paying. If you accept other payment methods (PayPal, Venmo, Wise), list those too. The easier you make it to pay, the faster you get paid.
            </p>

            <h3 className="text-lg font-medium text-white">9. Terms and conditions</h3>
            <p>
              A brief note about late payment fees (e.g. &ldquo;A late fee of 1.5% per month applies to overdue invoices&rdquo;) can motivate timely payment. You can also note cancellation policies here if relevant.
            </p>

            <h2 className="text-xl font-semibold text-white pt-4">Common invoicing mistakes musicians make</h2>
            <p>
              Even experienced freelancers trip up on these:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Forgetting the invoice number.</strong> Without a number, many accounting systems will reject the invoice entirely.</li>
              <li><strong className="text-white">Vague descriptions.</strong> &ldquo;Performance fee&rdquo; without dates or venue details invites questions and delays.</li>
              <li><strong className="text-white">Wrong VAT treatment.</strong> Charging VAT when you&apos;re not registered, or failing to charge it when you should, creates legal problems.</li>
              <li><strong className="text-white">No due date.</strong> If you don&apos;t set a deadline, don&apos;t be surprised when payment takes months.</li>
              <li><strong className="text-white">Sending invoices late.</strong> Invoice within 48 hours of the gig while the details are fresh. The longer you wait, the longer you wait to get paid.</li>
              <li><strong className="text-white">Not keeping copies.</strong> Always save a PDF copy of every invoice. You&apos;ll need them at tax time and for any disputes.</li>
            </ul>

            <h2 className="text-xl font-semibold text-white pt-4">VAT and tax tips for freelance musicians</h2>
            <p>
              Tax rules vary by country, but here are some universal principles:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Know your threshold.</strong> Most countries have a revenue threshold below which you don&apos;t need to register for VAT. Track your annual income to know when you&apos;re approaching it.</li>
              <li><strong className="text-white">Separate business and personal finances.</strong> Open a dedicated bank account for your music income. This makes bookkeeping dramatically easier.</li>
              <li><strong className="text-white">Track expenses.</strong> Instrument maintenance, strings, reeds, travel to gigs, sheet music &mdash; these are all deductible. Keep receipts and log them consistently.</li>
              <li><strong className="text-white">Set aside money for taxes.</strong> A good rule of thumb is to set aside 25&ndash;30% of every payment for taxes. Adjust based on your local rate.</li>
              <li><strong className="text-white">Consider an accountant.</strong> If you earn more than a modest amount from freelancing, the money you spend on an accountant will likely save you more in missed deductions and penalties.</li>
            </ul>

            <h2 className="text-xl font-semibold text-white pt-4">International gigs and cross-border invoicing</h2>
            <p>
              If you perform in multiple countries, invoicing gets more complex. You may need to apply the reverse-charge mechanism for EU cross-border services, include your VAT ID and the client&apos;s VAT ID, and invoice in the correct currency. Always confirm the invoicing requirements with the client before the gig &mdash; some orchestras have strict templates they need you to follow.
            </p>

            <h2 className="text-xl font-semibold text-white pt-4">Free invoice template for musicians</h2>
            <p>
              You can create your own template in a spreadsheet or word processor using the checklist above. Make sure it includes all nine elements we covered. Save it as a reusable template so you don&apos;t have to start from scratch every time.
            </p>
            <p>
              Or, skip the manual work entirely. <strong className="text-white">Amida</strong> is built specifically for freelance musicians and generates professional invoices in seconds &mdash; with correct VAT, automatic numbering, and a clean design your clients will love.
            </p>
          </div>
        </article>

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-[#1a3a5c] bg-[#102544] p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Skip the template &mdash; try Amida free
          </h2>
          <p className="text-[#C7D2FE]/70 mb-6 max-w-md mx-auto">
            Create professional invoices, track gigs and scan receipts &mdash; all in one app built for freelance musicians.
          </p>
          <Button size="lg" className="bg-[#F59E0B] text-[#0B1E3A] hover:bg-[#F59E0B]/90 font-semibold" asChild>
            <Link href="/signup" className="gap-2">
              Get started for free <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>

      <footer className="border-t border-[#1a3a5c] py-8 mt-16">
        <div className="mx-auto max-w-3xl px-6 flex items-center justify-between text-sm text-[#C7D2FE]/50">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Amida" width={24} height={24} />
            <span>&copy; {new Date().getFullYear()} Amida</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-[#C7D2FE] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[#C7D2FE] transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
