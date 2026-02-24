import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of service for Amida, a service by Babalisk AB.',
  alternates: { canonical: 'https://amida.babalisk.com/terms' },
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
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-[#C7D2FE]/50 mb-10">Last updated: February 23, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none text-[#C7D2FE]/80 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-white">1. About the Service</h2>
            <p>
              Amida (&quot;the Service&quot;) is provided by Babalisk AB, registered in Sweden.
              The Service is a web-based platform for managing gigs, invoices, and finances,
              designed for freelance musicians and music companies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Account</h2>
            <p>
              To use the Service, you need to create an account with a valid email address.
              You are responsible for keeping your login credentials secure and for all activity
              that occurs under your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Free Plan and Paid Services</h2>
            <p>
              Amida offers a free plan with limited functionality. Paid plans (Pro, Team)
              provide access to additional features. Payment is processed via Stripe and charged
              monthly or annually according to the selected plan.
            </p>
            <p>
              You may upgrade, downgrade, or cancel your subscription at any time via settings.
              When downgrading, you retain your current plan until the end of the billing period.
              Refunds are not issued for periods already started.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Acceptable Use</h2>
            <p>You agree to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Not use the Service for illegal purposes.</li>
              <li>Not attempt to gain unauthorized access to other users&apos; data.</li>
              <li>Not distribute malicious code or overload the Service with automated requests beyond normal use.</li>
              <li>Provide accurate information in invoices and company details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Your Content</h2>
            <p>
              You own all data you create in the Service (gigs, invoices, receipts, etc.).
              We do not claim intellectual property rights to your content. You grant us a
              limited license to store, display, and process your content to the extent necessary
              to deliver the Service (e.g., generating PDF invoices, AI-scanning receipts).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Limitation of Liability</h2>
            <p>
              The Service is provided &quot;as is.&quot; Amida is an administrative tool — not an
              accounting firm or bookkeeping service. You are responsible for ensuring that
              invoices, amounts, client information, and other data you enter in the Service
              are correct and complete.
            </p>
            <p>
              We strive for high availability but do not guarantee uninterrupted operation.
              Babalisk AB is not liable for:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Indirect damages, lost profits, or lost data beyond what is caused by gross negligence.</li>
              <li>Inaccuracies in AI-generated receipt interpretations — you are responsible for verifying extracted data.</li>
              <li>Third-party service availability (Stripe, email providers).</li>
              <li>Incorrect amounts, VAT rates, or information in invoices you create via the Service.</li>
            </ul>
            <p>
              We take reasonable technical and organizational security measures to protect your data,
              but cannot guarantee against data loss. You are recommended to regularly export important
              data (e.g., invoices as PDF) and not rely on the Service as your sole storage.
            </p>
            <p>
              Our total liability is limited to the amount you have paid for the Service during
              the preceding 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Force Majeure</h2>
            <p>
              Babalisk AB is not liable for delays or interruptions in the Service caused by
              circumstances beyond our reasonable control, including but not limited to:
              natural disasters, power outages, internet disruptions, cyberattacks, third-party
              provider failures, pandemics, government decisions, or legislative changes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Termination</h2>
            <p>
              You may delete your account at any time. We reserve the right to suspend accounts
              that violate these terms, after reasonable notice unless circumstances require
              immediate action.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">9. Changes to Terms</h2>
            <p>
              We may update these terms. Material changes will be communicated at least 30 days
              in advance via email or within the Service. Continued use after the changes take
              effect constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">10. Governing Law</h2>
            <p>
              These terms are governed by Swedish law. Disputes shall be resolved by Swedish
              courts with the Stockholm District Court as the court of first instance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">11. Contact</h2>
            <p>
              Questions about these terms are handled by:<br />
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
            <Link href="/privacy" className="hover:text-[#C7D2FE]">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
