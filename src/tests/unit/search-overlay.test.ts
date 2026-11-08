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

  it("implements category cards in 1 row across the whole box along the top", () => {
    const content = fs.readFileSync(overlayPath, "utf-8");

    // Top row contains all categories in 1 row
    expect(content).toContain("Browse by Department");
    expect(content).toContain("lg:grid-cols-5");
    expect(content).toContain("navigationCategories");

    // Live search handling
    expect(content).toContain("bestMatch");
    expect(content).toContain("displayCategories");
    expect(content).toContain("displaySuggestions");
    expect(content).toContain("searchResults.products");
  });

  it("links direct product results straight to the product detail page (PDP)", () => {
    const content = fs.readFileSync(overlayPath, "utf-8");
    // Direct product card click must route to /products/${slug}
    expect(content).toMatch(/\/products\/\$\{.*?slug/);
  });

  it("renders featured product cards in the space below category cards before typing", () => {
    const content = fs.readFileSync(overlayPath, "utf-8");
    expect(content).toContain("featuredProducts");
    expect(content).toContain("/api/products/featured");
    expect(content).toContain("Featured Products");
  });
});
