import { describe, it, expect } from "vitest";
import * as kit from "../src/index";

describe("public surface smoke", () => {
  it("exports DI functions", () => {
    expect(typeof kit.setGalleryConfig).toBe("function");
    expect(typeof kit.getGalleryConfig).toBe("function");
  });

  it("exports utility functions", () => {
    expect(typeof kit.cn).toBe("function");
    expect(typeof kit.getVariantUrl).toBe("function");
  });
});
