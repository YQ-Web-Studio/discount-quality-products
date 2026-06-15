import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Discount Quality Products',
  description:
    'Learn how Discount Quality Products collects, uses, and protects your personal information in accordance with UK GDPR and the Data Protection Act.',
  alternates: { canonical: 'https://www.discountproducts.co.uk/privacy' },
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
    title: '4. Cookies & Google Analytics 4',
    body: 'We use Google Analytics 4 (GA4) to help us understand how visitors interact with the site, which helps us improve the storefront experience. GA4 operates in compliance with Google Consent Mode v2. By default, all tracking cookies and advertising identifiers (analytics_storage, ad_storage, ad_user_data, ad_personalization) are blocked and set to "denied". They are only activated if you explicitly select "Accept All" on our Cookie Consent Banner. You can choose to "Reject All" to block tracking entirely, and you can modify your choice at any time by clearing your browser cookies to re-trigger the preference prompt.',
  },
  {
    title: '5. GA4 E-Commerce Event Tracking',
    body: 'If you have accepted analytics cookies, we transmit standard GA4 e-commerce events to Google Analytics to measure shopping behaviour: a "view_item" event when you view a product page; an "add_to_cart" event when you add an item to your basket; and a "purchase" event when your payment is confirmed. The purchase event includes your order total, shipping cost, VAT amount, and a line-item breakdown of products purchased (item name, price, quantity). No personally identifiable information — such as your name, email address, or payment details — is included in any of these events.',
  },
  {
    title: '6. Browser Storage (Cookies, localStorage & sessionStorage)',
    body: 'We use your browser’s localStorage to store your basket contents, recently viewed products, wishlist, and cookie consent preference — all locally on your device. We use sessionStorage to temporarily hold an order snapshot immediately after payment (used solely to transmit the GA4 "purchase" event on the confirmation page), which is deleted as soon as it has been read. None of this data is transmitted to our servers except where required to process your order.',
  },
  {
    title: '7. Your Rights (GDPR & UK Data Protection Act)',
    body: (
      <>
        If you are a UK or European resident, you have the right to access personal information we hold about you and to ask that your personal information be corrected, updated, or deleted. If you would like to exercise this right, please contact us at{' '}
        <a href="mailto:sales@fncomputers.com" className="text-primary hover:underline font-semibold">
          sales@fncomputers.com
        </a>{' '}
        or via our{' '}
        <Link href="/contact" className="text-primary hover:underline font-semibold">
          Contact Page
        </Link>.
      </>
    ),
  },
  {
    title: '8. Data Retention',
    body: 'When you place an order through the Site, we will maintain your Order Information for our records unless and until you ask us to delete this information.',
  },
  {
    title: '9. Contact Us',
    body: (
      <>
        For more information about our privacy practices, please contact us by email at{' '}
        <a href="mailto:sales@fncomputers.com" className="text-primary hover:underline font-semibold">
          sales@fncomputers.com
        </a>{' '}
        or via our{' '}
        <Link href="/contact" className="text-primary hover:underline font-semibold">
          Contact Page
        </Link>.
      </>
    ),
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
          <p className="text-sm text-zinc-500">Effective Date: June 6, 2026</p>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-4xl px-6 sm:px-8 py-14 md:py-20">
        <p className="text-base text-zinc-600 leading-relaxed mb-12 border-l-4 border-primary/30 pl-5">
          Discount Quality Products (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is
          committed to protecting your privacy. This Privacy Policy describes how your personal
          information is collected, used, and shared when you visit or make a purchase from
          www.discountproducts.co.uk (the &ldquo;Site&rdquo;).
        </p>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-zinc-900 mb-3">{section.title}</h2>
              <div className="text-base text-zinc-600 leading-relaxed">{section.body}</div>
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
