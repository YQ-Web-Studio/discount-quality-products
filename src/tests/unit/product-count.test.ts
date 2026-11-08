import { describe, it, expect } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../mocks/server';
import {
  FALLBACK_PRODUCT_COUNT,
  getRoundedProductCount,
  getFormattedProductCount,
  PRODUCT_COUNT_LABEL,
  getTotalProductCount,
  getDynamicProductCountLabel,
} from '@/lib/wordpress';

describe('Product Count Calculation & Formatting', () => {
  it('has updated FALLBACK_PRODUCT_COUNT to reflect catalog size >= 15,000', () => {
    expect(FALLBACK_PRODUCT_COUNT).toBeGreaterThanOrEqual(15000);
  });

  it('correctly rounds product counts to the nearest lower 1,000 threshold', () => {
    expect(getRoundedProductCount(14569)).toBe(14000);
    expect(getRoundedProductCount(15000)).toBe(15000);
    expect(getRoundedProductCount(15156)).toBe(15000);
    expect(getRoundedProductCount(15999)).toBe(15000);
    expect(getRoundedProductCount(16000)).toBe(16000);
    expect(getRoundedProductCount(20450)).toBe(20000);
  });

  it('correctly formats rounded count labels with en-GB formatting and plus suffix', () => {
    expect(getFormattedProductCount(14569)).toBe('14,000+');
    expect(getFormattedProductCount(15000)).toBe('15,000+');
    expect(getFormattedProductCount(15156)).toBe('15,000+');
    expect(getFormattedProductCount(16000)).toBe('16,000+');
  });

  it('evaluates static PRODUCT_COUNT_LABEL to 15,000+', () => {
    expect(PRODUCT_COUNT_LABEL).toBe('15,000+');
  });

  it('retrieves live product count from GraphQL when available', async () => {
    server.use(
      http.post('*/graphql', () => {
        return HttpResponse.json({
          data: {
            products: {
              found: 15420,
            },
          },
        });
      })
    );

    const total = await getTotalProductCount();
    expect(total).toBe(15420);

    const dynamicLabel = await getDynamicProductCountLabel();
    expect(dynamicLabel).toBe('15,000+');
  });

  it('falls back to WooCommerce Store API if GraphQL query fails', async () => {
    server.use(
      http.post('*/graphql', () => {
        return HttpResponse.json(
          { errors: [{ message: 'GraphQL connection timed out' }] },
          { status: 500 }
        );
      }),
      http.get('*/wp-json/wc/store/v1/products*', () => {
        return new HttpResponse('[]', {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'x-wp-total': '16500',
          },
        });
      })
    );

    const total = await getTotalProductCount();
    expect(total).toBe(16500);

    const dynamicLabel = await getDynamicProductCountLabel();
    expect(dynamicLabel).toBe('16,000+');
  });

  it('falls back safely to FALLBACK_PRODUCT_COUNT if all endpoints fail', async () => {
    server.use(
      http.post('*/graphql', () => {
        return HttpResponse.error();
      }),
      http.get('*/wp-json/wc/store/v1/products*', () => {
        return HttpResponse.error();
      })
    );

    const total = await getTotalProductCount();
    expect(total).toBe(FALLBACK_PRODUCT_COUNT);

    const dynamicLabel = await getDynamicProductCountLabel();
    expect(dynamicLabel).toBe(PRODUCT_COUNT_LABEL);
  });

  it('falls back safely to FALLBACK_PRODUCT_COUNT when WooCommerce Store API stalls beyond timeout', async () => {
    process.env.TEST_STORE_API_TIMEOUT = '50';
    try {
      server.use(
        http.post('*/graphql', () => {
          return HttpResponse.error();
        }),
        http.get('*/wp-json/wc/store/v1/products*', async () => {
          // Simulate a stalled response from an unresponsive WordPress host
          await delay(200);
          return new HttpResponse('[]', {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'x-wp-total': '16500',
            },
          });
        })
      );

      const total = await getTotalProductCount();
      expect(total).toBe(FALLBACK_PRODUCT_COUNT);

      const dynamicLabel = await getDynamicProductCountLabel();
      expect(dynamicLabel).toBe(PRODUCT_COUNT_LABEL);
    } finally {
      delete process.env.TEST_STORE_API_TIMEOUT;
    }
  });
});
