'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ProductPage] Error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-6xl font-extrabold text-zinc-200">⚡</div>
        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
          Temporarily unavailable
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          We&apos;re having trouble loading this product right now. This is
          usually a temporary issue — please try again in a moment.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            Browse all products
          </Link>
        </div>

        <p className="mt-6 text-xs text-zinc-400">
          If the problem persists, please{' '}
          <Link href="/contact" className="underline hover:text-zinc-600">
            contact us
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
