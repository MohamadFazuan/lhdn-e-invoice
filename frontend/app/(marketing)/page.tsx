import Link from 'next/link';
import { FileText, Zap, Users, BarChart3, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const FEATURES = [
  { icon: Zap, title: 'AI-Powered OCR', desc: 'Upload any receipt or invoice and our AI extracts all fields automatically using vision models.' },
  { icon: FileText, title: 'LHDN Direct Submission', desc: 'Submit validated e-invoices directly to LHDN MyInvois with a single click. No more manual portal uploads.' },
  { icon: Users, title: 'Team Collaboration', desc: 'Invite accountants and viewers with role-based access. OWNER, ADMIN, ACCOUNTANT, and VIEWER roles.' },
  { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Track revenue trends, rejection rates, and top buyers with beautiful charts and KPI dashboards.' },
];

const STEPS = [
  { n: '01', title: 'Upload Your Invoice', desc: 'Drag and drop a PDF or image. Our AI reads it instantly.' },
  { n: '02', title: 'AI Extracts Data', desc: 'Supplier, buyer, line items, and totals are automatically filled in.' },
  { n: '03', title: 'Submit to LHDN', desc: 'One click sends your validated e-invoice to LHDN MyInvois.' },
];

const PRICING = [
  {
    name: 'Starter', price: 'Free', desc: 'For individuals and small businesses',
    features: ['10 invoices/month', '1 user', 'Basic analytics', 'Email support'],
    cta: 'Get Started', primary: false,
  },
  {
    name: 'Pro', price: 'RM 49/mo', desc: 'For growing businesses',
    features: ['Unlimited invoices', '5 users', 'Full analytics', 'AI OCR upload', 'Priority support'],
    cta: 'Start Free Trial', primary: true,
  },
  {
    name: 'Business', price: 'RM 149/mo', desc: 'For enterprises and accounting firms',
    features: ['Unlimited everything', '20 users', 'Bulk CSV import', 'API access', 'Dedicated support'],
    cta: 'Contact Sales', primary: false,
  },
];

const FAQS = [
  { q: 'What is LHDN e-Invoice mandate?', a: 'Malaysia\'s LHDN requires all businesses to issue e-invoices through the MyInvois portal as part of a phased digital tax compliance rollout starting from August 2024.' },
  { q: 'Which businesses must comply?', a: 'Phase 1 covers businesses with annual revenue > RM100M (August 2024). Smaller businesses will be included progressively through 2025–2027.' },
  { q: 'Can I use this platform for sandbox testing?', a: 'Yes! Create an account, obtain sandbox credentials from the LHDN developer portal, and test submissions without affecting live data.' },
  { q: 'How does the AI OCR work?', a: 'We use a combination of PDF text extraction and vision AI models to read invoice images and extract structured data including line items, totals, and party information.' },
  { q: 'Is my data secure?', a: 'All LHDN credentials are encrypted using AES-GCM-256. Data is stored on Cloudflare infrastructure with SOC2 compliance.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-zinc-900">e-Invoice</span>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-zinc-600 hidden sm:inline-flex">
            <Link href="/pricing">Pricing</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-zinc-600">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild size="sm" className="bg-zinc-900 hover:bg-zinc-700 text-white">
            <Link href="/register">Start for Free</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-6 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          LHDN MyInvois compliant
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900 mb-5 leading-tight">
          Smart e-invoicing for<br />Malaysian businesses
        </h1>
        <p className="text-lg text-zinc-500 mb-8 max-w-xl mx-auto">
          Upload any invoice, let AI extract the data, and submit directly to LHDN MyInvois — all in minutes.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button asChild size="lg" className="bg-zinc-900 hover:bg-zinc-700 text-white h-12 px-8">
            <Link href="/register">Start for free <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-8">
            <a href="#how-it-works">See how it works</a>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-zinc-50" id="features">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-zinc-900 text-center mb-10">Everything you need for e-invoicing</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                    <Icon className="h-4 w-4 text-zinc-700" />
                  </div>
                  <h3 className="font-semibold text-zinc-900 mb-1.5">{f.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6" id="how-it-works">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-10">How it works</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white">{step.n}</div>
                <h3 className="font-semibold text-zinc-900 mb-1">{step.title}</h3>
                <p className="text-sm text-zinc-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-6 bg-zinc-50" id="pricing">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-zinc-900 text-center mb-10">Simple, transparent pricing</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {PRICING.map((plan) => (
              <div key={plan.name} className={`rounded-xl border p-6 shadow-sm flex flex-col ${plan.primary ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white'}`}>
                <p className={`text-sm font-medium mb-1 ${plan.primary ? 'text-zinc-400' : 'text-zinc-500'}`}>{plan.name}</p>
                <p className={`text-3xl font-bold mb-1 ${plan.primary ? 'text-white' : 'text-zinc-900'}`}>{plan.price}</p>
                <p className={`text-xs mb-5 ${plan.primary ? 'text-zinc-400' : 'text-zinc-500'}`}>{plan.desc}</p>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${plan.primary ? 'text-emerald-400' : 'text-emerald-500'}`} />
                      <span className={plan.primary ? 'text-zinc-300' : 'text-zinc-600'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild variant={plan.primary ? 'secondary' : 'outline'} className={plan.primary ? 'bg-white text-zinc-900 hover:bg-zinc-100' : ''}>
                  <Link href="/register">{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-zinc-900 text-center mb-10">Trusted by Malaysian businesses</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { name: 'Ahmad Razif', company: 'Tech Startup KL', quote: 'Saved us hours every week. The AI OCR is incredibly accurate for Malaysian invoices.' },
              { name: 'Siti Nurhaliza', company: 'Consulting Firm PJ', quote: 'The team features are perfect. My accountant can manage invoices without full access.' },
              { name: 'Wei Liang Tan', company: 'E-commerce Selangor', quote: 'Direct LHDN submission means zero manual uploads. Compliance is now effortless.' },
            ].map((t) => (
              <div key={t.name} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-zinc-600 italic mb-4">&quot;{t.quote}&quot;</p>
                <div>
                  <p className="font-semibold text-zinc-900 text-sm">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 bg-zinc-50" id="faq">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-zinc-900 text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-zinc-900 text-sm mb-2">{faq.q}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center bg-zinc-900">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to simplify e-invoicing?</h2>
        <p className="text-zinc-400 mb-8">Join hundreds of Malaysian businesses already using e-Invoice.</p>
        <Button asChild size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 h-12 px-8">
          <Link href="/register">Create your free account</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900">
              <FileText className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-medium text-zinc-900">e-Invoice</span>
          </div>
          <div className="flex gap-6 text-xs text-zinc-500">
            <Link href="/pricing" className="hover:text-zinc-900">Pricing</Link>
            <Link href="/login" className="hover:text-zinc-900">Sign In</Link>
            <Link href="/register" className="hover:text-zinc-900">Register</Link>
          </div>
          <p className="text-xs text-zinc-400">&copy; {new Date().getFullYear()} e-Invoice. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
