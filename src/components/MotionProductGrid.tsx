"use client";

import { motion, Variants } from "framer-motion";
import { useEffect, useState } from "react";

const gridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

interface MotionProductGridProps {
  children: React.ReactNode;
}

export function MotionProductGrid({ children }: MotionProductGridProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Render a skeleton grid that matches the final height/layout to prevent hydration errors and CLS
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-x-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`skeleton-${i}`} className="flex flex-col">
            <div className="aspect-square w-full rounded-xl bg-zinc-100 animate-pulse" />
            <div className="flex flex-col pt-5">
              <div className="h-3 w-1/3 rounded bg-zinc-100 animate-pulse mb-3" />
              <div className="h-4 w-full rounded bg-zinc-100 animate-pulse mb-2" />
              <div className="h-4 w-2/3 rounded bg-zinc-100 animate-pulse mb-4" />
              <div className="h-5 w-16 rounded bg-zinc-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={gridVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-x-8"
    >
      {children}
    </motion.div>
  );
}
