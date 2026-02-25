import Link from 'next/link';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PLANS = [
  {
    name: 'Starter', price: 'Free', period: '',
    desc: 'For individuals and freelancers getting started with e-invoicing.',
    features: ['10 invoices per month', '1 user', 'Basic analytics dashboard', 'Manual invoice creation', 'Email support'],
    cta: 'Get Started Free', href: '/register', primary: false,
  },
  {
    name: 'Pro', price: 'RM 49', period: '/month',
    desc: 'For growing businesses that need full e-invoicing capabilities.',
    features: ['Unlimited invoices', 'Up to 5 users', 'Full analytics + charts', 'AI OCR document upload', 'LHDN direct submission', 'Priority email support'],
    cta: 'Start Free Trial', href: '/register', primary: true,
  },
  {
    name: 'Business', price: 'RM 149', period: '/month',
    desc: 'For enterprises, accounting firms, and high-volume users.',
    features: ['Unlimited invoices', 'Up to 20 users', 'Bulk CSV import (500 rows)', 'API access', 'Custom analytics export', 'Dedicated account manager'],
    cta: 'Contact Sales', href: '/register', primary: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-10">
          <ArrowLeft className="h-3.5 w-3.5" />Back to Home
        </Link>
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-zinc-900 mb-3">Simple, transparent pricing</h1>
          <p className="text-zinc-500">Choose the plan that fits your business. Upgrade or downgrade anytime.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`rounded-xl border p-6 shadow-sm flex flex-col ${plan.primary ? 'border-zinc-900 bg-zinc-900 text-white relative' : 'border-zinc-200 bg-white'}`}>
              {plan.primary && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}
              <p className={`text-sm font-medium mb-1 ${plan.primary ? 'text-zinc-400' : 'text-zinc-500'}`}>{plan.name}</p>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className={`text-4xl font-bold ${plan.primary ? 'text-white' : 'text-zinc-900'}`}>{plan.price}</span>
                <span className={`text-sm ${plan.primary ? 'text-zinc-400' : 'text-zinc-500'}`}>{plan.period}</span>
              </div>
              <p className={`text-xs mb-6 ${plan.primary ? 'text-zinc-400' : 'text-zinc-500'}`}>{plan.desc}</p>
              <ul className="space-y-2.5 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${plan.primary ? 'text-emerald-400' : 'text-emerald-500'}`} />
                    <span className={plan.primary ? 'text-zinc-300' : 'text-zinc-600'}>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className={plan.primary ? 'bg-white text-zinc-900 hover:bg-zinc-100' : 'bg-zinc-900 hover:bg-zinc-700 text-white'}>
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-zinc-400 mt-8">
          All plans include LHDN MyInvois compliance. No credit card required for Starter.
        </p>
      </div>
    </div>
  );
}
