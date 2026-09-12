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

## 5. `wpFetch` timeout is set to 15 seconds

The Bluehost WordPress backend can be slow. 15s is the safe timeout that prevents
false timeouts from triggering 404/500 errors while remaining acceptable for ISR
first-renders (user only waits once; Vercel CDN caches the result afterward).

Do NOT reduce this below 10s — it causes timeouts that permanently break product pages.

## 6. NEVER call `notFound()` in a `catch` block on product pages

If `getProductBySlug` throws (timeout, network error, 502), the product probably exists
but the backend is temporarily down. Calling `notFound()` in the catch block caches a 404
response on Vercel's CDN for the page's `revalidate` TTL — **permanently breaking** that
product page until the cache expires.

✅ CORRECT — throw the error so Next.js renders a recoverable 500 via `error.tsx`:
```ts
try {
  product = await getProductBySlug(slug);
} catch (error) {
  throw error; // → error.tsx with "Try again" button, NOT cached as 404
}
if (!product) notFound(); // ← Only call notFound() when product genuinely doesn't exist
```

❌ WRONG — caches a 404 for a product that actually exists:
```ts
try {
  product = await getProductBySlug(slug);
} catch (error) {
  notFound(); // ← THIS PERMANENTLY BREAKS PRODUCT PAGES. NEVER DO THIS.
}
```

## 7. ISR writes conservation — do NOT use `revalidateTag("wc-products")` broadly

The `"wc-products"` tag is shared by EVERY cached product data entry. Calling
`revalidateTag("wc-products")` invalidates ALL of them at once, causing thousands
of ISR writes as users revisit those pages. This WILL exceed Vercel's ISR quota.

✅ CORRECT — use per-product tags for targeted invalidation:
```ts
revalidateTag(`product-${slug}`);     // Invalidates 1 product
revalidateTag(`wc-product-${slug}`);  // Invalidates 1 REST cache entry
```

❌ WRONG — nuclear option that burns thousands of ISR writes:
```ts
revalidateTag("wc-products"); // ← INVALIDATES EVERY PRODUCT. DO NOT DO THIS.
```

The `/api/revalidate` endpoint requires explicit tags and will return 400 if called
with no body. This is intentional — it prevents accidental mass invalidation.
<!-- END:performance-rules -->

