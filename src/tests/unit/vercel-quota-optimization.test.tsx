import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';

const routerPrefetchMock = vi.fn();
const routerPushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    prefetch: routerPrefetchMock,
    push: routerPushMock,
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  notFound: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { alt, src } = props;
    return React.createElement('img', { alt: String(alt ?? ''), src: String(src ?? '') });
  },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', rest, children),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
}));

vi.mock('@next/third-parties/google', () => ({
  sendGAEvent: vi.fn(),
}));

const repoRoot = process.cwd();

describe('DQP-17: Vercel ISR Write, Fluid CPU & Origin Transfer Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    document.cookie = 'dqp_logged_in=; Max-Age=0; path=/';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Route Revalidation & Cache Tag Isolation', () => {
    it('RootLayout does not call getDynamicProductCountLabel or getTotalProductCount', () => {
      const layoutSrc = fs.readFileSync(path.join(repoRoot, 'src/app/layout.tsx'), 'utf8');
      expect(layoutSrc).not.toContain('getDynamicProductCountLabel');
      expect(layoutSrc).not.toContain('getTotalProductCount');
      expect(layoutSrc).toContain('PRODUCT_COUNT_LABEL');
    });

    it('Product PDP, Guides index, and Guide detail routes export revalidate = false', () => {
      const pdpSrc = fs.readFileSync(path.join(repoRoot, 'src/app/products/[slug]/page.tsx'), 'utf8');
      const guidesSrc = fs.readFileSync(path.join(repoRoot, 'src/app/guides/page.tsx'), 'utf8');
      const guideSlugSrc = fs.readFileSync(path.join(repoRoot, 'src/app/guides/[slug]/page.tsx'), 'utf8');

      expect(pdpSrc).toMatch(/export\s+const\s+revalidate\s*=\s*false\s*;/);
      expect(guidesSrc).toMatch(/export\s+const\s+revalidate\s*=\s*false\s*;/);
      expect(guideSlugSrc).toMatch(/export\s+const\s+revalidate\s*=\s*false\s*;/);
    });

    it('PDP generateStaticParams pre-renders featured and latest product slugs per AGENTS.md Rule 1', () => {
      const pdpSrc = fs.readFileSync(path.join(repoRoot, 'src/app/products/[slug]/page.tsx'), 'utf8');
      expect(pdpSrc).toContain('getSmartFeaturedProducts()');
      expect(pdpSrc).toContain('getLatestProducts(6)');
    });

    it('getTotalProductCount uses 30-day revalidate and isolated tag without wc-products', () => {
      const wpSrc = fs.readFileSync(path.join(repoRoot, 'src/lib/wordpress.ts'), 'utf8');
      const countBlockMatch = wpSrc.match(/export const getTotalProductCount[\s\S]*?^\}\);/m);
      expect(countBlockMatch).not.toBeNull();
      const countBlock = countBlockMatch![0];
      expect(countBlock).toContain('revalidate: 2592000');
      expect(countBlock).toContain('tags: ["total-product-count"]');
      expect(countBlock).not.toContain('"wc-products"');
    });

    it('sitemap.ts exports dynamic = "force-static" so it is statically cached', () => {
      const sitemapSrc = fs.readFileSync(path.join(repoRoot, 'src/app/sitemap.ts'), 'utf8');
      expect(sitemapSrc).toMatch(/export\s+const\s+dynamic\s*=\s*["']force-static["']/);
    });

    it('/api/products/count is statically cached (revalidate = 86400) instead of force-dynamic', () => {
      const countRouteSrc = fs.readFileSync(path.join(repoRoot, 'src/app/api/products/count/route.ts'), 'utf8');
      expect(countRouteSrc).not.toContain('force-dynamic');
      expect(countRouteSrc).toMatch(/export\s+const\s+revalidate\s*=\s*86400/);
    });
  });

  describe('2. Client-Mount Function Elimination', () => {
    it('GlobalSearch does not fetch /api/products/count on mount', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ total: 15156, label: '15,000+' }), { status: 200 })
      );

      const { GlobalSearch } = await import('@/components/GlobalSearch');
      render(React.createElement(GlobalSearch));

      await new Promise((r) => setTimeout(r, 20));
      expect(fetchSpy).not.toHaveBeenCalledWith('/api/products/count');
    });

    it('AuthProvider skips /api/auth/session for anonymous repeat page loads when sessionStorage marks guest and no hint cookie exists', async () => {
      window.sessionStorage.setItem('dqp_session_anon', '1');
      const fetchSpy = vi.spyOn(global, 'fetch');

      const { AuthProvider } = await import('@/context/AuthContext');
      render(React.createElement(AuthProvider, null, React.createElement('div', null, 'child')));

      await new Promise((r) => setTimeout(r, 20));
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('AuthProvider calls /api/auth/session when dqp_logged_in=1 hint cookie is present', async () => {
      window.sessionStorage.setItem('dqp_session_anon', '1');
      document.cookie = 'dqp_logged_in=1; path=/';
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ user: { id: 1, name: 'Test', email: 't@example.com', username: 'test', avatarUrl: null }, authenticated: true }),
          { status: 200 }
        )
      );

      const { AuthProvider } = await import('@/context/AuthContext');
      render(React.createElement(AuthProvider, null, React.createElement('div', null, 'child')));

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith('/api/auth/session', expect.any(Object));
      });
    });

    it('AddToCartControls defers /api/products/stock until buy-box interaction (zero fetch on passive mount)', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ id: 101, slug: 'test-bulb', stockStatus: 'instock', manageStock: true, stockQuantity: 10, bypassLowStock: false }),
          { status: 200 }
        )
      );

      const { AddToCartControls } = await import('@/components/AddToCartControls');
      const { container } = render(
        React.createElement(AddToCartControls, {
          productId: '101',
          productName: 'Test Bulb',
          productPrice: '£4.99',
          productSlug: 'test-bulb',
          stockStatus: 'IN_STOCK',
          manageStock: true,
          stockQuantity: 10,
        })
      );

      await new Promise((r) => setTimeout(r, 20));
      expect(fetchSpy).not.toHaveBeenCalled();

      // Interacting with the buy box triggers live stock check once
      fireEvent.mouseEnter(container.firstElementChild!);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(String(fetchSpy.mock.calls[0][0])).toContain('/api/products/stock?id=101');
      });

      // Subsequent hover does not spam the endpoint again
      fireEvent.mouseEnter(container.firstElementChild!);
      await new Promise((r) => setTimeout(r, 20));
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('/api/products/stock sets short CDN Cache-Control header', async () => {
      const woocommerce = await import('@/lib/woocommerce');
      vi.spyOn(woocommerce, 'fetchWooCommerceProductsDirect').mockResolvedValue({
        products: [
          {
            id: 'wc-101',
            databaseId: 101,
            name: 'Test Bulb',
            slug: 'test-bulb',
            price: '£4.99',
            regularPrice: '£4.99',
            salePrice: null,
            permalink: 'https://www.discountproducts.co.uk/products/test-bulb',
            image: null,
            categories: [],
            attributes: [],
            stockStatus: 'instock',
            manageStock: true,
            stockQuantity: 10,
            bypassLowStock: false,
          },
        ],
        total: 1,
        totalPages: 1,
      });

      const { GET } = await import('@/app/api/products/stock/route');
      const res = await GET(new Request('http://localhost:3000/api/products/stock?id=101'));
      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toContain('s-maxage=30');
    });
  });

  describe('3. Intent-Based Prefetching & Payload Optimization', () => {
    it('ProductCard disables viewport Link prefetch and prefetches once on mouseEnter', async () => {
      const ProductCard = (await import('@/components/ProductCard')).default;
      const { AuthProvider } = await import('@/context/AuthContext');
      window.sessionStorage.setItem('dqp_session_anon', '1');

      const { container } = render(
        React.createElement(
          AuthProvider,
          null,
          React.createElement(ProductCard, {
            product: {
              id: 'prod-1',
              databaseId: 101,
              name: 'LED Bulb',
              slug: 'led-bulb',
              price: '£3.99',
              stockStatus: 'IN_STOCK',
            },
          })
        )
      );

      expect(routerPrefetchMock).not.toHaveBeenCalled();

      const cardSrc = fs.readFileSync(path.join(repoRoot, 'src/components/ProductCard.tsx'), 'utf8');
      expect(cardSrc).toContain('prefetch={false}');

      const link = container.querySelector('a[href="/products/led-bulb"]');
      expect(link).not.toBeNull();
      fireEvent.mouseEnter(link!);
      expect(routerPrefetchMock).toHaveBeenCalledWith('/products/led-bulb');

      // Second hover does not re-trigger prefetch
      fireEvent.mouseEnter(link!);
      expect(routerPrefetchMock).toHaveBeenCalledTimes(1);
    });

    it('ProductDescription is a Server Component (no "use client") and PDP renders it only once', () => {
      const descSrc = fs.readFileSync(path.join(repoRoot, 'src/components/ProductDescription.tsx'), 'utf8');
      expect(descSrc).not.toMatch(/["']use client["']/);

      const pdpSrc = fs.readFileSync(path.join(repoRoot, 'src/app/products/[slug]/page.tsx'), 'utf8');
      const occurrences = pdpSrc.match(/<ProductDescription\b/g) || [];
      expect(occurrences).toHaveLength(1);
    });

    it('fetchWooCommerceProductsDirect includes _fields parameter to omit heavy descriptions', async () => {
      process.env.WOOCOMMERCE_URL = 'https://admin.discountproducts.co.uk';
      process.env.WOOCOMMERCE_CONSUMER_KEY = 'ck_test';
      process.env.WOOCOMMERCE_CONSUMER_SECRET = 'cs_test';

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'X-WP-Total': '0', 'X-WP-TotalPages': '0' },
        })
      );

      const { fetchWooCommerceProductsDirect } = await import('@/lib/woocommerce');
      await fetchWooCommerceProductsDirect({ page: 1, per_page: 24 });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = String(fetchSpy.mock.calls[0][0]);
      expect(calledUrl).toContain('_fields=');
      expect(calledUrl).not.toContain('description');
    });

    it('shouldCacheProductListing only caches canonical base pages (page <= 3, no search/filters)', async () => {
      const { shouldCacheProductListing } = await import('@/lib/woocommerce');
      expect(shouldCacheProductListing({ page: 1 })).toBe(true);
      expect(shouldCacheProductListing({ page: 3, category: '42' })).toBe(true);
      expect(shouldCacheProductListing({ page: 4 })).toBe(false);
      expect(shouldCacheProductListing({ page: 1, search: 'gu10' })).toBe(false);
      expect(shouldCacheProductListing({ page: 1, min_price: '5' })).toBe(false);
      expect(shouldCacheProductListing({ page: 1, pa_fitting: 'gu10' })).toBe(false);
      expect(shouldCacheProductListing({ page: 1, orderby: 'price' })).toBe(false);
    });
  });

  describe('4. PayPal Targeted Cache Invalidation', () => {
    it('paypal/capture-order and create-wc-order include targeted revalidateTag/revalidatePath for purchased slugs', () => {
      const captureSrc = fs.readFileSync(
        path.join(repoRoot, 'src/app/api/checkout/paypal/capture-order/route.ts'),
        'utf8'
      );
      const createOrderSrc = fs.readFileSync(
        path.join(repoRoot, 'src/app/api/checkout/create-wc-order/route.ts'),
        'utf8'
      );

      expect(captureSrc).toContain('revalidateTag');
      expect(captureSrc).toContain('revalidatePath');
      expect(createOrderSrc).toContain('revalidateTag');
      expect(createOrderSrc).toContain('revalidatePath');
    });
  });
});
