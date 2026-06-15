import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, RotateCcw } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy | Discount Quality Products',
  description:
    'Understand your 14-day right to cancel and our refund process at Discount Quality Products, in accordance with UK Consumer Contracts Regulations.',
  alternates: { canonical: 'https://www.discountproducts.co.uk/refunds' },
};

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-zinc-50 border-b border-zinc-200">
        <div className="mx-auto max-w-4xl px-6 sm:px-8 py-14 md:py-20">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-900 transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to store
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <RotateCcw className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Legal</p>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl mb-3">
            Refund & Cancellation Policy
          </h1>
          <p className="text-sm text-zinc-500">Last Updated: May 20, 2026</p>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-4xl px-6 sm:px-8 py-14 md:py-20">
        <p className="text-base text-zinc-600 leading-relaxed mb-12 border-l-4 border-primary/30 pl-5">
          Under the UK Consumer Contracts Regulations, you have the statutory right to cancel your
          order and request a refund for any reason within a specific timeframe.
        </p>

        <div className="space-y-10">
          {/* 14-day highlight card */}
          <section>
            <h2 className="text-lg font-bold text-zinc-900 mb-4">1. Your 14-Day Right to Cancel</h2>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 mb-4 flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <RotateCcw className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-800 mb-1">14-Day Cooling-Off Period</p>
                <p className="text-sm text-emerald-700 leading-relaxed">
                  You have the right to cancel your purchase within <strong>14 days</strong> from
                  the day you receive the goods — no questions asked.
                </p>
              </div>
            </div>
            <p className="text-base text-zinc-600 leading-relaxed">
              To exercise your right to cancel, you must inform us of your decision by a clear
              statement via email at{' '}
              <a href="mailto:sales@fncomputers.com" className="text-primary hover:underline font-semibold">
                sales@fncomputers.com
              </a>{' '}
              or through our{' '}
              <Link href="/contact" className="text-primary hover:underline font-semibold">
                Contact Page
              </Link>{' '}
              before the 14-day period expires.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-zinc-900 mb-3">2. Conditions for Returns</h2>
            <p className="text-base text-zinc-600 leading-relaxed">
              To be eligible for a full refund, items must be returned to us unused, in the same
              condition that you received them, and in their original packaging. You will be
              responsible for paying your own shipping costs for returning your item, unless the item
              arrived damaged or faulty. We highly recommend using a trackable shipping service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-zinc-900 mb-3">3. Processing Refunds</h2>
            <p className="text-base text-zinc-600 leading-relaxed">
              Once your return is received and inspected, we will notify you of the approval or
              rejection of your refund. If approved, your refund will be processed and a credit will
              automatically be applied to your original method of payment (Stripe or PayPal) within
              14 days of us receiving the returned goods.
            </p>
          </section>
        </div>

        <div className="mt-12 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <p className="text-sm font-semibold text-zinc-900 mb-1">Need to start a return?</p>
          <p className="text-sm text-zinc-500 mb-4">
            Use our online returns portal to look up your order and submit a request.
          </p>
          <Link
            href="/returns"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Start a Return
          </Link>
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-100 flex flex-wrap gap-4 text-sm text-zinc-400">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
          <span>·</span>
          <Link href="/shipping" className="hover:text-primary transition-colors">Shipping Policy</Link>
        </div>
      </div>
    </div>
  );
}
