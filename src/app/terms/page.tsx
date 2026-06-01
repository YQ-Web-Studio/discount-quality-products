import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Scale } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Discount Quality Products',
  description:
    'Read the Terms and Conditions of Sale governing purchases from Discount Quality Products (discountproducts.co.uk).',
  alternates: { canonical: 'https://discountqualityproducts.co.uk/terms' },
};

export default function TermsPage() {
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
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Legal</p>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl mb-3">
            Terms and Conditions of Sale
          </h1>
          <p className="text-sm text-zinc-500">Last Updated: May 20, 2026</p>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-4xl px-6 sm:px-8 py-14 md:py-20">
        <p className="text-base text-zinc-600 leading-relaxed mb-12 border-l-4 border-primary/30 pl-5">
          Welcome to Discount Quality Products (discountproducts.co.uk). These Terms and Conditions
          govern your use of our website and the purchase of any goods from us. By placing an order,
          you agree to be bound by these terms.
        </p>

        <div className="space-y-10">
          <section>
            <h2 className="text-lg font-bold text-zinc-900 mb-4">1. Information About Us</h2>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-6 space-y-3 text-sm text-zinc-600">
              <p>This website is operated by <strong className="text-zinc-900">Discount Quality Products</strong>.</p>
              <p>
                <span className="text-zinc-400 font-medium">Email:</span>{' '}
                <a href="mailto:sales@discountproducts.co.uk" className="text-primary hover:underline">
                  sales@discountproducts.co.uk
                </a>
              </p>
              <p>
                <span className="text-zinc-400 font-medium">Business Address:</span>{' '}
                256 London Road, Westcliff-on-Sea, Essex, SS0 7JG, United Kingdom
              </p>
              <p>
                <span className="text-zinc-400 font-medium">Company Registration:</span>{' '}
                07596933
              </p>
              <p>
                <span className="text-zinc-400 font-medium">VAT Number:</span>{' '}
                GB 150696600
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-zinc-900 mb-3">2. Contract Formation & Pricing</h2>
            <p className="text-base text-zinc-600 leading-relaxed">
              Your order constitutes an offer to buy a product. All orders are subject to acceptance
              by us, confirmed via an Order Confirmation email. While we try to ensure all prices on
              our website are accurate, errors may occur. If we discover an error in the price of
              goods you have ordered, we will inform you as soon as possible and give you the option
              of reconfirming your order at the correct price or cancelling it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-zinc-900 mb-3">3. Limitation of Liability</h2>
            <p className="text-base text-zinc-600 leading-relaxed">
              To the fullest extent permitted by law, Discount Quality Products shall not be liable
              for any indirect, incidental, or consequential damages resulting from the use or
              inability to use our products or website. Our total liability to you for any breach of
              these terms is strictly limited to the purchase price of the goods you ordered.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-zinc-900 mb-3">4. Governing Law</h2>
            <p className="text-base text-zinc-600 leading-relaxed">
              These terms and any dispute or claim arising out of or in connection with them shall be
              governed by and construed in accordance with the laws of England and Wales.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-100 flex flex-wrap gap-4 text-sm text-zinc-400">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/refunds" className="hover:text-primary transition-colors">Refund Policy</Link>
          <span>·</span>
          <Link href="/shipping" className="hover:text-primary transition-colors">Shipping Policy</Link>
        </div>
      </div>
    </div>
  );
}
