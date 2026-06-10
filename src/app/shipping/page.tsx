import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy | Discount Quality Products',
  description:
    'Find out about our UK shipping rates, delivery estimates, and order processing times at Discount Quality Products.',
  alternates: { canonical: 'https://discountqualityproducts.co.uk/shipping' },
};

export default function ShippingPage() {
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
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Legal</p>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl mb-3">
            Shipping & Delivery Policy
          </h1>
          <p className="text-sm text-zinc-500">Effective Date: May 20, 2026</p>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-4xl px-6 sm:px-8 py-14 md:py-20">
        <p className="text-base text-zinc-600 leading-relaxed mb-12 border-l-4 border-primary/30 pl-5">
          Thank you for shopping at Discount Quality Products. Below are the terms and conditions
          that constitute our Shipping Policy.
        </p>

        <div className="space-y-10">
          <section>
            <h2 className="text-lg font-bold text-zinc-900 mb-3">1. Shipment Processing Time</h2>
            <p className="text-base text-zinc-600 leading-relaxed">
              All orders are processed within 1–2 business days. Orders are not shipped or delivered
              on weekends or public holidays. If we are experiencing a high volume of orders,
              shipments may be delayed by a few days. If there will be a significant delay in
              shipment of your order, we will contact you via email or telephone.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-zinc-900 mb-4">
              2. Shipping Rates & Delivery Estimates
            </h2>
            <p className="text-base text-zinc-600 leading-relaxed mb-6">
              We primarily serve customers within the United Kingdom. Shipping charges for your order will be calculated and displayed at checkout.
            </p>
            <div className="rounded-xl border border-zinc-200 overflow-hidden">
              <div className="grid grid-cols-3 bg-zinc-50 border-b border-zinc-200 px-5 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">
                <span>Service</span>
                <span>Estimate</span>
                <span>Cost</span>
              </div>
              <div className="grid grid-cols-3 items-center px-5 py-4 border-b border-zinc-100">
                <div>
                  <span className="text-sm font-semibold text-zinc-900 block">Standard Delivery</span>
                  <span className="text-[11px] text-zinc-400">Base shipping rate</span>
                </div>
                <span className="text-sm text-zinc-600">3–5 business days</span>
                <span className="text-sm font-bold text-zinc-900">
                  £2.00 <span className="text-xs text-emerald-600 font-semibold block sm:inline sm:ml-1">(FREE on orders over £5)</span>
                </span>
              </div>
              <div className="grid grid-cols-3 items-center px-5 py-4 border-b border-zinc-100">
                <div>
                  <span className="text-sm font-semibold text-zinc-900 block">First Class Delivery</span>
                  <span className="text-[11px] text-zinc-400">Upgrade (+£2.00 surcharge)</span>
                </div>
                <span className="text-sm text-zinc-600">1–2 business days</span>
                <span className="text-sm font-bold text-zinc-900">
                  +£2.00 <span className="text-xs text-zinc-500 font-normal block sm:inline sm:ml-1">(£4.00 if under £5; £2.00 if £5+)</span>
                </span>
              </div>
              <div className="grid grid-cols-3 items-center px-5 py-4">
                <div>
                  <span className="text-sm font-semibold text-zinc-900 block">Courier Delivery</span>
                  <span className="text-[11px] text-zinc-400">Upgrade (+£10.00 surcharge)</span>
                </div>
                <span className="text-sm text-zinc-600">1–2 business days</span>
                <span className="text-sm font-bold text-zinc-900">
                  +£10.00 <span className="text-xs text-zinc-500 font-normal block sm:inline sm:ml-1">(£12.00 if under £5; £10.00 if £5+)</span>
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-400">UK Mainland only. Rates are configured dynamically based on basket total.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-zinc-900 mb-3">
              3. International Shipping
            </h2>
            <p className="text-base text-zinc-600 leading-relaxed">
              We restrict checkout shipping options strictly to the United Kingdom. For international order inquiries, please contact us directly at{' '}
              <a
                href="mailto:sales@fncomputers.com"
                className="text-primary hover:underline font-semibold"
              >
                sales@fncomputers.com
              </a>{' '}
              or via our{' '}
              <Link href="/contact" className="text-primary hover:underline font-semibold">
                Contact Page
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-zinc-900 mb-3">
              4. Shipment Confirmation
            </h2>
            <p className="text-base text-zinc-600 leading-relaxed">
              You will receive a Shipment Confirmation email once your order has been dispatched from our warehouse.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-zinc-900 mb-3">5. Customs, Duties, and Taxes</h2>
            <p className="text-base text-zinc-600 leading-relaxed">
              Discount Quality Products is not responsible for any customs and taxes applied to your
              order. All fees imposed during or after shipping are the responsibility of the customer.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-zinc-900 mb-3">6. Damages</h2>
            <p className="text-base text-zinc-600 leading-relaxed">
              If you receive your order damaged, please contact our support team immediately at{' '}
              <a
                href="mailto:sales@fncomputers.com"
                className="text-primary hover:underline font-semibold"
              >
                sales@fncomputers.com
              </a>{' '}
              or via our{' '}
              <Link href="/contact" className="text-primary hover:underline font-semibold">
                Contact Page
              </Link>{' '}
              to file a claim. Please save all packaging materials and damaged goods before filing a
              claim.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-100 flex flex-wrap gap-4 text-sm text-zinc-400">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
          <span>·</span>
          <Link href="/refunds" className="hover:text-primary transition-colors">Refund Policy</Link>
        </div>
      </div>
    </div>
  );
}
