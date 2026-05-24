import { describe, it, expect } from "vitest";
import { getVariantUrl } from "../../src/utils/image-variants";

describe("getVariantUrl", () => {
  it("inserts variant suffix before file extension", () => {
    expect(getVariantUrl("https://cdn.example.com/abc.webp", "md"))
      .toBe("https://cdn.example.com/abc_md.webp");
  });

  it("returns original when variant is 'lg' (default size)", () => {
    expect(getVariantUrl("https://cdn.example.com/abc.webp", "lg"))
      .toBe("https://cdn.example.com/abc.webp");
  });

  it("returns original when no extension", () => {
    expect(getVariantUrl("https://cdn.example.com/abc", "sm"))
      .toBe("https://cdn.example.com/abc");
  });

  it("supports thumb variant", () => {
    expect(getVariantUrl("/uploads/x.jpg", "thumb"))
      .toBe("/uploads/x_thumb.jpg");
  });
});
