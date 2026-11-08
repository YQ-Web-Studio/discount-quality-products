# Enterprise Search Architecture & Instant Live Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the search system into an enterprise-grade live search experience: display a curated mix of featured/new products when opened, deliver sub-80ms live results as you type via a lean WordPress endpoint and Edge runtime, present a unified single-column stream sorted by relevance with direct product PDP links and query suggestions (e.g., *"fluorescent light bulbs"*), and eliminate dead-end zero-result pages on `/shop` via query auto-broadening and catalog fallback.

**Architecture:** Next.js Edge API route (`/api/search`) proxies a dedicated, indexed WordPress SQL endpoint (`/wp-json/dqp/v1/instant-search`) with fallback to GraphQL during rollout. Dynamic phrase extraction synthesizes multi-product query suggestions from attributes and tokens. `SearchOverlay.tsx` renders a pre-cached curated product mix when empty, and a unified relevance-sorted stream while typing. `SearchHub.tsx` auto-broadens zero-result queries and falls back to popular catalog products.

**Tech Stack:** Next.js (App Router, Edge Runtime), React 19, TypeScript, WordPress / WooCommerce REST API, Vitest.

**Spec:** [docs/superpowers/specs/2026-11-08-enterprise-search-upgrade-design.md](file:///c:/Development/DQP/discount-products-store/docs/superpowers/specs/2026-11-08-enterprise-search-upgrade-design.md)

## Global Constraints

- **Commit Format:** `[DQP] type(scope): description` (e.g. `[DQP] feat(search): implement dynamic phrase suggestion extractor`)
- **Vercel Limits:** Must run inside Vercel Edge Runtime (`< 128MB RAM`) without loading 15,000+ items into Node serverless memory.
- **Test Coverage:** All new utilities, search routes, and fallback states must have unit tests with >=80% coverage.
- **Zero Regressions:** Existing navigation categories, URL parameters (`/shop?q=...`), and filters must continue functioning seamlessly.

---

### Task 1: WordPress Lean Instant-Search Endpoint Snippet

**Files:**
- Create: `backend/wordpress/snippets/004-instant-search-endpoint.php`
- Modify: `backend/wordpress/snippets/README.md`
- Test: `src/tests/unit/wp-instant-search-snippet.test.ts`

**Interfaces:**
- Consumes: WordPress database tables (`wp_posts`, `wp_postmeta`, `wp_term_relationships`, `wp_terms`)
- Produces: `GET /wp-json/dqp/v1/instant-search?q={query}&limit={limit}` returning `{ products: [...], categories: [...] }` in <60ms

- [ ] **Step 1: Write unit test validating SQL query construction, escaping, and response mapping**
Create `src/tests/unit/wp-instant-search-snippet.test.ts` testing query sanitization, parameter bounds (`limit` 1–12), price formatting, and image resolution logic.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/tests/unit/wp-instant-search-snippet.test.ts`
Expected: FAIL (file does not exist).

- [ ] **Step 3: Implement `backend/wordpress/snippets/004-instant-search-endpoint.php`**
Implement the WordPress REST endpoint:
1. Register `dqp/v1/instant-search` route using `rest_framework`.
2. Sanitize `q` (strip tags, trim, min 2 chars).
3. Use `$wpdb->prepare` with indexed `post_title LIKE %...%` on published `product` post types.
4. Join `wp_postmeta` for `_price` and `_thumbnail_id`.
5. Join categories for matching product categories.
6. Return compact payload: `{ products: [{ id, name, slug, price, imageUrl, category }], categories: [{ id, name, slug }] }`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/tests/unit/wp-instant-search-snippet.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add backend/wordpress/snippets/004-instant-search-endpoint.php backend/wordpress/snippets/README.md src/tests/unit/wp-instant-search-snippet.test.ts
git commit -m "[DQP] feat(wordpress): add lean instant-search rest endpoint snippet"
```

---

### Task 2: Dynamic Search Phrase & Suggestion Extractor

**Files:**
- Create: `src/lib/search-phrases.ts`
- Test: `src/tests/unit/search-phrases.test.ts`

**Interfaces:**
- Consumes: Raw user query `string`, product list `UnifiedProductItem[]`, category list `CategoryItem[]`
- Produces: `extractSearchSuggestions(query, products, categories): string[]` returning high-intent phrases (e.g. *"fluorescent light bulbs"*) without repeating exact single-product titles.

- [ ] **Step 1: Write unit test for phrase extraction**
Create `src/tests/unit/search-phrases.test.ts` testing:
1. Extraction of meaningful adjective + category pairs (e.g. "fluorescent light bulbs", "led daylight bulb").
2. Stripping noise suffixes ("pack of 10", "issue 4", "[box of 5]").
3. Capitalization and deduplication.
4. Avoiding exact echo of single long product titles.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/tests/unit/search-phrases.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/search-phrases.ts`**
Implement:
1. Tokenizer and stop-word filter.
2. N-gram pattern builder combining query tokens with product attributes and category names.
3. Ranking by frequency across returned items.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/tests/unit/search-phrases.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/search-phrases.ts src/tests/unit/search-phrases.test.ts
git commit -m "[DQP] feat(search): implement dynamic phrase and suggestion extractor"
```

---

### Task 3: Next.js Edge Search API Route

**Files:**
- Modify: `src/app/api/search/route.ts`
- Test: `src/tests/unit/search-api.test.ts`

**Interfaces:**
- Consumes: `GET /api/search?q={query}`
- Produces: `InstantSearchResponse` with `{ products, categories, suggestions }`, edge runtime, and `Cache-Control` headers.

- [ ] **Step 1: Write unit test for search route**
Create `src/tests/unit/search-api.test.ts` testing:
1. Rejection of queries < 2 characters with empty response `[]`.
2. Calling lean endpoint with 3s timeout.
3. Fallback to WPGraphQL `searchProducts` if lean endpoint is unreachable.
4. Response shape containing `products`, `categories`, and `suggestions`.
5. Presence of `Cache-Control: public, s-maxage=600, stale-while-revalidate=86400`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/tests/unit/search-api.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/app/api/search/route.ts`**
Refactor `src/app/api/search/route.ts`:
1. Set `export const runtime = "edge";`
2. Validate and sanitize query string.
3. Fetch `/wp-json/dqp/v1/instant-search` with `AbortSignal.timeout(3000)`.
4. Fallback gracefully to existing `searchProducts` GraphQL if endpoint is inactive.
5. Run `extractSearchSuggestions` to assemble dynamic suggestions.
6. Return `NextResponse.json` with Cache-Control headers.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/tests/unit/search-api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/app/api/search/route.ts src/tests/unit/search-api.test.ts
git commit -m "[DQP] feat(api): upgrade search route to edge runtime with fallback"
```

---

### Task 4: Search Overlay UI Redesign with Curated Initial State & Single-Column Stream

**Files:**
- Modify: `src/components/SearchOverlay.tsx`
- Modify: `src/lib/wordpress.ts` (export lightweight helper if needed for initial featured items)
- Test: `src/tests/unit/search-overlay.test.ts`

**Interfaces:**
- Consumes: `useSearchStore`, `/api/search?q=...`, pre-cached `getSmartFeaturedProducts()`
- Produces: Fast modal displaying curated products when opened, and a unified single-column stream sorted by relevance when typing.

- [ ] **Step 1: Write unit test for SearchOverlay component states**
Create `src/tests/unit/search-overlay.test.ts` testing:
1. Initial empty state renders category shortcuts and curated products.
2. Typing triggers debounced fetch with AbortController.
3. Results render in single unified stream: Categories -> Suggestions -> Products -> View All.
4. Product click triggers navigation directly to `/products/[slug]`.
5. Suggestion click triggers navigation to `/shop?q=[suggestion]`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/tests/unit/search-overlay.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement unified single-column layout in `SearchOverlay.tsx`**
1. Add initial state with `featuredProducts` loaded on mount or passed from store/props.
2. Render category chips and curated 4-6 product cards when `inputValue === ""`.
3. When `inputValue.length >= 2`, render single-column stream:
   - Section 1: Matching Category rows (with tag icon and path).
   - Section 2: Suggested query phrases (with search icon).
   - Section 3: Matching Products (streamlined cards with thumbnail, decoded title, category pill, formatted price, linking to PDP).
   - Section 4: "Search for '[query]' (View all results) →" CTA.
4. Maintain keyboard shortcuts (Esc, Enter) and 0ms in-memory client backspace caching.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/tests/unit/search-overlay.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/SearchOverlay.tsx src/tests/unit/search-overlay.test.ts
git commit -m "[DQP] feat(search): redesign search overlay with curated open state and single-column stream"
```

---

### Task 5: Shop Page Zero-Results Auto-Broadening & Catalog Fallback

**Files:**
- Modify: `src/app/shop/page.tsx`
- Modify: `src/app/shop/SearchHub.tsx`
- Test: `src/tests/unit/shop-zero-results.test.ts`

**Interfaces:**
- Consumes: `/shop?q=...`
- Produces: Auto-broadened search query on 0 results, and popular catalog fallback with clear notice banners so page is never empty.

- [ ] **Step 1: Write unit test for zero-results auto-broadening and fallback**
Create `src/tests/unit/shop-zero-results.test.ts` testing:
1. Exact match returns results as normal without banner.
2. Exact match 0 results + broadened match > 0 displays broadened results with informative notice.
3. Broadened match 0 results fetches popular catalog items with friendly notice.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/tests/unit/shop-zero-results.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement multi-tier search fallback in `page.tsx` and `SearchHub.tsx`**
1. In `src/app/shop/page.tsx`:
   - If `searchQ` provided and `mainResponse.total === 0`:
   - Create broadened search term by removing stop-words and selecting broad tokens.
   - If broadened search returns products, pass `broadenedQuery` to `SearchHub`.
   - If still 0 products, fetch page 1 of default popular catalog products and pass `isFallbackCatalog: true`.
2. In `src/app/shop/SearchHub.tsx`:
   - Render informative banner when `broadenedQuery` is active.
   - Render friendly notice banner when `isFallbackCatalog` is active, allowing users to browse products seamlessly.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/tests/unit/shop-zero-results.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/app/shop/page.tsx src/app/shop/SearchHub.tsx src/tests/unit/shop-zero-results.test.ts
git commit -m "[DQP] feat(shop): implement zero-results auto-broadening and catalog fallback"
```

---

### Task 6: Full Verification & Quality Assurance Gate

**Files:**
- All modified files

- [ ] **Step 1: Run complete test suite**
Run: `npm test`
Expected: All unit and integration tests PASS.

- [ ] **Step 2: Run TypeScript typecheck**
Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Run linter**
Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit and finalize branch**
```bash
git commit --allow-empty -m "[DQP] chore(search): verify test suite and enterprise search pipeline"
```
