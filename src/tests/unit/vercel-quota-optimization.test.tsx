import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';

const routerPrefetchMock = vi.fn();
const routerPushMock = vi.fn();
const revalidateTagMock = vi.fn();
const revalidatePathMock = vi.fn();
const validateCartTotalsMock = vi.fn();
const verifyPaymentServerSideMock = vi.fn();
const sendEmailMock = vi.fn();
const sendConfirmationEmailForOrderMock = vi.fn();
const getCurrentWordPressSessionMock = vi.fn();
const createWooCommerceOrderMock = vi.fn();
const searchWooCommerceOrderByPaymentIntentMock = vi.fn();

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock('@/lib/checkout', () => ({
  validateCartTotals: (...args: unknown[]) => validateCartTotalsMock(...args),
}));

vi.mock('@/lib/server-payment-verify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server-payment-verify')>();
  return {
    ...actual,
    verifyPaymentServerSide: (...args: unknown[]) => verifyPaymentServerSideMock(...args),
  };
});

vi.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

vi.mock('@/lib/stripe-sync', () => ({
  sendConfirmationEmailForOrder: (...args: unknown[]) => sendConfirmationEmailForOrderMock(...args),
}));

vi.mock('@/lib/wordpress-auth.server', () => ({
  getCurrentWordPressSession: (...args: unknown[]) => getCurrentWordPressSessionMock(...args),
}));

