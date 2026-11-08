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

  it("renders as a full-screen overlay and stays on default state until 2 letters are typed", () => {
    const content = fs.readFileSync(overlayPath, "utf-8");
    expect(content).toContain("fixed inset-0");
    expect(content).toContain("h-screen w-screen");
    expect(content).toContain("!hasSearchQuery ? (");
    expect(content).toContain("Browse by Department");
    expect(content).toContain("lg:grid-cols-5");
    expect(content).toContain("hasSearchQuery = trimmedInput.length >= 2");
  });

  it("is fully optimized for responsive design across mobile, tablet, and desktop", () => {
    const content = fs.readFileSync(overlayPath, "utf-8");

    // 1. Mobile viewport height & overflow protection
    expect(content).toContain("h-dvh");
    expect(content).toContain("overscroll-contain");
    expect(content).toContain("overflow-x-hidden");

    // 2. Safe area insets for notched phones & home indicator bars
    expect(content).toContain("env(safe-area-inset-top)");
    expect(content).toContain("env(safe-area-inset-bottom)");

    // 3. iOS auto-zoom prevention (16px base font size on input)
    expect(content).toContain("text-[16px]");

    // 4. Responsive grid systems
    // Department cards: 2 cols on mobile with 5th spanning both cols, 5 cols on tablet/desktop
    expect(content).toContain("grid-cols-2 md:grid-cols-5 lg:grid-cols-5");
    expect(content).toContain('idx === 4 && "col-span-2 md:col-span-1 lg:col-span-1"');

    // Featured products: 2 cols on mobile, 3 on tablet, 6 on desktop
    expect(content).toContain("grid-cols-2 sm:grid-cols-3 lg:grid-cols-6");

    // 5. Responsive Best Match: horizontal banner below desktop, vertical showcase on desktop
    expect(content).toContain("order-first lg:order-last");
    expect(content).toContain("flex lg:block");

    // 6. Touch manipulation enabled for responsive mobile interactions
    expect(content).toContain("touch-manipulation");
  });
});

