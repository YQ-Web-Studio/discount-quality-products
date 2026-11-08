import { describe, it, expect } from "vitest";
import { isGibberishQuery } from "@/lib/gibberish";

describe("isGibberishQuery", () => {
  it("identifies keyboard mash and unpronounceable gibberish", () => {
    // The exact user-provided example:
    expect(isGibberishQuery("aekjsghslggjkfdg")).toBe(true);

    // Keyboard home row mashing
    expect(isGibberishQuery("asdfghjkl")).toBe(true);
    expect(isGibberishQuery("qwertyuiop")).toBe(true);
    expect(isGibberishQuery("sdfjklsdf")).toBe(true);

    // Repeated characters
    expect(isGibberishQuery("zzzzzz")).toBe(true);
    expect(isGibberishQuery("aaaaa")).toBe(true);
  });

  it("never flags valid short queries or prefix terms", () => {
    expect(isGibberishQuery("hel")).toBe(false);
    expect(isGibberishQuery("hell")).toBe(false);
    expect(isGibberishQuery("hello")).toBe(false);
    expect(isGibberishQuery("t8")).toBe(false);
    expect(isGibberishQuery("e27")).toBe(false);
    expect(isGibberishQuery("b22")).toBe(false);
    expect(isGibberishQuery("lamp")).toBe(false);
    expect(isGibberishQuery("bulb")).toBe(false);
  });

  it("never flags technical part codes or natural English words", () => {
    expect(isGibberishQuery("lightbulbs")).toBe(false);
    expect(isGibberishQuery("dimmable")).toBe(false);
    expect(isGibberishQuery("fluorescent")).toBe(false);
    expect(isGibberishQuery("cr2032")).toBe(false);
    expect(isGibberishQuery("gx24q-3")).toBe(false);
    expect(isGibberishQuery("schneider")).toBe(false);
    expect(isGibberishQuery("strengths")).toBe(false);
    expect(isGibberishQuery("sylvania")).toBe(false);
    expect(isGibberishQuery("rhythms")).toBe(false);
    expect(isGibberishQuery("battery")).toBe(false);
  });
});
