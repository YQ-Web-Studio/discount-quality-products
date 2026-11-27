import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { generateMetadata as generateProductMetadata } from '@/app/products/[slug]/page';
import { generateMetadata as generateCategoryMetadata } from '@/app/categories/[slug]/page';
import sitemap, { generateSitemaps } from '@/app/sitemap';
import { GET as getSitemapIndex } from '@/app/sitemap-index.xml/route';

const getAllPostSlugsMock = vi.fn();
const getSitemapProductChunkMock = vi.fn();
const getSitemapProductPageCountMock = vi.fn();
const getProductBySlugMock = vi.fn();
const getCategoriesMock = vi.fn();

vi.mock('@/lib/woocommerce', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/woocommerce')>();
  return {
    ...actual,
    getCategories: (...args: unknown[]) => getCategoriesMock(...args),
  };
});

vi.mock('@/lib/wordpress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/wordpress')>();
  return {
    ...actual,
    getAllPostSlugs: (...args: unknown[]) => getAllPostSlugsMock(...args),
    getSitemapProductChunk: (...args: unknown[]) => getSitemapProductChunkMock(...args),
    getSitemapProductPageCount: (...args: unknown[]) => getSitemapProductPageCountMock(...args),
    getProductBySlug: (...args: unknown[]) => getProductBySlugMock(...args),
  };
});

const repoRoot = process.cwd();

