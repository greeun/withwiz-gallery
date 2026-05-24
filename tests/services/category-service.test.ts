import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCategoryService } from "../../src/services/category-service";
import type { GalleryConfig } from "../../src/types";

interface CategoryDelegateMock {
  findMany: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

interface GalleryDelegateMock {
  count: ReturnType<typeof vi.fn>;
}

function makeConfig(): {
  config: GalleryConfig;
  cat: CategoryDelegateMock;
  gal: GalleryDelegateMock;
} {
  const cat: CategoryDelegateMock = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const gal: GalleryDelegateMock = {
    count: vi.fn(),
  };
  const prisma: any = {
    galleryCategory: cat,
    gallery: gal,
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };
  const config: GalleryConfig = {
    prisma,
    apiWrapper: ((h: any) => (async () => h({} as any)) as any) as any,
    limits: { maxFeatured: 7, mosaicCount: 7, batchMax: 20 },
  };
  return { config, cat, gal };
}

describe("createCategoryService", () => {
  let ctx: ReturnType<typeof makeConfig>;
  beforeEach(() => {
    ctx = makeConfig();
  });

  it("list() returns rows ordered by sortOrder, with optional isActive filter", async () => {
    ctx.cat.findMany.mockResolvedValue([{ id: "c1", slug: "PERFORMANCE" }]);
    const svc = createCategoryService(ctx.config);
    const r = await svc.list();
    expect(ctx.cat.findMany).toHaveBeenCalled();
    const arg = ctx.cat.findMany.mock.calls[0]?.[0];
    expect(arg.orderBy).toBeDefined();
    expect(r).toHaveLength(1);
  });

  it("list({ isActive: true }) passes where clause", async () => {
    ctx.cat.findMany.mockResolvedValue([]);
    const svc = createCategoryService(ctx.config);
    await svc.list({ isActive: true });
    const arg = ctx.cat.findMany.mock.calls[0]?.[0];
    expect(arg.where).toEqual({ isActive: true });
  });

  it("getBySlug returns row or null", async () => {
    ctx.cat.findUnique.mockResolvedValue({ id: "c1", slug: "PERFORMANCE" });
    const svc = createCategoryService(ctx.config);
    const r = await svc.getBySlug("PERFORMANCE");
    expect(ctx.cat.findUnique).toHaveBeenCalledWith({ where: { slug: "PERFORMANCE" } });
    expect(r?.id).toBe("c1");
  });

  it("getById returns row or null", async () => {
    ctx.cat.findUnique.mockResolvedValue({ id: "c1" });
    const svc = createCategoryService(ctx.config);
    const r = await svc.getById("c1");
    expect(ctx.cat.findUnique).toHaveBeenCalledWith({ where: { id: "c1" } });
    expect(r?.id).toBe("c1");
  });

  it("create() forwards data", async () => {
    ctx.cat.create.mockResolvedValue({ id: "c1", slug: "X" });
    const svc = createCategoryService(ctx.config);
    const r = await svc.create({ slug: "X", labelKo: "엑스" });
    expect(ctx.cat.create).toHaveBeenCalledWith({
      data: { slug: "X", labelKo: "엑스" },
    });
    expect(r.id).toBe("c1");
  });

  it("update() forwards id + data", async () => {
    ctx.cat.update.mockResolvedValue({ id: "c1", labelKo: "갱신" });
    const svc = createCategoryService(ctx.config);
    const r = await svc.update("c1", { labelKo: "갱신" });
    expect(ctx.cat.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { labelKo: "갱신" },
    });
    expect(r.labelKo).toBe("갱신");
  });

  it("remove() blocks when in use (gallery count > 0)", async () => {
    ctx.gal.count.mockResolvedValue(3);
    const svc = createCategoryService(ctx.config);
    await expect(svc.remove("c1")).rejects.toThrow(/in use|사용/i);
    expect(ctx.cat.delete).not.toHaveBeenCalled();
  });

  it("remove() proceeds when count is 0", async () => {
    ctx.gal.count.mockResolvedValue(0);
    ctx.cat.delete.mockResolvedValue({ id: "c1" });
    const svc = createCategoryService(ctx.config);
    await svc.remove("c1");
    expect(ctx.cat.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
  });

  it("reorder() updates each id sortOrder via $transaction", async () => {
    ctx.cat.update.mockResolvedValue({ id: "any" });
    const svc = createCategoryService(ctx.config);
    await svc.reorder(["c1", "c2", "c3"]);
    expect(ctx.cat.update).toHaveBeenCalledTimes(3);
    expect(ctx.cat.update.mock.calls[0]?.[0]).toEqual({
      where: { id: "c1" },
      data: { sortOrder: 0 },
    });
    expect(ctx.cat.update.mock.calls[2]?.[0]).toEqual({
      where: { id: "c3" },
      data: { sortOrder: 2 },
    });
  });

  it("uses categoryModelName override when provided", async () => {
    const customCat: CategoryDelegateMock = {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    const prisma: any = {
      customCategory: customCat,
      gallery: { count: vi.fn() },
      $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
    };
    const config: GalleryConfig = {
      prisma,
      categoryModelName: "customCategory",
      apiWrapper: ((h: any) => (async () => h({} as any)) as any) as any,
      limits: { maxFeatured: 7, mosaicCount: 7, batchMax: 20 },
    };
    const svc = createCategoryService(config);
    await svc.list();
    expect(customCat.findMany).toHaveBeenCalled();
  });
});
