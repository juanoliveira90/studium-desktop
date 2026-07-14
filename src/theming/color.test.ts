import { describe, expect, it } from "vitest";
import { mix, withAlpha } from "./color";

describe("mix", () => {
  it("blends two hex colors by the weight of the first", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#ff0000", "#0000ff", 1)).toBe("#ff0000");
    expect(mix("#ff0000", "#0000ff", 0)).toBe("#0000ff");
  });

  it("accepts 3-digit hex and missing #", () => {
    expect(mix("fff", "#000", 0.5)).toBe("#808080");
    expect(mix("#f00", "00f", 1)).toBe("#ff0000");
  });

  it("rounds channel blends to whole bytes", () => {
    expect(mix("#0a0a0a", "#0b0b0b", 0.5)).toBe("#0b0b0b");
  });
});

describe("withAlpha", () => {
  it("produces a modern rgb() with alpha", () => {
    expect(withAlpha("#657b83", 0.4)).toBe("rgb(101 123 131 / 0.4)");
    expect(withAlpha("fff", 1)).toBe("rgb(255 255 255 / 1)");
  });
});
