// Shown by Next.js while the product page is being fetched (Suspense boundary)
export default function ProductLoading() {
  return (
    <div className="min-h-screen animate-pulse bg-white">
      {/* Breadcrumb skeleton */}
      <div className="border-b border-zinc-100 bg-zinc-50/60">
        <div className="mx-auto max-w-[1440px] 2xl:max-w-[1750px] px-8 py-3 md:px-12 2xl:px-16">
          <div className="h-3 w-48 rounded-full bg-zinc-200" />
        </div>
      </div>

      {/* Back link skeleton */}
      <div className="mx-auto max-w-[1440px] 2xl:max-w-[1750px] px-8 pt-6 md:px-12 2xl:px-16">
        <div className="h-4 w-36 rounded-full bg-zinc-200" />
      </div>

      {/* Body */}
      <div className="mx-auto max-w-[1440px] 2xl:max-w-[1750px] px-8 pb-24 pt-8 md:px-12 2xl:px-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">

          {/* Image skeleton */}
          <div className="aspect-square w-full rounded-2xl bg-zinc-100" />

          {/* Details skeleton */}
          <div className="flex flex-col gap-4 pt-2">
            <div className="h-3 w-20 rounded-full bg-zinc-200" />
            <div className="h-8 w-4/5 rounded-lg bg-zinc-200" />
            <div className="h-8 w-2/5 rounded-lg bg-zinc-300" />
            <div className="h-px w-full bg-zinc-100" />
            <div className="space-y-2.5">
              <div className="h-3.5 w-full rounded-full bg-zinc-100" />
              <div className="h-3.5 w-11/12 rounded-full bg-zinc-100" />
              <div className="h-3.5 w-9/12 rounded-full bg-zinc-100" />
              <div className="h-3.5 w-10/12 rounded-full bg-zinc-100" />
            </div>
            <div className="h-px w-full bg-zinc-100" />
            <div className="flex gap-3">
              <div className="h-12 w-32 rounded-xl bg-zinc-200" />
              <div className="h-12 flex-1 rounded-xl bg-zinc-300" />
            </div>
            <div className="mt-2 rounded-xl border border-zinc-100 bg-zinc-50 p-5 space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-zinc-200" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-32 rounded-full bg-zinc-200" />
                    <div className="h-2.5 w-40 rounded-full bg-zinc-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
