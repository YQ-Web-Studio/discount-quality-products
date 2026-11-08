import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, runtime } from "@/app/api/search/route";

describe("Next.js Edge Search API Route (src/app/api/search/route.ts)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exports edge runtime", () => {
    expect(runtime).toBe("edge");
  });

  it("returns empty result payload for queries under 2 characters", async () => {
    const req = new NextRequest("https://www.discountproducts.co.uk/api/search?q=a");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      products: [],
      categories: [],
      suggestions: [],
    });
  });

  it("returns products, categories, and synthesized suggestions for valid queries", async () => {
    // Mock global fetch for instant-search endpoint
    const mockWpResponse = {
      products: [
        {
          id: 501,
          name: "Osram 18W CFL Fluorescent Light Bulb",
          slug: "osram-18w-cfl-fluorescent-light-bulb",
          price: "£4.99",
          imageUrl: "https://example.com/bulb.jpg",
          category: "Light Bulbs",
        },
      ],
      categories: [
        {
          id: 12,
          name: "Light Bulbs",
          slug: "light-bulbs",
          parentName: "Hardware",
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockWpResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const req = new NextRequest("https://www.discountproducts.co.uk/api/search?q=bulb");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=600");
    expect(res.headers.get("Cache-Control")).toContain("stale-while-revalidate=86400");

    const data = await res.json();
    expect(data.products).toHaveLength(1);
    expect(data.products[0].slug).toBe("osram-18w-cfl-fluorescent-light-bulb");
    expect(data.categories).toHaveLength(1);
    expect(data.categories[0].name).toBe("Light Bulbs");
    expect(Array.isArray(data.suggestions)).toBe(true);
  });

  it("gracefully falls back when lean endpoint returns error or is unreachable", async () => {
    // Mock lean endpoint failure
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Connection refused"));

    const req = new NextRequest("https://www.discountproducts.co.uk/api/search?q=bulb");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("products");
    expect(data).toHaveProperty("categories");
    expect(data).toHaveProperty("suggestions");
  });
});
