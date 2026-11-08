import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Search Overlay UI Redesign (src/components/SearchOverlay.tsx)", () => {
  const overlayPath = path.resolve(
    process.cwd(),
    "src/components/SearchOverlay.tsx"
  );

  it("exists and is a client component", () => {
    expect(fs.existsSync(overlayPath)).toBe(true);
    const content = fs.readFileSync(overlayPath, "utf-8");
    expect(content).toContain('"use client"');
  });

  it("fetches and renders initial featured/trending products when search opens", () => {
    const content = fs.readFileSync(overlayPath, "utf-8");
    // Must feature an initial empty state that displays curated products instead of empty text
    expect(content).toContain("/api/products/featured");
    expect(content).toContain("featuredProducts");
    expect(content).toMatch(/Featured|Trending|Popular/i);
  });

  it("implements unified single-column layout incorporating categories, suggestions, and products", () => {
    const content = fs.readFileSync(overlayPath, "utf-8");

    // Must NOT be divided into distinct side-by-side columns (col-span-9 and col-span-3) for search results
    expect(content).not.toContain("lg:col-span-9");
    expect(content).not.toContain("lg:col-span-3");

    // Must handle all 3 result types in the single unified stream
    expect(content).toContain("categories");
    expect(content).toContain("suggestions");
    expect(content).toContain("products");
  });

  it("links direct product results straight to the product detail page (PDP)", () => {
    const content = fs.readFileSync(overlayPath, "utf-8");
    // Direct product card click must route to /products/${slug}
    expect(content).toMatch(/\/products\/\$\{.*?slug/);
  });

  it("provides view all results action at the bottom of the stream", () => {
    const content = fs.readFileSync(overlayPath, "utf-8");
    expect(content).toMatch(/\/shop\?q=/);
    expect(content).toMatch(/View all|Search for/i);
  });
});
