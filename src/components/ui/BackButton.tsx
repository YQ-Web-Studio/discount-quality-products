'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    router.back();
  };

  return (
    <button
      onClick={handleBack}
      id="pdp-back-link"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 w-fit cursor-pointer bg-transparent border-none p-0 outline-none"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}
