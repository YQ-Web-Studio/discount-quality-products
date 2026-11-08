import { describe, it, expect } from "vitest";
import { extractSearchSuggestions } from "@/lib/search-phrases";

describe("Dynamic Search Phrase & Suggestion Extractor (src/lib/search-phrases.ts)", () => {
  const sampleProducts = [
    {
      id: 101,
      name: "Osram 18W CFL Fluorescent Light Bulb 4-Pin (Pack of 10)",
      category: "Light Bulbs",
      slug: "osram-18w-cfl-fluorescent-light-bulb-4-pin",
      price: "£14.99",
      imageUrl: null,
    },
    {
      id: 102,
      name: "Philips 50W Halogen Light Bulb GU10 240V",
      category: "Light Bulbs",
      slug: "philips-50w-halogen-light-bulb-gu10",
      price: "£3.50",
      imageUrl: null,
    },
    {
      id: 103,
      name: "Bell 9W LED Daylight Light Bulb ES / E27 [Warm White]",
      category: "Lighting & Torches",
      slug: "bell-9w-led-daylight-light-bulb-es",
      price: "£4.25",
      imageUrl: null,
    },
    {
      id: 104,
      name: "Crompton 28W 2D Fluorescent Light Bulb 4 Pin",
      category: "Light Bulbs",
      slug: "crompton-28w-2d-fluorescent-light-bulb",
      price: "£6.99",
      imageUrl: null,
    },
  ];

  const sampleCategories = [
    { id: 1, name: "Light Bulbs", slug: "light-bulbs" },
    { id: 2, name: "Lighting & Torches", slug: "lighting-torches" },
  ];

  it("returns empty array for empty or single-character query", () => {
    expect(extractSearchSuggestions("", sampleProducts, sampleCategories)).toEqual([]);
    expect(extractSearchSuggestions("a", sampleProducts, sampleCategories)).toEqual([]);
  });

  it("extracts meaningful multi-product phrase suggestions matching the query", () => {
    const suggestions = extractSearchSuggestions("light bulb", sampleProducts, sampleCategories);

    expect(suggestions.length).toBeGreaterThan(0);
    // Should include phrases like "Fluorescent Light Bulb(s)" or "Led Light Bulb(s)"
    const lowerSuggestions = suggestions.map((s) => s.toLowerCase());
    expect(lowerSuggestions.some((s) => s.includes("fluorescent") && s.includes("light bulb"))).toBe(true);
  });

  it("strips packaging and spec noise like brackets, packs, wattage codes from suggestions", () => {
    const suggestions = extractSearchSuggestions("bulb", sampleProducts, sampleCategories);

    suggestions.forEach((suggestion) => {
      expect(suggestion).not.toMatch(/\(pack of \d+\)/i);
      expect(suggestion).not.toMatch(/\[.*?\]/);
      expect(suggestion).not.toMatch(/\b4-pin\b/i);
    });
  });

  it("avoids echoing exact full product titles", () => {
    const suggestions = extractSearchSuggestions("osram", sampleProducts, sampleCategories);

    // It should suggest concise phrases like "Osram Light Bulb" or "Osram Fluorescent", not the 50-char full product title
    expect(suggestions).not.toContain("Osram 18W CFL Fluorescent Light Bulb 4-Pin (Pack of 10)");
  });

  it("deduplicates suggestions and limits to maximum 5 items", () => {
    const suggestions = extractSearchSuggestions("light", sampleProducts, sampleCategories);
    const unique = Array.from(new Set(suggestions.map((s) => s.toLowerCase())));

    expect(suggestions.length).toBe(unique.length);
    expect(suggestions.length).toBeLessThanOrEqual(5);
  });
});
