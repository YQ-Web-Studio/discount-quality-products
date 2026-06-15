"use client";

import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";

const footerLinks = {
  "Customer Service": [
    { label: "Contact Us", href: "/contact" },
    { label: "Returns & Refunds", href: "/returns" },
  ],
  "Legal": [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Refund Policy", href: "/refunds" },
    { label: "Shipping Policy", href: "/shipping" },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zinc-50 border-t border-zinc-200">
      <div className="mx-auto max-w-[1600px] 2xl:max-w-[1850px] px-6 sm:px-8 py-12 sm:py-16 md:px-12 2xl:px-16">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Branding */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-4 transition-all hover:opacity-90 group mb-8 outline-none pt-2">
              <div className="relative shrink-0 w-12 h-12 group-hover:scale-105 transition-transform duration-300">
                <img
                  src="/icon.svg"
                  alt="DQP Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col leading-none justify-center pl-1">
                <span
                  className="text-[15px] font-black italic tracking-[0.08em] uppercase text-primary inline-block origin-left"
                  style={{ transform: 'scaleX(1.2)', transformOrigin: 'left' }}
                >
                  Discount
                </span>
                <span className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-500 mt-1.5">
                  <span className="text-zinc-300 font-normal mr-1.5 select-none">—</span>Quality Products
                </span>
              </div>
            </Link>
            <p className="max-w-xl text-sm text-zinc-500 leading-relaxed mb-6">
              Your destination for premium lighting, electric fittings, computing, rare coins & stamps, DVDs, and magazines. We deliver exceptional value and reliable shipping worldwide from the UK.
            </p>
            <div className="flex flex-col gap-4 text-xs text-zinc-500">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                <address className="not-italic">
                  256 London Road, Westcliff-on-Sea,<br />
                  Essex, SS0 7JG, United Kingdom
                </address>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-zinc-400 shrink-0" />
                <a href="mailto:sales@fncomputers.com" className="hover:text-primary transition-colors">sales@fncomputers.com</a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-zinc-400 shrink-0" />
                <a href="tel:+441702339033" className="hover:text-primary transition-colors">+44 1702 339033</a>
              </div>
            </div>
          </div>

          {/* Column 2: Customer Service */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 mb-6">Support</h3>
            <ul className="space-y-4 text-sm text-zinc-500">
              {footerLinks["Customer Service"].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="block py-1.5 transition-colors hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 mb-6">Legal</h3>
            <ul className="space-y-4 text-sm text-zinc-500 mb-8">
              {footerLinks["Legal"].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="block py-1.5 transition-colors hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 text-[10px] font-medium uppercase tracking-widest text-zinc-600 border-t border-zinc-200 pt-6">
              <p>VAT: GB 150696600</p>
              <p>Company No: 07596933</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar (Merged) */}
        <div className="mt-16 pt-8 border-t border-zinc-200 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between text-[11px] font-medium uppercase tracking-widest text-zinc-600">
          <p>
            &copy; {currentYear} Discount Quality Products. All rights reserved.
          </p>

          {/* Accepted Payments & Security Seals */}
          <div className="flex flex-wrap items-center gap-4 text-zinc-300">
            {/* Visa */}
            <svg className="h-3.5 w-auto text-zinc-400 fill-current" viewBox="0 0 24 15">
              <path d="M10.2 1.3l-2.4 8.7-.3-1.4C7.1 7 6 2.3 6 2.3S5.8 1.3 4.5 1.3H1.4l-.1.4c.9.2 1.9.5 2.5 1 .4.3.5.7.4 1.2L2.7 13.7h3.3l5-12.4H10.2zm7.6 7.3c0-2.3-3.2-2.4-3.2-3.4 0-.3.3-.6.9-.6.4 0 1.5.1 2 .4l.2-2.1c-.6-.2-1.5-.4-2.4-.4-2.5 0-4.2 1.3-4.2 3.2 0 2.5 3.5 2.6 3.5 3.9 0 .4-.4.8-1.2.8-1 0-1.8-.4-2.4-.7l-.3 2.2c.7.3 1.9.5 2.8.5 2.6.1 4.3-1.2 4.3-3.3zm5 5.1h2.9L24.2 1.3h-2.6c-.6 0-1 .3-1.2.8L16.2 13.7h3.3l.7-1.8h3.9l.4 1.8zm-3.2-4.1l1.8-4.9.8 4.9h-2.6zm-11.7 4.1l1.8-12.4h3.1L12.1 13.7H7.9z"/>
            </svg>
            {/* Mastercard */}
            <svg className="h-4.5 w-auto text-zinc-400 fill-current" viewBox="0 0 24 15">
              <circle cx="8" cy="7.5" r="7" opacity="0.8"/>
              <circle cx="16" cy="7.5" r="7" opacity="0.8"/>
            </svg>
            {/* PayPal */}
            <svg className="h-4 w-auto text-zinc-400 fill-current" viewBox="0 0 24 15">
              <path d="M20.1 4.7C19.4 2 17 1.3 14 1.3H6.8c-.5 0-.9.4-1 1L3 13.7c-.1.4.2.8.7.8H8l.9-5.9c0-.4.4-.7.8-.7h1.9c3 0 5.4-1.2 6-4.5.3-1.6.1-2.9-.6-3.7z"/>
            </svg>
            {/* Stripe */}
            <svg className="h-4 w-auto text-zinc-400 fill-current" viewBox="0 0 24 15">
              <path d="M12.9 8.2c-.3 0-.6-.1-.7-.3-.1-.2-.1-.4-.1-.7V5.5H14V4.1h-1.9v-2c-.5.1-.9.3-1.3.5v1.5H9.6v1.4H11v4c0 .8.2 1.5.7 1.9.4.4.9.6 1.6.6.3 0 .7 0 .9-.1V8.3c-.2-.1-.5-.1-.8-.1zm-8.8.1c-.2-.2-.2-.5-.2-.8V3h-1.6v1.4H1c.1.4.3.8.5 1v2.1c0 1 .3 1.8.8 2.2.5.4 1.3.6 2.3.6.4 0 .7 0 .9-.1V8.4c-.2.1-.5.1-.7.1s-.6 0-.8-.2zm17-.9c-.1-.7-.4-1.2-1-1.6-.5-.4-1.2-.6-2.1-.6s-1.8.2-2.3.7c-.5.4-.8 1.1-.8 1.9 0 1.4 1.2 2 2.5 2.3 1 .2 1.7.4 1.7.9 0 .3-.3.5-.8.5-.6 0-1.3-.2-1.9-.6l-.6 1.3c.7.4 1.7.7 2.6.7 1.7 0 2.9-.8 2.9-2.1.1-1.3-.9-1.9-2.2-2.2-1.1-.3-1.6-.4-1.6-.9 0-.3.3-.5.7-.5.5 0 1.1.1 1.6.4l.7-1.3z"/>
            </svg>
            <span className="text-zinc-200 select-none">|</span>
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
              <svg className="h-3.5 w-3.5 text-zinc-400 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>SSL Secured</span>
            </div>
          </div>

          <p>
            Engineered by{" "}
            <Link
              href="https://yqwebstudio.com"
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="font-bold text-zinc-900 transition-colors hover:text-primary"
            >
              YQ Web Studio
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
