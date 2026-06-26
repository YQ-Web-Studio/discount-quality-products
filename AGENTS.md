<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:performance-rules — DO NOT REMOVE OR OVERRIDE -->
# ⚠️ CRITICAL PERFORMANCE RULES — READ BEFORE TOUCHING ANY PAGE FILE

## 1. `generateStaticParams` in `/products/[slug]/page.tsx` MUST NOT return `[]`

The function MUST fetch and return the homepage featured + new arrivals product slugs.
Returning `[]` means ZERO product pages are pre-rendered — every PDP becomes a slow SSR
request hitting the Bluehost/WordPress server (~2-3s per page load). This is UNACCEPTABLE.

✅ CORRECT — keeps homepage PDPs instant (served from Vercel edge CDN):
```ts
export async function generateStaticParams() {
  try {
    const [featuredProducts, newArrivals] = await Promise.allSettled([
      getSmartFeaturedProducts(),
      getLatestProducts(6),
    ]);
    const slugSet = new Set<string>();
    if (featuredProducts.status === 'fulfilled') featuredProducts.value.forEach(p => slugSet.add(p.slug));
    if (newArrivals.status === 'fulfilled') newArrivals.value.forEach(p => slugSet.add(p.slug));
    return Array.from(slugSet).map(slug => ({ slug }));
  } catch {
    return [];
  }
}
```

❌ WRONG — makes every PDP slow. NEVER do this:
```ts
export async function generateStaticParams() {
  return []; // ← THIS DESTROYS PERFORMANCE. DO NOT DO THIS.
}
```

The reason: pre-rendering ALL 13,000+ products would make builds take hours.
We only pre-render the ~12 products on the homepage. All others use ISR (on-demand + cached).

## 2. Category/shop pages CANNOT be pre-rendered — this is a Next.js architectural constraint

`/categories/[slug]/page.tsx` and `/shop/page.tsx` are `ƒ Dynamic` and MUST stay that way.
This is NOT a bug. It is a hard Next.js constraint:

> In Next.js App Router, if ANY server component in a route reads `searchParams`,
> the ENTIRE route is marked dynamic (never pre-rendered), regardless of
> `generateStaticParams`.

Both pages handle filtering, pagination, and sorting via searchParams → always dynamic.
Do NOT attempt to "fix" this by removing searchParams handling — that breaks filtering.

What IS already optimised for these pages:
- `loading.tsx` skeleton streams to the browser IMMEDIATELY (instant visual feedback)
- Category slug → WooCommerce ID resolution uses `navigationCategories` (instant, no API call)
- `/shop` with no category filter: products fetch IMMEDIATELY without waiting for categories
- Only 1 WooCommerce API call per page load (not 2–6 as before)

## 3. `generateStaticParams` in `/categories/[slug]/page.tsx` MUST use `navigationCategories`

❌ WRONG — calls WooCommerce API at build time, times out on slow Bluehost server:
```ts
export async function generateStaticParams() {
  const cats = await getCategories(); // WooCommerce API — TIMES OUT during build!
  return cats.map(c => ({ slug: c.slug }));
}
```

✅ CORRECT — instant, zero API calls, build always succeeds:
```ts
export function generateStaticParams() {
  const slugs: { slug: string }[] = [];
  navigationCategories.forEach(cat => {
    slugs.push({ slug: cat.slug });
    cat.subcategories?.forEach(sub => slugs.push({ slug: sub.slug }));
  });
  return slugs;
}
```

## 4. Shop/category pages: do NOT add a second `fetchAllCandidateProducts` call for filter data

The filter modal reuses the main product response when no attribute filters are active.
Adding a parallel `fetchAllCandidateProducts(filterProductParams)` at all times burns up to
3 extra WooCommerce API calls per page load. The current code handles this correctly.

## 5. `wpFetch` timeout must be dynamic

During build: 30s (WordPress is slow, build must not fail)
During runtime: 10s (fail fast so users don't wait forever)
Do NOT set a single fixed timeout of 6s or less — it breaks builds.
<!-- END:performance-rules -->
