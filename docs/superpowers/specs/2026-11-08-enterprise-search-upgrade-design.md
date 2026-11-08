# Enterprise Search Architecture & Instant Live Search Design Spec

- **Reference:** Email from David / DQP Search Upgrade
- **Status:** Approved
- **Authors:** Yusuf Qureshi, Antigravity AI
- **Date:** 2026-11-08

---

## 1. Executive Summary & Problem Statement

### 1.1 Issues Addressed
1. **Empty Initial State on Search Open**:
   - Currently, clicking the search bar in the header opens `SearchOverlay.tsx`, presenting an empty state with an icon and placeholder text ("Search our catalogue"). Customers see zero products until they type, creating unnecessary friction.
2. **Slow Live Search Response (Keystroke Latency)**:
   - `/api/search?q=...` queries WordPress via WPGraphQL (`wpFetch`), executing heavy GraphQL schema resolution and multi-table queries on every keystroke. This takes 500ms–2000ms+, causing suggestions to feel sluggish and unresponsive.
3. **Restricted Search Presentation**:
   - The dropdown only displays text strings of product titles as suggestions, with only a single "Best Match" item on the side. High-relevance product matches do not appear directly as clickable product cards (with image, price, title, and direct link to PDP).
   - Suggestions are limited to parsed product titles and fail to suggest relevant multi-product search phrases (e.g. *"fluorescent light bulbs"* is neither a single product title nor an exact category name, yet is a primary search query that should yield multiple items).
4. **Dead-End Zero-Results State on Shop Page (`/shop?q=...`)**:
   - When a customer searches for a query that yields no exact matches, the shop page displays an empty state with a "Clear Search" button. In modern enterprise e-commerce, customers must never be left on a dead-end page.
5. **Vercel Resource & Serverless Constraints**:
   - The catalogue contains 15,000+ products. Attempting to load or index 15,000 full product records into Node.js serverless functions would cause excessive cold starts, exceed Vercel function memory limits (1024MB default / 250MB constrained), and bloat bundle sizes. The solution must run safely within Vercel's Edge/Serverless tiers.

### 1.2 Architectural Target
Upgrade the search system to an enterprise-grade live search subsystem:
1. **Instant Curated Initial State**: Opening the search box instantly displays a curated mix of **Featured & New Arrivals** (4–6 product cards with photo, price, title, and badges) and category shortcuts, pre-cached via `getSmartFeaturedProducts()`.
2. **Sub-80ms Edge Search Pipeline**: Implement a lean WordPress search REST endpoint (`/wp-json/dqp/v1/instant-search`) running an indexed, lightweight SQL query returning only core card attributes (`id`, `title`, `slug`, `price`, `thumbnail`, `category`), served through Next.js on the Edge runtime (`runtime = "edge"`) with Edge CDN caching (`s-maxage=600, stale-while-revalidate=86400`).
3. **Rich Two-Column Live Search Dropdown**:
   - **Left Column**: Department & category matches + synthesized search suggestions (category, tag, and attribute combinations like *"fluorescent light bulbs"*).
   - **Right Column**: 4–6 instant product cards (thumbnail, title, price, badges) linking directly to the product detail page (`/products/[slug]`) + a prominent *"View all X results for '[query]' →"* CTA.
4. **Auto-Broadening & Catalog Fallback on `/shop`**:
   - When an exact search produces 0 results, the system automatically broadens the query (keyword relaxation / partial token matching).
   - If broadened results exist, display them with a clear notice (*“Showing results for ‘[broadened]’. (0 exact matches for ‘[query]’).”*).
   - If still 0 results, display a friendly notice and render the standard catalog product grid so the customer is never stranded.

---

