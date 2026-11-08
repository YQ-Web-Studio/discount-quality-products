import { describe, it, expect } from "vitest";
import { broadenSearchQuery, stemToken } from "@/app/shop/broadenSearch";

describe("broadenSearchQuery and stemToken", () => {
  it("stems common plurals and known compounds", () => {
    expect(stemToken("lightbulbs")).toBe("light bulb");
    expect(stemToken("batteries")).toBe("battery");
    expect(stemToken("switches")).toBe("switch");
    expect(stemToken("candles")).toBe("candle");
    expect(stemToken("lamps")).toBe("lamp");
    expect(stemToken("glass")).toBe("glass"); // preserves 'ss'
  });

  it("broadens single-word queries with inflections or duplicate consonants", () => {
    expect(broadenSearchQuery("lightbulbs")).toBe("light bulb");
    expect(broadenSearchQuery("batteries")).toBe("battery");
    expect(broadenSearchQuery("switches")).toBe("switch");
    expect(broadenSearchQuery("hell")).toBe("hel");
  });

  it("broadens complex multi-token specification queries to core terms", () => {
    const input = "4pc 20w halogen candle light bulbs b22";
    const broadened = broadenSearchQuery(input);
    expect(broadened).toContain("candle");
    expect(broadened).toContain("light");
  });

  it("returns null for non-broadenable or minimal queries", () => {
    expect(broadenSearchQuery("x")).toBeNull();
    expect(broadenSearchQuery("lamp")).toBeNull();
  });
});
