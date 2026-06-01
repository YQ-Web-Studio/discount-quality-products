import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, RotateCcw } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Returns & Refund Policy | Discount Quality Products',
  description:
    'Understand your 30-day returns window and our refund process at Discount Quality Products, including card and PayPal refund timelines.',
  alternates: { canonical: 'https://discountqualityproducts.co.uk/refunds' },
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
            Returns & Refund Policy
          </h1>
          <p className="text-sm text-zinc-500">Last Updated: June 1, 2026</p>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-4xl px-6 sm:px-8 py-14 md:py-20">
        <p className="text-base text-zinc-600 leading-relaxed mb-12 border-l-4 border-primary/30 pl-5">
          Thank you for shopping with Discount Quality Products. We want you to be completely satisfied with your purchase. 
          If you need to make a return, we offer a straightforward, customer-friendly policy.
        </p>

        <div className="space-y-10">
          {/* 30-day highlight card */}
          <section>
            <h2 className="text-lg font-bold text-zinc-900 mb-4">1. Your 30-Day Returns Window</h2>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 mb-4 flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <RotateCcw className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-800 mb-1">30-Day Satisfaction Period</p>
                <p className="text-sm text-emerald-700 leading-relaxed">
                  You have the right to return your purchase for any reason within <strong>30 days</strong> from
                  the day you receive the goods — no hassle, no fuss.
                </p>
              </div>
            </div>
            <p className="text-base text-zinc-600 leading-relaxed">
              To exercise your right to cancel or return an item, you must inform us of your decision by submitting a request through our returns portal or contacting us via email at{' '}
              <a href="mailto:sales@discountproducts.co.uk" className="text-primary hover:underline">
                sales@discountproducts.co.uk
              </a>{' '}
              before the 30-day period expires.
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
            <h2 className="text-lg font-bold text-zinc-900 mb-3">3. Processing & Receiving Refunds</h2>
            <p className="text-base text-zinc-600 leading-relaxed mb-4">
              Once your returned item is received and inspected by our warehouse team, we will process your refund immediately. 
            </p>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 space-y-4 text-sm text-zinc-600">
              <p>
                <strong className="text-zinc-900">Refund Timelines & Methods:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-zinc-900">Credit / Debit Card Purchases (via Stripe):</strong> Refunds will be issued directly back to the bank account linked to the card you used to make the purchase. These typically take <strong className="text-zinc-900">3 to 5 working days</strong> to show up in your bank account, depending on your bank's processing times.
                </li>
                <li>
                  <strong className="text-zinc-900">PayPal Purchases:</strong> Refunds will be credited back to your PayPal balance or your linked funding source, usually showing within <strong className="text-zinc-900">3 to 5 working days</strong>.
                </li>
              </ul>
            </div>
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