## 2. System Architecture & Data Flow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             Search Overlay Lifecycle                             │
│                                                                                  │
│   1. User clicks Search in Header (Empty Input)                                  │
│      ├── Reads pre-cached Featured & New Arrivals via getSmartFeaturedProducts    │
│      └── Displays instant 4-6 product cards + Quick Category shortcuts (<20ms)   │
│                                                                                  │
│   2. User Types Query (e.g., "light bulb")                                       │
│      ├── Client Debounce (100-120ms)                                             │
│      ├── In-memory client cache check (instant return on backspace)              │
│      └── Fetch /api/search?q=light+bulb (AbortController cancels stale requests) │
│                                                                                  │
│   3. Next.js Edge Runtime (/api/search)                                          │
│      ├── Vercel Edge Cache hit? ──► Return cached JSON (<15ms)                   │
│      └── Edge Cache miss:                                                        │
│            Call WordPress /wp-json/dqp/v1/instant-search?q=... (~50ms)           │
│            Synthesize:                                                           │
│              a. Category matches (local config + WP categories)                  │
│              b. Dynamic phrase suggestions (token/attribute n-grams)             │
│              c. Product cards (id, name, slug, price, imageUrl)                  │
│            Set Cache-Control: s-maxage=600, stale-while-revalidate=86400         │
│                                                                                  │
│   4. Live Search UI Render                                                       │
│      ├── Left Column: Matching Categories + Query Suggestions                    │
│      └── Right Column: 4-6 Clickable Product Cards (→ PDP) + View All CTA        │
└──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│                        Shop Page Zero-Results Fallback                           │
│                                                                                  │
│   Customer navigates to /shop?q=rare+obscure+bulb+100w                           │
│      ├── 1. Exact query search on WooCommerce                                    │
│      │     └── If results found ──► Render matched product grid                  │
│      │                                                                           │
│      └── 2. Zero results returned:                                               │
│            ├── Auto-broaden query: strip stop-words, match broad tokens ("bulb") │
│            ├── If broadened query matches products:                              │
│            │     Display banner: "Showing results for 'bulb' (0 exact matches)"  │
│            │     Render broadened product grid                                   │
│            └── If broadened query still 0 results:                               │
│                  Display banner: "No products found matching query.              │
│                                   Showing our popular catalogue below:"          │
│                  Render standard popular/catalog product grid                    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Specifications

### 3.1 WordPress Lean Search Endpoint
**File:** `backend/wordpress/snippets/004-instant-search-endpoint.php`
- **Route:** `GET /wp-json/dqp/v1/instant-search`
- **Parameters:** `q` (string, required, sanitized), `limit` (int, default 8, max 12)
- **Execution:**
  - Performs an optimized, indexed direct SQL query against `wp_posts` and `wp_postmeta` (bypassing WPGraphQL and full WP_Query overhead).
  - Selects only: `ID`, `post_title`, `post_name`, `meta_price`, `meta_thumbnail_id`, and primary category taxonomy terms.
  - Resolves thumbnail URLs via direct attachment metadata or `wp_get_attachment_image_url(..., 'medium')`.
  - Enforces `post_status = 'publish'` and WooCommerce visibility `exclude-from-search` exclusion.
  - Queries matching `product_cat` terms using `LIKE` / `slug` matching.
  - Returns compact JSON:
    ```json
    {
      "products": [
        {
          "id": 1234,
          "name": "Osram 18W CFL Fluorescent Tube",
          "slug": "osram-18w-cfl-fluorescent-tube",
          "price": "£4.99",
          "imageUrl": "https://.../img.jpg",
          "category": "Light Bulbs"
        }
      ],
      "categories": [
        { "id": 45, "name": "Light Bulbs", "slug": "light-bulbs" }
      ]
    }
    ```
- **Execution Time:** ~30–60ms on WordPress server.

### 3.2 Next.js Edge Search API Route
**File:** `src/app/api/search/route.ts`
- **Runtime:** `export const runtime = "edge";`
- **Responsibilities:**
  1. Sanitize incoming `q` parameter (stripping SQL / regex control characters, min length 2, max length 60).
  2. Query `GET /wp-json/dqp/v1/instant-search?q=...` with a strict 3-second timeout.
  3. Dynamic Phrase Suggestion Extraction:
     - Combine matching category names, product attributes, and token n-grams from the returned products.
     - Generate query suggestions that represent broader or related searches (e.g. *"fluorescent light bulbs"*, *"cfl light bulbs"*) without duplicating the raw input query.
  4. Response Structure:
     ```typescript
     export interface InstantSearchResponse {
       products: {
         id: string | number;
         name: string;
         slug: string;
         price: string;
         imageUrl: string | null;
         category?: string;
       }[];
       categories: {
         id: string;
         name: string;
         slug: string;
         parentName?: string | null;
         route: string;
       }[];
       suggestions: string[];
     }
     ```
  5. Caching Headers:
     `Cache-Control: public, s-maxage=600, stale-while-revalidate=86400`
  6. Memory Footprint: Minimal (<5MB on Vercel Edge).

