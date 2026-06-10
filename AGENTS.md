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

The reason this exists: pre-rendering ALL 14,000+ products would make builds take hours.
We only pre-render the ~12 products on the homepage. All others use ISR (on-demand + cached).

## 2. Shop/category pages: do NOT add a second `fetchAllCandidateProducts` call for filter data

The filter modal reuses the main product response when no attribute filters are active.
Adding a parallel `fetchAllCandidateProducts(filterProductParams)` at all times burns up to
3 extra WooCommerce API calls per page load. The current code handles this correctly.

## 3. `wpFetch` timeout must be dynamic

During build: 30s (WordPress is slow, build must not fail)
During runtime: 10s (fail fast so users don't wait forever)
Do NOT set a single fixed timeout of 6s or less — it breaks builds.
<!-- END:performance-rules -->