describe('DQP-18: Full-Catalogue Sitemap, Subcategory Canonicals & Product Metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Snippet 006 & Chunked Sitemap Index', () => {
    it('Snippet 006 declares standard header, REST route, visibility exclusion, and deterministic ordering', () => {
      const snippetPath = path.join(
        repoRoot,
        'backend/wordpress/snippets/006-sitemap-product-slugs-endpoint.php'
      );
      expect(fs.existsSync(snippetPath)).toBe(true);
      const php = fs.readFileSync(snippetPath, 'utf8');

      expect(php).toContain('Snippet Name:');
      expect(php).toContain('Ticket: DQP-18');
      expect(php).toContain("register_rest_route('dqp/v1', '/sitemap-products'");
      expect(php).toContain("t.name = 'exclude-from-catalog'");
      expect(php).toContain('ORDER BY p.ID ASC');
      expect(php).toContain('LIMIT %d OFFSET %d');
      // Regression guard: both get_var() and get_results() check $wpdb->last_error + null
      // and return non-cacheable HTTP 500 rather than caching an empty HTTP 200 payload.
      expect(php).toContain('sitemap_count_query_failed');
      expect(php).toContain('sitemap_rows_query_failed');
      expect(php).toContain("if ($raw_total === null || $wpdb->last_error !== '')");
      expect(php).toContain("if ($rows === null || $wpdb->last_error !== '')");
      expect(php).toContain("'Cache-Control', 'no-store, no-cache, must-revalidate'");
    });

    it('generateSitemaps creates chunk 0 plus N product chunks (15,156 SKUs -> 4 product chunks)', async () => {
      getSitemapProductPageCountMock.mockResolvedValue(4);

      const result = await generateSitemaps();
      expect(result).toEqual([{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
    });

    it('sitemap id=0 emits static pages, guides, and clean /categories/${sub.slug} URLs without ?category=', async () => {
      getAllPostSlugsMock.mockResolvedValue([{ slug: 'uk-bulb-fitting-guide', date: '2026-10-01T00:00:00Z' }]);
      getCategoriesMock.mockResolvedValue([
        {
          id: 1,
          label: 'Lighting',
          slug: 'lighting',
          accentColor: 'text-amber-600',
          subcategories: [
            { id: 10, label: 'LED Bulbs', slug: 'led-bulbs' },
            { id: 11, label: 'Halogen Bulbs', slug: 'halogen-bulbs' },
          ],
        },
      ]);

      const entries = await sitemap({ id: Promise.resolve('0') });
      const urls = entries.map((e) => e.url);

      expect(urls).toContain('https://www.discountproducts.co.uk');
      expect(urls).toContain('https://www.discountproducts.co.uk/shop');
      expect(urls).toContain('https://www.discountproducts.co.uk/guides/uk-bulb-fitting-guide');
      expect(urls).toContain('https://www.discountproducts.co.uk/categories/lighting');
      expect(urls).toContain('https://www.discountproducts.co.uk/categories/led-bulbs');
      expect(urls).toContain('https://www.discountproducts.co.uk/categories/halogen-bulbs');
      expect(urls.some((u) => u.includes('?category='))).toBe(false);
    });

    it('sitemap id>=1 emits product URLs for the requested chunk', async () => {
      getSitemapProductChunkMock.mockResolvedValue({
        items: [
          { slug: '2x-28w-gu10-halogen-bulb', date: '2026-11-20T12:00:00Z' },
          { slug: '2025-king-charles-50p-coin', date: '2026-11-21T12:00:00Z' },
        ],
        total: 15156,
        totalPages: 4,
        source: 'rest',
      });

      const entries = await sitemap({ id: Promise.resolve('2') });

      expect(getSitemapProductChunkMock).toHaveBeenCalledWith(2, 5000);
      expect(entries.map((e) => e.url)).toEqual([
        'https://www.discountproducts.co.uk/products/2x-28w-gu10-halogen-bulb',
        'https://www.discountproducts.co.uk/products/2025-king-charles-50p-coin',
      ]);
    });

    it('/sitemap.xml route serves a valid XML sitemapindex listing all generated sub-sitemaps', async () => {
      getSitemapProductPageCountMock.mockResolvedValue(4);

      const res = await getSitemapIndex();
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('application/xml');
      expect(res.headers.get('Cache-Control')).toContain('s-maxage=86400');

      const xml = await res.text();
      expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('<loc>https://www.discountproducts.co.uk/sitemap/0.xml</loc>');
      expect(xml).toContain('<loc>https://www.discountproducts.co.uk/sitemap/1.xml</loc>');
      expect(xml).toContain('<loc>https://www.discountproducts.co.uk/sitemap/4.xml</loc>');
    });

    it('getSitemapProductChunk and getSitemapProductPageCount use REST primary and gracefully fall back when 404', async () => {
      const actualWordpress = await vi.importActual<typeof import('@/lib/wordpress')>('@/lib/wordpress');

      // Primary REST probe (15,156 products -> 4 chunks)
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({ total: 15156, totalPages: 15156, page: 1, perPage: 1, items: [{ slug: 'a', modified: '2026-11-01T00:00:00Z' }] }),
          { status: 200 }
        )
      );
      const pages = await actualWordpress.getSitemapProductPageCount(5000);
      expect(pages).toBe(4);
      expect(String(fetchSpy.mock.calls[0][0])).toContain('/wp-json/dqp/v1/sitemap-products?page=1&per_page=1');

      // Primary REST chunk fetch
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            total: 2,
            totalPages: 1,
            page: 1,
            perPage: 5000,
            items: [
              { slug: 'gu10-led-bulb', modified: '2026-11-10T10:00:00Z' },
              { slug: '   ', modified: '2026-11-10T10:00:00Z' },
            ],
          }),
          { status: 200 }
        )
      );
      const restChunk = await actualWordpress.getSitemapProductChunk(1, 5000);
      expect(restChunk.source).toBe('rest');
      expect(restChunk.items).toEqual([{ slug: 'gu10-led-bulb', date: '2026-11-10T10:00:00Z' }]);

      // Fallback when REST returns 404 (page > 1 returns empty safely without looping GraphQL)
      fetchSpy.mockResolvedValueOnce(new Response('Not Found', { status: 404 }));
      const fallbackPage2 = await actualWordpress.getSitemapProductChunk(2, 5000);
      expect(fallbackPage2).toEqual({ items: [], total: 0, totalPages: 1, source: 'graphql' });

      // Fallback probe returns 1 chunk when REST 404s
      fetchSpy.mockResolvedValueOnce(new Response('Not Found', { status: 404 }));
      const fallbackPages = await actualWordpress.getSitemapProductPageCount(5000);
      expect(fallbackPages).toBe(1);

      // Regression guard: transient HTTP 503 after healthy output MUST throw so ISR
      // retains previously generated sitemap instead of caching empty/truncated XML.
      fetchSpy.mockResolvedValueOnce(new Response('Service Unavailable', { status: 503 }));
      await expect(actualWordpress.getSitemapProductChunk(2, 5000)).rejects.toThrow('HTTP 503');

      fetchSpy.mockResolvedValueOnce(new Response('Service Unavailable', { status: 503 }));
      await expect(actualWordpress.getSitemapProductPageCount(5000)).rejects.toThrow('HTTP 503');
    });

    it('sitemap and generateSitemaps propagate transient 503 failures so Next.js ISR retains prior valid output', async () => {
      // Healthy run succeeds
      getSitemapProductChunkMock.mockResolvedValueOnce({
        items: [{ slug: 'healthy-sku', date: '2026-11-20T12:00:00Z' }],
        total: 10000,
        totalPages: 2,
        source: 'rest',
      });
      const healthyEntries = await sitemap({ id: Promise.resolve('2') });
      expect(healthyEntries).toHaveLength(1);

      // Subsequent transient 503 must reject rather than returning []
      getSitemapProductChunkMock.mockRejectedValueOnce(new Error('Sitemap REST endpoint failed with HTTP 503'));
      await expect(sitemap({ id: Promise.resolve('2') })).rejects.toThrow('HTTP 503');

      getSitemapProductPageCountMock.mockRejectedValueOnce(new Error('Sitemap REST endpoint failed with HTTP 503'));
      await expect(generateSitemaps()).rejects.toThrow('HTTP 503');
    });
  });

  describe('2. Clean Subcategory URLs & Self-Referencing Canonicals', () => {
    it('Header, BentoGrid, SearchOverlay, and /api/search no longer emit ?category= subcategory links', () => {
      const files = [
        'src/components/Header.tsx',
        'src/components/BentoGrid.tsx',
        'src/components/SearchOverlay.tsx',
        'src/app/api/search/route.ts',
        'src/app/sitemap.ts',
      ];
      for (const rel of files) {
        const src = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
        expect(src, `${rel} should not emit ?category= links`).not.toContain('?category=');
      }
    });

    it('categories/[slug] generateMetadata emits self-referencing canonical and label for subcategories', async () => {
      const { navigationCategories } = await import('@/lib/navigationConfig');
      const firstParentWithSub = navigationCategories.find((c) => c.subcategories.length > 0)!;
      const sampleSub = firstParentWithSub.subcategories[0];

      const subMeta = await generateCategoryMetadata({ params: Promise.resolve({ slug: sampleSub.slug }) });
      expect(subMeta.title).toBe(`${sampleSub.label} | Discount Quality Products`);
      expect(subMeta.alternates?.canonical).toBe(
        `https://www.discountproducts.co.uk/categories/${sampleSub.slug}`
      );

      // Unknown dynamic subcategory still gets clean title casing and self-referencing canonical
      const unknownMeta = await generateCategoryMetadata({
        params: Promise.resolve({ slug: 'vintage-brass-fittings' }),
      });
      expect(unknownMeta.title).toBe('Vintage Brass Fittings | Discount Quality Products');
      expect(unknownMeta.alternates?.canonical).toBe(
        'https://www.discountproducts.co.uk/categories/vintage-brass-fittings'
      );
    });
  });

  describe('3. Real Product Metadata & Social/AI Previews', () => {
    it('stripHtmlToExcerpt strips style/script blocks, HTML tags, entities, and truncates cleanly', async () => {
      const { stripHtmlToExcerpt } = await import('@/lib/seo-metadata');

      const messyHtml =
        '<style>.ebay{color:red}</style><script>alert(1)</script><p>Pack of 4x <strong>28W GU10</strong> Halogen Bulbs &amp; Fittings &mdash; warm white 2700K dimmable spotlights ideal for kitchens, hallways, and commercial track lighting installations across the UK.</p>';

      const excerpt = stripHtmlToExcerpt(messyHtml, 120);
      expect(excerpt).not.toContain('.ebay');
      expect(excerpt).not.toContain('alert(1)');
      expect(excerpt).not.toContain('<p>');
      expect(excerpt).toContain('28W GU10 Halogen Bulbs & Fittings');
      expect(excerpt.length).toBeLessThanOrEqual(120);
      expect(excerpt.endsWith('…')).toBe(true);
    });

    it('decodes named, numeric, hex, and double-escaped HTML entities in all three product descriptions', async () => {
      getProductBySlugMock.mockResolvedValue({
        id: 'prod-entities',
        databaseId: 103,
        slug: 'replacement-uk-lamp',
        name: 'Manufacturer&#8217;s&nbsp;Replacement Lamp',
        shortDescription:
          '<p>Manufacturer&#8217;s&nbsp;replacement lamp &amp;#8217;certified&amp;#8217; for UK fittings at &pound;4.99&#x2014;free delivery.</p>',
        image: {
          sourceUrl: 'https://admin.discountproducts.co.uk/wp-content/uploads/lamp.jpg',
        },
      });

      const meta = await generateProductMetadata({
        params: Promise.resolve({ slug: 'replacement-uk-lamp' }),
        searchParams: Promise.resolve({}),
      });

      const expected = 'Manufacturer’s replacement lamp ’certified’ for UK fittings at £4.99—free delivery.';
      expect(meta.title).toBe('Manufacturer’s Replacement Lamp | Discount Quality Products');
      expect(meta.description).toBe(expected);
      expect(meta.openGraph?.description).toBe(expected);
      expect(meta.twitter?.description).toBe(expected);
      expect(meta.description).not.toContain('&#8217;');
      expect(meta.description).not.toContain('&nbsp;');
    });

    it('uses full description when shortDescription is non-empty but under 25 characters', async () => {
      getProductBySlugMock.mockResolvedValue({
        id: 'prod-short-fallback',
        databaseId: 104,
        slug: 'gu10-spotlight-pack',
        name: 'GU10 Spotlight Pack',
        shortDescription: '<p>New</p>',
        description:
          '<p>Complete pack of four high-efficiency warm white GU10 LED spotlight bulbs designed for domestic and commercial fittings.</p>',
      });

      const meta = await generateProductMetadata({
        params: Promise.resolve({ slug: 'gu10-spotlight-pack' }),
        searchParams: Promise.resolve({}),
      });

      expect(meta.description).toContain('Complete pack of four high-efficiency warm white GU10 LED spotlight bulbs');
    });

    it('generateMetadata uses real product title, excerpt, and product image when product exists', async () => {
      getProductBySlugMock.mockResolvedValue({
        id: 'prod-1',
        databaseId: 101,
        slug: '2x-28w-gu10-led-bulb',
        name: '2x 28W GU10 LED Bulb &amp; Holder',
        shortDescription:
          '<p>Energy-saving 28W equivalent GU10 warm white LED bulbs with ceramic holders for UK mains voltage.</p>',
        image: {
          sourceUrl: 'https://admin.discountproducts.co.uk/wp-content/uploads/gu10.jpg',
          altText: 'GU10 Bulb',
        },
      });

      const meta = await generateProductMetadata({
        params: Promise.resolve({ slug: '2x-28w-gu10-led-bulb' }),
        searchParams: Promise.resolve({}),
      });

      expect(meta.title).toBe('2x 28W GU10 LED Bulb & Holder | Discount Quality Products');
      expect(meta.description).toContain('Energy-saving 28W equivalent GU10');
      expect(meta.alternates?.canonical).toBe(
        'https://www.discountproducts.co.uk/products/2x-28w-gu10-led-bulb'
      );
      expect(meta.openGraph?.images).toEqual([
        {
          url: 'https://admin.discountproducts.co.uk/wp-content/uploads/gu10.jpg',
          alt: '2x 28W GU10 LED Bulb & Holder',
        },
      ]);
      expect(meta.twitter?.images).toEqual([
        'https://admin.discountproducts.co.uk/wp-content/uploads/gu10.jpg',
      ]);
    });

    it('generateMetadata falls back to featuredImage, default OG image, and template description when fields are empty', async () => {
      getProductBySlugMock.mockResolvedValue({
        id: 'prod-2',
        databaseId: 102,
        slug: 'king-charles-50p',
        name: '2025 King Charles III 50p Coin',
        shortDescription: '',
        description: '<p>Short</p>',
      });

      const meta = await generateProductMetadata({
        params: Promise.resolve({ slug: 'king-charles-50p' }),
        searchParams: Promise.resolve({}),
      });

      expect(meta.title).toBe('2025 King Charles III 50p Coin | Discount Quality Products');
      expect(meta.description).toContain('Buy 2025 King Charles III 50p Coin from Discount Quality Products.');
      expect(meta.openGraph?.images).toEqual([
        { url: '/images/og-image.png', alt: '2025 King Charles III 50p Coin' },
      ]);
    });

    it('generateMetadata omits canonical and sets noindex when product is null (404)', async () => {
      getProductBySlugMock.mockResolvedValue(null);

      const meta = await generateProductMetadata({
        params: Promise.resolve({ slug: 'non-existent-sku' }),
        searchParams: Promise.resolve({}),
      });

      expect(meta.title).toBe('Product Not Found | Discount Quality Products');
      expect(meta.alternates).toBeUndefined();
      expect(meta.openGraph).toBeUndefined();
      expect(meta.robots).toEqual({ index: false, follow: false });
    });

    it('generateMetadata gracefully falls back to slug metadata on transient WordPress error', async () => {
      getProductBySlugMock.mockRejectedValue(new Error('Connection timeout'));

      const meta = await generateProductMetadata({
        params: Promise.resolve({ slug: 'brass-lamp-holder' }),
        searchParams: Promise.resolve({}),
      });

      expect(meta.title).toBe('Brass Lamp Holder | Discount Quality Products');
      expect(meta.alternates?.canonical).toBe(
        'https://www.discountproducts.co.uk/products/brass-lamp-holder'
      );
    });
  });
});