### 3.3 Search Overlay UI Redesign
**File:** `src/components/SearchOverlay.tsx`
- **Initial State (Empty Input):**
  - Displays a dedicated header: *"Featured & Trending Products"*.
  - Renders a 4-to-6 product card grid showcasing curated items from `getSmartFeaturedProducts()`.
  - Displays quick-access Category chips across the top/side so users can immediately jump to popular departments.
- **Active Search State (While Typing):**
  - **Left Column (width ~38%):**
    - **Categories & Departments**: Top 3–4 matching categories (local + remote) with navigation icons.
    - **Search Suggestions**: Top 4–5 synthesized query phrases. Clicking navigates to `/shop?q=${suggestion}`.
  - **Right Column (width ~62%):**
    - **Matching Products**: Grid of up to 6 product cards with image, decoded title, formatted price, and stock status. Clicking navigates directly to `/products/${product.slug}`.
    - **Bottom CTA**: *"View all results for '[query]' →"* linking to `/shop?q=${query}`.
- **Micro-Interactions & Performance:**
  - Client-side LRU memory cache (`searchCache.current[query]`) for instant 0ms backspace navigation.
  - AbortController on every keystroke to eliminate stale race conditions.
  - High-performance keyboard navigation (Escape to close, Enter to submit full shop search).

### 3.4 Zero-Results Auto-Broadening & Catalog Fallback on Shop Page
**Files:** `src/app/shop/page.tsx`, `src/app/shop/SearchHub.tsx`
- **Logic:**
  1. When `searchQ` is provided:
     - If the initial `fetchWooCommerceProducts({ search: searchQ })` returns `total === 0`:
     - Tokenize `searchQ` into individual terms, drop stop-words (e.g. "a", "the", "in", "of", "pack"), and attempt a broadened query (e.g. the primary noun or first 2 significant keywords).
     - If the broadened query returns products:
       - Set `isBroadened = true` and `broadenedTerm = broadened`.
       - Render the broadened product list.
       - Display a distinctive banner:
         > **Notice:** No exact matches found for **"{initialQuery}"**. Showing results for **"{broadenedTerm}"** instead.
     - If the broadened query also returns 0 products:
       - Fetch default popular/catalog products (page 1, ordered by date/popularity).
       - Set `isFallbackCatalog = true`.
       - Display a prominent, friendly message:
         > **Notice:** We couldn't find any products matching **"{initialQuery}"**. Browse our popular catalogue below or try another search:
       - Render the full catalog grid with category filters so the customer can continue shopping seamlessly.

---

## 4. Vercel Resource Limits & Performance Verification

| Resource | Vercel Limit | DQP Architecture Usage | Margin / Safety |
| :--- | :--- | :--- | :--- |
| **Serverless Function Memory** | 1024 MB (default) | Not used for live search (uses Edge runtime: < 5 MB) | >99% headroom |
| **Edge Function Memory** | 128 MB | ~5 MB | >95% headroom |
| **Edge Function Execution Time** | 30 seconds | 40–120 ms | >99% headroom |
| **Client Bundle Size** | < 250 KB ideal | +~6 KB (lean component update, zero heavy search libraries) | Nominal |
| **CDN Cache Invalidation** | On product update | Triggered via existing `/api/revalidate` tag `wc-products` | Standard |

---

## 5. Testing & Quality Assurance Plan

1. **Unit Tests (`src/tests/unit/search-system.test.ts`)**:
   - Test sanitization of edge cases (symbols, punctuation, empty strings, SQL injection attempts).
   - Test dynamic phrase suggestion extraction (combining tokens, attributes, avoiding single-product title exact echo).
   - Test search overlay state transitions (empty input -> featured products; typing -> categories + suggestions + products).
2. **Shop Page Fallback Tests (`src/tests/unit/shop-zero-results.test.ts`)**:
   - Test query auto-broadening when exact search returns 0 products.
   - Test fallback to popular catalog products when even broadened query returns 0.
   - Verify banners display appropriate user feedback and prevent dead-end views.
3. **Integration & Edge Compatibility**:
   - Verify `/api/search` runs without error in Edge runtime environment.
   - Benchmark live search API response latency (<100ms cold, <20ms warm edge cache).
