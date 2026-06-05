"use client";

import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";

const footerLinks = {
  "Customer Service": [
    { label: "Contact Us", href: "/contact" },
    { label: "Order Tracking", href: "/track" },
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
              Your destination for premium lighting, electric fittings, computing, rare coins & stamps, DVDs, and books. We deliver exceptional value and reliable shipping worldwide from the UK.
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
                <a href="mailto:sales@discountproducts.co.uk" className="hover:text-primary transition-colors">sales@discountproducts.co.uk</a>
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
            <div className="flex flex-col gap-2 text-[10px] font-medium uppercase tracking-widest text-zinc-400 border-t border-zinc-200 pt-6 opacity-80">
              <p>VAT: GB 150696600</p>
              <p>Company No: 07596933</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar (Merged) */}
        <div className="mt-16 pt-8 border-t border-zinc-200 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-[11px] font-medium uppercase tracking-widest text-zinc-400">
          <p>
            &copy; {currentYear} Discount Quality Products. All rights reserved.
          </p>
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
