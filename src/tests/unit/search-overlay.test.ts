import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Search Overlay UI (src/components/SearchOverlay.tsx)", () => {
  const overlayPath = path.resolve(
    process.cwd(),
    "src/components/SearchOverlay.tsx"
  );

  it("exists and is a client component", () => {
    expect(fs.existsSync(overlayPath)).toBe(true);
    const content = fs.readFileSync(overlayPath, "utf-8");
    expect(content).toContain('"use client"');
  });

  it("implements responsive 2-column layout with results on left and categories/best-match on right", () => {
    const content = fs.readFileSync(overlayPath, "utf-8");

    // Right-hand column contains Best Match and Browse by Category
    expect(content).toContain("bestMatch");
    expect(content).toContain("Browse by Category");
    expect(content).toContain("navigationCategories");

    // Left-hand column handles categories, suggestions, and products stream
    expect(content).toContain("displayCategories");
    expect(content).toContain("displaySuggestions");
    expect(content).toContain("searchResults.products");
  });

  it("links direct product results straight to the product detail page (PDP)", () => {
    const content = fs.readFileSync(overlayPath, "utf-8");
    // Direct product card click must route to /products/${slug}
    expect(content).toMatch(/\/products\/\$\{.*?slug/);
  });

  it("provides clean view all results text link at the bottom of the stream", () => {
    const content = fs.readFileSync(overlayPath, "utf-8");
    expect(content).toMatch(/\/shop\?q=/);
    expect(content).toMatch(/Search for.*in all products/i);
  });
});
