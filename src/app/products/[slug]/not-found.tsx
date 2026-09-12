import Link from 'next/link';

export default function ProductNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-6xl font-extrabold text-zinc-200">404</div>
        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
          Product not found
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          This product may have been removed or is temporarily unavailable.
          If you arrived here from a search engine or bookmark, the listing
          may have been updated.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700"
          >
            Browse all products
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            Search the shop
          </Link>
        </div>

        <p className="mt-6 text-xs text-zinc-400">
          If you believe this is an error, please{' '}
          <Link href="/contact" className="underline hover:text-zinc-600">
            contact us
          </Link>{' '}
          and we&apos;ll look into it.
        </p>
      </div>
    </div>
  );
}
