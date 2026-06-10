/**
 * Homepage loading skeleton.
 * Next.js shows this instantly while page.tsx (the async RSC) is fetching data.
 * This replaces the blank white screen that users previously saw on first load.
 */
export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero skeleton */}
      <div className="relative h-[420px] sm:h-[520px] bg-zinc-100 animate-pulse" />

      {/* Bento grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 sm:px-8 py-6 md:px-12">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl bg-zinc-100 animate-pulse" />
        ))}
      </div>

      {/* Featured products skeleton */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 pt-16 pb-8 md:px-12">
        <div className="mb-8">
          <div className="h-9 w-64 rounded-lg bg-zinc-200 animate-pulse" />
          <div className="mt-3 h-5 w-80 rounded bg-zinc-100 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5 xl:gap-x-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col">
              <div className="aspect-square w-full rounded-xl bg-zinc-100 animate-pulse" />
              <div className="flex flex-col pt-4 space-y-2">
                <div className="h-4 w-5/6 rounded bg-zinc-200 animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-zinc-200 animate-pulse" />
                <div className="mt-1 h-4 w-16 rounded bg-zinc-300 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New arrivals skeleton */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 pt-8 pb-24 md:px-12">
        <div className="mb-8">
          <div className="h-9 w-52 rounded-lg bg-zinc-200 animate-pulse" />
          <div className="mt-3 h-5 w-64 rounded bg-zinc-100 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5 xl:gap-x-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col">
              <div className="aspect-square w-full rounded-xl bg-zinc-100 animate-pulse" />
              <div className="flex flex-col pt-4 space-y-2">
                <div className="h-4 w-5/6 rounded bg-zinc-200 animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-zinc-200 animate-pulse" />
                <div className="mt-1 h-4 w-16 rounded bg-zinc-300 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
