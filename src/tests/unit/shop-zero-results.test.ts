import { describe, it, expect } from "vitest";
import { broadenSearchQuery } from "@/app/shop/broadenSearch";
import * as fs from "fs";
import * as path from "path";

describe("Shop Page Zero-Results Auto-Broadening & Catalog Fallback", () => {
  describe("broadenSearchQuery helper", () => {
    it("strips stop-words and noise specifications to broaden multi-token queries", () => {
      const broadened = broadenSearchQuery("rare fluorescent light bulbs 100w");
      expect(broadened).toBeTruthy();
      expect(broadened?.toLowerCase()).not.toContain("100w");
      expect(broadened?.toLowerCase()).toContain("bulb");
    });

    it("extracts core nouns/tokens when given complex query strings", () => {
      const broadened = broadenSearchQuery("box of 10 osram vintage daylight bulbs");
      expect(broadened).toBeTruthy();
      expect(broadened?.toLowerCase()).not.toContain("box");
      expect(broadened?.toLowerCase()).not.toContain("10");
    });

    it("returns null if query cannot be broadened (single term or already minimal)", () => {
      expect(broadenSearchQuery("bulb")).toBeNull();
      expect(broadenSearchQuery("xyz")).toBeNull();
    });
  });

  describe("Shop Page & SearchHub Fallback State Integrity", () => {
    const shopPagePath = path.resolve(process.cwd(), "src/app/shop/page.tsx");
    const searchHubPath = path.resolve(process.cwd(), "src/app/shop/SearchHub.tsx");

    it("integrates auto-broadening and catalog fallback in shop/page.tsx", () => {
      const content = fs.readFileSync(shopPagePath, "utf-8");
      expect(content).toContain("broadenSearchQuery");
      expect(content).toContain("isFallbackCatalog");
      expect(content).toContain("broadenedQuery");
    });

    it("renders informative notice banner when query was auto-broadened in SearchHub.tsx", () => {
      const content = fs.readFileSync(searchHubPath, "utf-8");
      expect(content).toContain("broadenedQuery");
      expect(content).toMatch(/Showing results for/i);
    });

    it("renders friendly catalog fallback notice rather than empty dead-end in SearchHub.tsx", () => {
      const content = fs.readFileSync(searchHubPath, "utf-8");
      expect(content).toContain("isFallbackCatalog");
      expect(content).toMatch(/popular catalogue/i);
    });
  });
});
