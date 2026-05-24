import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getGalleryItems,
  getFeaturedGalleries,
  getRecentGalleries,
  getGalleryCount,
} from "../../src/server/loaders";
import type { GalleryConfig } from "../../src/types";

interface GalleryDelegateMock {
  findMany: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
}

function makeConfig(): { config: GalleryConfig; gal: GalleryDelegateMock } {
  const gal: GalleryDelegateMock = {
    findMany: vi.fn(),
    count: vi.fn(),
  };
  const prisma: any = {
    gallery: gal,
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };
  const config: GalleryConfig = {
    prisma,
    apiWrapper: ((h: any) => (async () => h({} as any)) as any) as any,
    limits: { maxFeatured: 7, mosaicCount: 7, batchMax: 20 },
  };
  return { config, gal };
}

describe("loaders.getGalleryItems", () => {
  let ctx: ReturnType<typeof makeConfig>;
  beforeEach(() => {
    ctx = makeConfig();
  });

  it("delegates to service.listAll (paginated result)", async () => {
    ctx.gal.findMany.mockResolvedValue([{ id: "g1" }, { id: "g2" }]);
    ctx.gal.count.mockResolvedValue(20);
    const r = await getGalleryItems(ctx.config, { page: 2, limit: 2 });
    expect(r.items).toHaveLength(2);
    expect(r.meta.page).toBe(2);
    expect(r.meta.limit).toBe(2);
    expect(r.meta.total).toBe(20);
    expect(r.meta.totalPages).toBe(10);
  });

  it("passes filter options to listAll", async () => {
    ctx.gal.findMany.mockResolvedValue([]);
    ctx.gal.count.mockResolvedValue(0);
    await getGalleryItems(ctx.config, {
      categoryId: "cat-x",
      published: true,
      search: "blue",
    });
    const arg = ctx.gal.findMany.mock.calls[0]?.[0];
    expect(arg.where).toEqual({
      categoryId: "cat-x",
      published: true,
      caption: { contains: "blue", mode: "insensitive" },
    });
  });
});

describe("loaders.getFeaturedGalleries", () => {
  let ctx: ReturnType<typeof makeConfig>;
  beforeEach(() => {
    ctx = makeConfig();
  });

  it("delegates to service.listFeatured with limit", async () => {
    ctx.gal.findMany.mockResolvedValue([{ id: "f1" }]);
    const r = await getFeaturedGalleries(ctx.config, 7);
    const arg = ctx.gal.findMany.mock.calls[0]?.[0];
    expect(arg.where).toEqual({ published: true, featured: true });
    expect(arg.take).toBe(7);
    expect(r).toHaveLength(1);
  });

  it("omits limit when not provided", async () => {
    ctx.gal.findMany.mockResolvedValue([]);
    await getFeaturedGalleries(ctx.config);
    const arg = ctx.gal.findMany.mock.calls[0]?.[0];
    expect(arg.take).toBeUndefined();
  });
});

describe("loaders.getRecentGalleries", () => {
  let ctx: ReturnType<typeof makeConfig>;
  beforeEach(() => {
    ctx = makeConfig();
  });

  it("delegates to service.listRecent with required limit", async () => {
    ctx.gal.findMany.mockResolvedValue([{ id: "r1" }, { id: "r2" }]);
    const r = await getRecentGalleries(ctx.config, 5);
    const arg = ctx.gal.findMany.mock.calls[0]?.[0];
    expect(arg.take).toBe(5);
    expect(arg.orderBy).toEqual({ createdAt: "desc" });
    expect(r).toHaveLength(2);
  });
});

describe("loaders.getGalleryCount", () => {
  let ctx: ReturnType<typeof makeConfig>;
  beforeEach(() => {
    ctx = makeConfig();
  });

  it("delegates to service.count (no filter)", async () => {
    ctx.gal.count.mockResolvedValue(42);
    const r = await getGalleryCount(ctx.config);
    expect(r).toBe(42);
    expect(ctx.gal.count.mock.calls[0]?.[0]).toEqual({});
  });

  it("passes published filter through", async () => {
    ctx.gal.count.mockResolvedValue(11);
    const r = await getGalleryCount(ctx.config, { published: true });
    expect(r).toBe(11);
    expect(ctx.gal.count.mock.calls[0]?.[0]).toEqual({
      where: { published: true },
    });
  });
});
