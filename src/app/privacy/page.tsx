import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Discount Quality Products',
  description:
    'Learn how Discount Quality Products collects, uses, and protects your personal information in accordance with UK GDPR and the Data Protection Act.',
  alternates: { canonical: 'https://discountqualityproducts.co.uk/privacy' },
};

const sections = [
  {
    title: '1. Personal Information We Collect',
    body: 'When you visit the Site, we automatically collect certain information about your device, including information about your web browser, IP address, time zone, and some of the cookies that are installed on your device. Additionally, when you make a purchase or attempt to make a purchase through the Site, we collect certain information from you, including your name, billing address, shipping address, payment information, email address, and phone number.',
  },
  {
    title: '2. How Do We Use Your Personal Information?',
    body: 'We use the order information that we collect generally to fulfil any orders placed through the Site (including processing your payment information, arranging for shipping, and providing you with invoices and/or order confirmations). Additionally, we use this information to communicate with you, screen our orders for potential risk or fraud, and provide you with information or advertising relating to our products or services in line with your shared preferences.',
  },
  {
    title: '3. Sharing Your Personal Information',
    body: 'We share your Personal Information with third parties to help us use your Personal Information, as described above. For example, we use WordPress/WooCommerce to power our backend inventory, Vercel to host our fast frontend architecture, and Stripe and PayPal to process payments securely. Your credit card data never touches our local servers.',
  },
  {
    title: '4. Your Rights (GDPR & UK Data Protection Act)',
    body: 'If you are a UK or European resident, you have the right to access personal information we hold about you and to ask that your personal information be corrected, updated, or deleted. If you would like to exercise this right, please contact us at sales@discountproducts.co.uk.',
  },
  {
    title: '5. Data Retention',
    body: 'When you place an order through the Site, we will maintain your Order Information for our records unless and until you ask us to delete this information.',
  },
  {
    title: '6. Contact Us',
    body: 'For more information about our privacy practices, please contact us by email at sales@discountproducts.co.uk.',
  },
];

export default function PrivacyPage() {
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
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Legal</p>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-zinc-500">Effective Date: May 20, 2026</p>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-4xl px-6 sm:px-8 py-14 md:py-20">
        <p className="text-base text-zinc-600 leading-relaxed mb-12 border-l-4 border-primary/30 pl-5">
          Discount Quality Products (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is
          committed to protecting your privacy. This Privacy Policy describes how your personal
          information is collected, used, and shared when you visit or make a purchase from
          discountproducts.co.uk (the &ldquo;Site&rdquo;).
        </p>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-zinc-900 mb-3">{section.title}</h2>
              <p className="text-base text-zinc-600 leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-100 flex flex-wrap gap-4 text-sm text-zinc-400">
          <Link href="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
          <span>·</span>
          <Link href="/refunds" className="hover:text-primary transition-colors">Refund Policy</Link>
          <span>·</span>
          <Link href="/shipping" className="hover:text-primary transition-colors">Shipping Policy</Link>
        </div>
      </div>
    </div>
  );
}
