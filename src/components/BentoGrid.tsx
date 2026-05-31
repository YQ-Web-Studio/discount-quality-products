"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { navigationCategories } from "@/lib/navigationConfig";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const gridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const tileVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 } 
  },
};

/**
 * Presentation-only data that lives here (images, grid spans).
 * All category/subcategory data comes from navigationConfig.
 */
const bentoMeta: Record<string, { image: string; className: string }> = {
  computing:     { image: "/images/bento/computing_modern_v2.png",             className: "md:col-span-2 md:row-span-2 lg:col-span-1 lg:row-span-1" },
  electrical:    { image: "/images/bento/electrical_modern_v2.png", className: "md:col-span-1 md:row-span-1" },
  media:         { image: "/images/bento/media_modern_v2.png",       className: "md:col-span-1 md:row-span-1" },
  collectibles:  { image: "/images/bento/collectibles_composite.png",          className: "md:col-span-1 md:row-span-1" },
  miscellaneous: { image: "/images/bento/miscellaneous_light.png",   className: "md:col-span-1 md:row-span-1" },
};

/* Render order for the bento grid — independent of nav menu order */
const bentoOrder = ["electrical", "computing", "media", "collectibles", "miscellaneous"];

export function BentoGrid() {
  const sortedCategories = bentoOrder
    .map((slug) => navigationCategories.find((c) => c.slug === slug))
    .filter(Boolean) as typeof navigationCategories;

  return (
    <section id="categories" className="bg-white pt-12 pb-0 md:pt-16 md:pb-0 lg:pt-12 lg:pb-0 2xl:pt-24 scroll-mt-32">
      <div className="mx-auto max-w-[1440px] 2xl:max-w-[1750px] px-4 sm:px-8 md:px-12 2xl:px-16">
        <div className="mb-8 flex items-end justify-between">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Shop by Category
            </h2>
            <p className="max-w-xl text-zinc-500">
              Explore our massive catalogue through our most popular departments.
            </p>
          </div>
          <Link
            href="/shop"
            className="hidden items-center gap-2 text-sm font-bold text-zinc-900 hover:underline sm:flex"
          >
            View All Categories <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <motion.div 
          className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-5 auto-rows-[200px] md:auto-rows-auto"
          variants={gridVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {sortedCategories.map((category, index) => {
            const meta = bentoMeta[category.slug];
            if (!meta) return null;

            return (
              <motion.div
                key={category.slug}
                layoutId={`category-tile-${category.slug}`}
                variants={tileVariants}
                whileHover={{ scale: 1.02 }}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-3xl bg-zinc-900 transition-shadow hover:shadow-2xl md:aspect-square",
                  meta.className
                )}
              >
                {/* Background image (scales on hover) */}
                <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                  <Image
                    src={meta.image}
                    alt={category.label}
                    fill
                    priority={index < 3}
                    sizes={
                      category.slug === "computing"
                        ? "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 20vw"
                        : "(max-width: 768px) 100vw, (max-width: 1024px) 25vw, 20vw"
                    }
                    className="object-cover object-center transition-all duration-500 group-hover:blur-sm"
                  />
                </div>

                {/* Bottom gradient — always visible, sits above image */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent z-10 pointer-events-none transition-opacity duration-500" />

                {/* Solid colour overlay — appears on hover, sits above gradient */}
                <div
                  className={`absolute inset-0 bg-black/0 transition-colors duration-500 ${category.hoverOverlay} z-20 pointer-events-none`}
                />

                {/* Full-coverage background link (z-10 + sr-only label) */}
                <Link
                  href={`/categories/${category.slug}`}
                  className="absolute inset-0 z-10"
                  aria-label={`Browse ${category.label}`}
                />

                {/* Content layer */}
                <div className="relative z-30 mt-auto flex flex-col p-6 text-white h-full justify-end pointer-events-none">
                  <h3
                    className={cn(
                      "font-black leading-tight tracking-tight drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] text-white/90 transition-colors duration-500 group-hover:text-white text-xl md:text-2xl lg:text-3xl",
                      category.slug === 'computing' && "md:text-5xl lg:text-3xl"
                    )}
                  >
                    {category.label}
                  </h3>

                  {/* Expanding panel — description + subcategory quick-links */}
                  <div className="grid transition-all duration-500 ease-in-out grid-rows-[0fr] group-hover:grid-rows-[1fr]">
                    <div className="overflow-hidden">
                      {/* Subcategory quick-links — pointer-events re-enabled here */}
                      <div className="pt-3 flex flex-col items-start gap-2 pointer-events-auto">
                        {category.subcategories.map((sub) => (
                          <Link
                            key={sub.slug}
                            href={`/categories/${category.slug}?category=${sub.slug}`}
                            className="rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1.5 text-xs text-white font-medium hover:bg-white hover:text-zinc-900 transition-all duration-200 whitespace-normal text-left"
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Arrow button */}
                  <div className="mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition-all inset-0 group-hover:bg-white group-hover:text-black shrink-0">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
