"use client";

import { ArrowRight, Truck, ShieldCheck, RotateCcw, Award } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { generateSeoAltText } from "@/lib/seo-utils";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const childVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  },
};

const trustSignals = [
  { icon: Truck, title: "Worldwide Shipping", desc: "Fast International Delivery" },
  { icon: ShieldCheck, title: "Secure Payments", desc: "Fully encrypted checkout" },
  { icon: RotateCcw, title: "Hassle-Free Returns", desc: "30-day money back" },
];

export function HeroSection() {
  return (
    <section className="relative z-30 bg-zinc-900 h-[300px] lg:h-[60vh]">
      {/* Background Hero Image with its own clipping */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Mobile Background Hero Image */}
        <Image
          src="/images/hero-v3.png"
          alt={generateSeoAltText("Storefront Hero Mobile", "Home")}
          fill
          priority
          fetchPriority="high"
          className="object-cover object-center opacity-50 md:hidden"
        />
        {/* Desktop Background Hero Image */}
        <Image
          src="/images/hero-v5.png"
          alt={generateSeoAltText("Storefront Hero Desktop", "Home")}
          fill
          priority
          fetchPriority="high"
          className="hidden md:block object-cover object-center opacity-60"
        />
        {/* Solid Dark Overlay for clean contrast */}
        <div className="absolute inset-0 bg-black/50 md:bg-black/40" />
      </div>

      {/* Centered Content Overlay */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center pb-10 md:pb-0 lg:pb-10 2xl:pb-0">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl space-y-4 md:space-y-6 2xl:space-y-10"
        >
          <motion.div variants={childVariants} className="space-y-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl 2xl:text-7xl drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
              12,000+ Products.<br />
              Discounted <span className="text-primary italic">Prices.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-base font-medium text-zinc-200 sm:text-xl 2xl:text-2xl px-4 sm:px-0 hidden sm:block">
              Premium lighting, computer hardware, magazines, collectibles & more.
            </p>
          </motion.div>

          <motion.div variants={childVariants} className="pt-1 md:pt-2 2xl:pt-6">
            <Link
              href="/shop"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 bg-primary/95 px-8 text-base font-black uppercase tracking-widest text-white shadow-[0_0_30px_-5px_rgba(21,128,61,0.5)] backdrop-blur-md transition-all hover:bg-primary hover:scale-105 hover:border-white/30 hover:shadow-[0_0_40px_-5px_rgba(21,128,61,0.6)] active:scale-95 lg:h-14 lg:px-10 lg:text-lg 2xl:h-16 2xl:px-12 2xl:text-xl"
            >
              Shop Now
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Full-width Marginless Trust Badge Strip — High contrast, minimalist size */}
      <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/60 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-around gap-2 px-4 py-2.5 md:justify-between md:gap-8 md:px-10 md:py-3 2xl:py-5">
          {trustSignals.map((s) => (
            <div key={s.title} className="flex flex-col items-center gap-1 md:flex-row md:gap-3">
              <s.icon className="h-4 w-4 text-primary md:h-5 md:w-5" />
              <div className="flex flex-col text-center md:text-left">
                <p className="text-[8px] font-black uppercase tracking-widest text-white md:text-[10px]">{s.title}</p>
                <p className="hidden text-[10px] font-medium text-zinc-400 md:block">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
