import { describe, it, expect, beforeEach } from "vitest";
import { setGalleryConfig, getGalleryConfig, resetGalleryConfig } from "../src/config";
import type { GalleryConfig } from "../src/types";

function makeMinimalConfig(): GalleryConfig {
  return {
    prisma: {} as any,
    apiWrapper: ((h: any) => (async () => h({} as any)) as any) as any,
    limits: { maxFeatured: 7, mosaicCount: 7, batchMax: 20 },
  };
}

describe("gallery config DI", () => {
  beforeEach(() => resetGalleryConfig());

  it("getGalleryConfig throws before set", () => {
    expect(() => getGalleryConfig()).toThrow(/setGalleryConfig/);
  });

  it("setGalleryConfig then getGalleryConfig returns same instance", () => {
    const cfg = makeMinimalConfig();
    setGalleryConfig(cfg);
    expect(getGalleryConfig()).toBe(cfg);
  });

  it("resetGalleryConfig clears", () => {
    setGalleryConfig(makeMinimalConfig());
    resetGalleryConfig();
    expect(() => getGalleryConfig()).toThrow();
  });
});