vi.mock('@/lib/woocommerce', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/woocommerce')>();
  return {
    ...actual,
    createWooCommerceOrder: (...args: unknown[]) => createWooCommerceOrderMock(...args),
    searchWooCommerceOrderByPaymentIntent: (...args: unknown[]) => searchWooCommerceOrderByPaymentIntentMock(...args),
  };
});

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

    it('Product PDP exports 30-day revalidate (2592000) while Guides routes export revalidate = false', () => {
      const pdpSrc = fs.readFileSync(path.join(repoRoot, 'src/app/products/[slug]/page.tsx'), 'utf8');
      const guidesSrc = fs.readFileSync(path.join(repoRoot, 'src/app/guides/page.tsx'), 'utf8');
      const guideSlugSrc = fs.readFileSync(path.join(repoRoot, 'src/app/guides/[slug]/page.tsx'), 'utf8');

      expect(pdpSrc).toMatch(/export\s+const\s+revalidate\s*=\s*2592000\s*;/);
      expect(guidesSrc).toMatch(/export\s+const\s+revalidate\s*=\s*false\s*;/);
      expect(guideSlugSrc).toMatch(/export\s+const\s+revalidate\s*=\s*false\s*;/);
    });

    it('getProductBySlug uses isolated per-slug unstable_cache (30d) while wpFetch stays cache: "no-store"', () => {
      const wpSrc = fs.readFileSync(path.join(repoRoot, 'src/lib/wordpress.ts'), 'utf8');
      expect(wpSrc).toMatch(/cache:\s*"no-store"/);
      expect(wpSrc).not.toContain('allowStaticRender');

      const productBlockMatch = wpSrc.match(/export const getProductBySlug[\s\S]*?^\}\);/m);
      expect(productBlockMatch).not.toBeNull();
      const productBlock = productBlockMatch![0];
      expect(productBlock).toContain('unstable_cache');
      expect(productBlock).toContain('revalidate: 2592000');
      expect(productBlock).toContain('tags: [`product-${slug}`]');
      expect(productBlock).not.toContain('"wc-products"');
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

    it('AuthProvider gracefully handles sessionStorage SecurityError and falls back to /api/auth/session', async () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        get() {
          throw new DOMException('Access is denied', 'SecurityError');
        },
      });

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ user: null, authenticated: false }), { status: 200 })
      );

      try {
        const { AuthProvider } = await import('@/context/AuthContext');
        render(React.createElement(AuthProvider, null, React.createElement('div', null, 'child')));

        await waitFor(() => {
          expect(fetchSpy).toHaveBeenCalledWith('/api/auth/session', expect.any(Object));
        });
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(window, 'sessionStorage', originalDescriptor);
        }
      }
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

    it('AddToCartControls remains keyboard-focusable when initially out of stock so focus refreshes restocked items', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ id: 202, slug: 'restocked-bulb', stockStatus: 'instock', manageStock: true, stockQuantity: 5, bypassLowStock: false }),
          { status: 200 }
        )
      );

      const { AddToCartControls } = await import('@/components/AddToCartControls');
      const { container, getByRole } = render(
        React.createElement(AddToCartControls, {
          productId: '202',
          productName: 'Restocked Bulb',
          productPrice: '£4.99',
          productSlug: 'restocked-bulb',
          stockStatus: 'OUT_OF_STOCK',
          manageStock: true,
          stockQuantity: 0,
        })
      );

      const buyBox = container.firstElementChild as HTMLElement;
      expect(buyBox.getAttribute('tabindex')).toBe('0');
      expect(fetchSpy).not.toHaveBeenCalled();

      fireEvent.focus(buyBox);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(String(fetchSpy.mock.calls[0][0])).toContain('/api/products/stock?id=202');
      });

      await waitFor(() => {
        const addBtn = getByRole('button', { name: /add .* to basket/i });
        expect((addBtn as HTMLButtonElement).disabled).toBe(false);
      });
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
    const validForm = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      address1: '10 Downing Street',
      city: 'London',
      county: 'London',
      postcode: 'SW1A 2AA',
      country: 'GB',
    };

    beforeEach(() => {
      validateCartTotalsMock.mockResolvedValue({
        isValid: true,
        finalTotal: 12.99,
        shippingCost: 3.0,
        shippingTitle: 'Standard Delivery',
        discountAmount: 0,
      });
      verifyPaymentServerSideMock.mockResolvedValue({ verified: true });
      getCurrentWordPressSessionMock.mockResolvedValue(null);
      searchWooCommerceOrderByPaymentIntentMock.mockResolvedValue(null);
      sendEmailMock.mockResolvedValue(undefined);
      sendConfirmationEmailForOrderMock.mockResolvedValue(undefined);
      createWooCommerceOrderMock.mockResolvedValue({
        id: 9001,
        date_created: '2026-11-27T12:00:00',
        total: '12.99',
        total_tax: '2.16',
        discount_total: '0.00',
        billing: { first_name: 'Jane', email: 'jane@example.com' },
        shipping: { first_name: 'Jane', last_name: 'Doe', address_1: '10 Downing Street', city: 'London', postcode: 'SW1A 2AA', country: 'GB' },
        line_items: [{ id: 1, name: 'LED Bulb', quantity: 2, total: '9.99' }],
      });
    });

    it('paypal/capture-order revalidates per-slug tags and path when items include slug', async () => {
      process.env.PAYPAL_CLIENT_ID = 'pp_client';
      process.env.PAYPAL_CLIENT_SECRET = 'pp_secret';

      vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes('/v1/oauth2/token')) {
          return new Response(JSON.stringify({ access_token: 'tok_123' }), { status: 200 });
        }
        if (url.endsWith('/v2/checkout/orders/PP-ORDER-1')) {
          return new Response(
            JSON.stringify({ purchase_units: [{ amount: { value: '12.99', currency_code: 'GBP' } }] }),
            { status: 200 }
          );
        }
        if (url.endsWith('/v2/checkout/orders/PP-ORDER-1/capture')) {
          return new Response(
            JSON.stringify({
              status: 'COMPLETED',
              payer: { payer_id: 'PAYER-1' },
              purchase_units: [{ payments: { captures: [{ id: 'CAP-1' }] } }],
            }),
            { status: 200 }
          );
        }
        return new Response('{}', { status: 404 });
      });

      const { POST } = await import('@/app/api/checkout/paypal/capture-order/route');
      const res = await POST(
        new Request('http://localhost:3000/api/checkout/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderID: 'PP-ORDER-1',
            items: [{ id: '101', quantity: 2, slug: 'led-bulb' }],
            shippingMethod: 'standard',
            form: validForm,
          }),
        })
      );

      expect(res.status).toBe(200);
      expect(revalidateTagMock).toHaveBeenCalledWith('product-led-bulb');
      expect(revalidateTagMock).toHaveBeenCalledWith('wc-product-led-bulb');
      expect(revalidatePathMock).toHaveBeenCalledWith('/products/led-bulb');
    });

    it('paypal/capture-order succeeds without calling revalidation when items omit slug', async () => {
      process.env.PAYPAL_CLIENT_ID = 'pp_client';
      process.env.PAYPAL_CLIENT_SECRET = 'pp_secret';

      vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes('/v1/oauth2/token')) {
          return new Response(JSON.stringify({ access_token: 'tok_123' }), { status: 200 });
        }
        if (url.endsWith('/v2/checkout/orders/PP-ORDER-2')) {
          return new Response(
            JSON.stringify({ purchase_units: [{ amount: { value: '12.99', currency_code: 'GBP' } }] }),
            { status: 200 }
          );
        }
        if (url.endsWith('/v2/checkout/orders/PP-ORDER-2/capture')) {
          return new Response(
            JSON.stringify({
              status: 'COMPLETED',
              payer: { payer_id: 'PAYER-2' },
              purchase_units: [{ payments: { captures: [{ id: 'CAP-2' }] } }],
            }),
            { status: 200 }
          );
        }
        return new Response('{}', { status: 404 });
      });

      const { POST } = await import('@/app/api/checkout/paypal/capture-order/route');
      const res = await POST(
        new Request('http://localhost:3000/api/checkout/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderID: 'PP-ORDER-2',
            items: [{ id: '101', quantity: 1 }],
            shippingMethod: 'standard',
            form: validForm,
          }),
        })
      );

      expect(res.status).toBe(200);
      expect(revalidateTagMock).not.toHaveBeenCalled();
      expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it('create-wc-order revalidates per-slug tags and path when items include slug, and skips when omitted', async () => {
      const { POST } = await import('@/app/api/checkout/create-wc-order/route');

      const withSlugRes = await POST(
        new Request('http://localhost:3000/api/checkout/create-wc-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            form: validForm,
            items: [{ id: '101', quantity: 1, slug: 'gu10-spotlight' }],
            shippingMethod: 'standard',
            paymentProvider: 'paypal',
            transactionId: 'CAP-99',
            paypalOrderId: 'PP-99',
          }),
        })
      );

      expect(withSlugRes.status).toBe(200);
      expect(revalidateTagMock).toHaveBeenCalledWith('product-gu10-spotlight');
      expect(revalidateTagMock).toHaveBeenCalledWith('wc-product-gu10-spotlight');
      expect(revalidatePathMock).toHaveBeenCalledWith('/products/gu10-spotlight');

      revalidateTagMock.mockClear();
      revalidatePathMock.mockClear();

      const withoutSlugRes = await POST(
        new Request('http://localhost:3000/api/checkout/create-wc-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            form: validForm,
            items: [{ id: '101', quantity: 1 }],
            shippingMethod: 'standard',
            paymentProvider: 'paypal',
            transactionId: 'CAP-100',
            paypalOrderId: 'PP-100',
          }),
        })
      );

      expect(withoutSlugRes.status).toBe(200);
      expect(revalidateTagMock).not.toHaveBeenCalled();
      expect(revalidatePathMock).not.toHaveBeenCalled();
    });
  });
});
