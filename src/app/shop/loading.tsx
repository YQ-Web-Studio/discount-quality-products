import { SlidersHorizontal } from "lucide-react";

export default function ShopLoading() {
  return (
    <div className="bg-white min-h-screen">
      {/* ── Top toolbar ── */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="w-full pl-8 pr-8 md:pl-12 md:pr-12 2xl:pl-16 2xl:pr-16">
          <div className="flex items-center justify-between gap-6 pt-5 pb-3">
            <div className="space-y-2">
              {/* Title skeleton */}
              <div className="h-8 w-48 rounded bg-zinc-200 animate-pulse" />
              {/* Product count skeleton */}
              <div className="h-4 w-24 rounded bg-zinc-100 animate-pulse" />
            </div>
          </div>

          <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-2.5 pb-4 flex-wrap">
            {/* Filter buttons skeletons */}
            <div className="h-8 w-24 rounded-full bg-zinc-100 animate-pulse" />
            <div className="h-8 w-32 rounded-full bg-zinc-100 animate-pulse" />
            <div className="h-8 w-28 rounded-full bg-zinc-100 animate-pulse" />
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="w-full pr-8 md:pr-12 2xl:pr-16">
        <div className="flex items-stretch">
          {/* Desktop sidebar skeleton */}
          <aside className="hidden lg:block shrink-0 w-60 mr-10 border-r border-zinc-200/50 bg-zinc-100/50 min-h-[calc(100vh-10rem)]">
            <div className="px-5 py-8 space-y-6 sticky top-32">
              <div className="h-3 w-20 rounded bg-zinc-300 animate-pulse mb-4" />
              <div className="space-y-3">
                <div className="h-5 w-full rounded bg-zinc-200 animate-pulse" />
                <div className="h-5 w-4/5 rounded bg-zinc-200 animate-pulse ml-4" />
                <div className="h-5 w-3/4 rounded bg-zinc-200 animate-pulse ml-4" />
                <div className="h-5 w-5/6 rounded bg-zinc-200 animate-pulse" />
                <div className="h-5 w-5/6 rounded bg-zinc-200 animate-pulse" />
              </div>
            </div>
          </aside>

          {/* Product grid skeleton */}
          <div className="flex-1 flex flex-col py-8 pl-6 lg:pl-12">
            <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 mb-10 xl:gap-x-8">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} className="flex flex-col space-y-4">
                  {/* Image placeholder */}
                  <div className="aspect-square w-full rounded-xl bg-zinc-100 animate-pulse" />
                  {/* Title lines */}
                  <div className="space-y-2">
                    <div className="h-4 w-5/6 rounded bg-zinc-200 animate-pulse" />
                    <div className="h-4 w-2/3 rounded bg-zinc-200 animate-pulse" />
                  </div>
                  {/* Price */}
                  <div className="h-5 w-16 rounded bg-zinc-300 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
