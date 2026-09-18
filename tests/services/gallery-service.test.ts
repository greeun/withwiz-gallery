import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGalleryService } from "../../src/services";
import { FeaturedLimitExceededError, GalleryNotFoundError } from "../../src/errors";
import type { GalleryConfig } from "../../src/types";

interface GalleryDelegateMock {
  findMany: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  createMany: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
}

function makeMock() {
  const gal: GalleryDelegateMock = {
    // Prisma findMany 는 결과가 없어도 배열을 돌려준다. 목도 같은 계약을 지킨다.
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  };
  const prisma: any = {
    gallery: gal,
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };
  const storage = {
    isEnabled: vi.fn().mockReturnValue(false),
    collectKeys: vi.fn((k: string) => [k, `${k}_md`, `${k}_thumb`]),
    deleteKeys: vi.fn().mockResolvedValue(undefined),
  };
  const config: GalleryConfig = {
    prisma,
    apiWrapper: ((h: any) => (async () => h({} as any)) as any) as any,
    storage,
    limits: { maxFeatured: 7, mosaicCount: 7, batchMax: 20 },
  };
  return { config, gal, storage };
}

describe("createGalleryService", () => {
  let ctx: ReturnType<typeof makeMock>;
  beforeEach(() => {
    ctx = makeMock();
  });

  it("listFeatured queries published+featured with category include", async () => {
    ctx.gal.findMany.mockResolvedValue([{ id: "g1" }]);
    const svc = createGalleryService(ctx.config);
    const r = await svc.listFeatured(5);
    const arg = ctx.gal.findMany.mock.calls[0]?.[0];
    expect(arg.where).toEqual({ published: true, featured: true });
    expect(arg.include).toEqual({ category: true });
    expect(arg.take).toBe(5);
    expect(r).toHaveLength(1);
  });

  it("listFeatured without limit omits take", async () => {
    ctx.gal.findMany.mockResolvedValue([]);
    const svc = createGalleryService(ctx.config);
    await svc.listFeatured();
    const arg = ctx.gal.findMany.mock.calls[0]?.[0];
    expect(arg.take).toBeUndefined();
  });

  it("listPublished queries published", async () => {
    ctx.gal.findMany.mockResolvedValue([]);
    const svc = createGalleryService(ctx.config);
    await svc.listPublished(10);
    const arg = ctx.gal.findMany.mock.calls[0]?.[0];
    expect(arg.where).toEqual({ published: true });
    expect(arg.take).toBe(10);
  });

  it("listPublishedByCategory filters by category.slug", async () => {
    ctx.gal.findMany.mockResolvedValue([]);
    const svc = createGalleryService(ctx.config);
    await svc.listPublishedByCategory("PERFORMANCE", 3);
    const arg = ctx.gal.findMany.mock.calls[0]?.[0];
    expect(arg.where).toEqual({
      published: true,
      category: { slug: "PERFORMANCE" },
    });
    expect(arg.take).toBe(3);
  });

  it("listAll returns paginated result with category include and where filters", async () => {
    ctx.gal.findMany.mockResolvedValue([{ id: "g1" }, { id: "g2" }]);
    ctx.gal.count.mockResolvedValue(7);
    const svc = createGalleryService(ctx.config);
    const r = await svc.listAll({
      page: 2,
      limit: 2,
      categoryId: "catX",
      published: true,
      search: "tour",
    });
    const arg = ctx.gal.findMany.mock.calls[0]?.[0];
    expect(arg.where).toEqual({
      categoryId: "catX",
      published: true,
      caption: { contains: "tour", mode: "insensitive" },
    });
    expect(arg.include).toEqual({ category: true });
    expect(arg.skip).toBe(2);
    expect(arg.take).toBe(2);
    expect(r.items).toHaveLength(2);
    expect(r.meta.total).toBe(7);
    expect(r.meta.totalPages).toBe(4);
    expect(r.meta.hasNext).toBe(true);
    expect(r.meta.hasPrev).toBe(true);
  });

  it("listAll uses default sortBy=sortOrder if not provided", async () => {
    ctx.gal.findMany.mockResolvedValue([]);
    ctx.gal.count.mockResolvedValue(0);
    const svc = createGalleryService(ctx.config);
    await svc.listAll({});
    const arg = ctx.gal.findMany.mock.calls[0]?.[0];
    expect(arg.orderBy).toEqual([{ sortOrder: "asc" }, { createdAt: "desc" }]);
  });

  it("listAll never includes author in include clause", async () => {
    ctx.gal.findMany.mockResolvedValue([]);
    ctx.gal.count.mockResolvedValue(0);
    const svc = createGalleryService(ctx.config);
    await svc.listAll({});
    const arg = ctx.gal.findMany.mock.calls[0]?.[0];
    expect(arg.include).toEqual({ category: true });
    expect(arg.include.author).toBeUndefined();
  });

  it("getById returns row or null with category include", async () => {
    ctx.gal.findUnique.mockResolvedValue({ id: "g1" });
    const svc = createGalleryService(ctx.config);
    const r = await svc.getById("g1");
    const arg = ctx.gal.findUnique.mock.calls[0]?.[0];
    expect(arg.where).toEqual({ id: "g1" });
    expect(arg.include).toEqual({ category: true });
    expect(r?.id).toBe("g1");
  });

  it("create() builds data with authorId, defaults, and category include", async () => {
    ctx.gal.create.mockResolvedValue({ id: "g1" });
    const svc = createGalleryService(ctx.config);
    await svc.create(
      {
        imageUrl: "https://x/y.webp",
        categoryId: "catX",
      },
      "user-1",
    );
    const arg = ctx.gal.create.mock.calls[0]?.[0];
    expect(arg.data.imageUrl).toBe("https://x/y.webp");
    expect(arg.data.categoryId).toBe("catX");
    expect(arg.data.authorId).toBe("user-1");
    expect(arg.data.sortOrder).toBe(0);
    expect(arg.data.featured).toBe(false);
    expect(arg.data.published).toBe(false);
    expect(arg.include).toEqual({ category: true });
  });

  it("createMany returns { count } and maps fields with authorId", async () => {
    ctx.gal.createMany.mockResolvedValue({ count: 2 });
    const svc = createGalleryService(ctx.config);
    const r = await svc.createMany(
      [
        { imageUrl: "https://x/a.webp", categoryId: "catX" },
        { imageUrl: "https://x/b.webp", categoryId: "catX", caption: "b" },
      ],
      "user-1",
    );
    expect(r).toEqual({ count: 2 });
    const arg = ctx.gal.createMany.mock.calls[0]?.[0];
    expect(arg.data).toHaveLength(2);
    expect(arg.data[0].authorId).toBe("user-1");
    expect(arg.data[1].caption).toBe("b");
  });

  it("update() forwards only defined fields", async () => {
    ctx.gal.update.mockResolvedValue({ id: "g1" });
    const svc = createGalleryService(ctx.config);
    await svc.update("g1", { caption: "new", published: true });
    const arg = ctx.gal.update.mock.calls[0]?.[0];
    expect(arg.where).toEqual({ id: "g1" });
    expect(arg.data).toEqual({ caption: "new", published: true });
    expect(arg.include).toEqual({ category: true });
  });

  it("remove() without storage just deletes", async () => {
    ctx.gal.findUnique.mockResolvedValue({ imageKey: "abc.webp" });
    ctx.storage.isEnabled.mockReturnValue(false);
    const svc = createGalleryService(ctx.config);
    await svc.remove("g1");
    expect(ctx.gal.delete).toHaveBeenCalledWith({ where: { id: "g1" } });
    expect(ctx.storage.deleteKeys).not.toHaveBeenCalled();
  });

  it("remove() with storage enabled also deletes keys", async () => {
    ctx.gal.findUnique.mockResolvedValue({ imageKey: "abc.webp" });
    ctx.storage.isEnabled.mockReturnValue(true);
    const svc = createGalleryService(ctx.config);
    await svc.remove("g1");
    expect(ctx.gal.delete).toHaveBeenCalledWith({ where: { id: "g1" } });
    expect(ctx.storage.collectKeys).toHaveBeenCalledWith("abc.webp");
    expect(ctx.storage.deleteKeys).toHaveBeenCalled();
  });

  it("remove() with storage enabled but no imageKey skips collect", async () => {
    ctx.gal.findUnique.mockResolvedValue({ imageKey: null });
    ctx.storage.isEnabled.mockReturnValue(true);
    const svc = createGalleryService(ctx.config);
    await svc.remove("g1");
    expect(ctx.gal.delete).toHaveBeenCalled();
    expect(ctx.storage.collectKeys).not.toHaveBeenCalled();
    expect(ctx.storage.deleteKeys).not.toHaveBeenCalled();
  });

  it("removeMany returns { count } and collects keys when storage enabled", async () => {
    ctx.storage.isEnabled.mockReturnValue(true);
    ctx.gal.findMany.mockResolvedValue([
      { imageKey: "a.webp" },
      { imageKey: "b.webp" },
      { imageKey: null },
    ]);
    ctx.gal.deleteMany.mockResolvedValue({ count: 3 });
    const svc = createGalleryService(ctx.config);
    const r = await svc.removeMany(["g1", "g2", "g3"]);
    expect(r).toEqual({ count: 3 });
    expect(ctx.storage.deleteKeys).toHaveBeenCalled();
    // 호출된 keys 는 collectKeys 결과들의 union
    const keys = ctx.storage.deleteKeys.mock.calls[0]?.[0] as string[];
    expect(keys.length).toBeGreaterThan(0);
  });

  it("removeMany without storage skips key collection", async () => {
    ctx.storage.isEnabled.mockReturnValue(false);
    ctx.gal.deleteMany.mockResolvedValue({ count: 2 });
    const svc = createGalleryService(ctx.config);
    const r = await svc.removeMany(["g1", "g2"]);
    expect(r).toEqual({ count: 2 });
    expect(ctx.gal.findMany).not.toHaveBeenCalled();
    expect(ctx.storage.deleteKeys).not.toHaveBeenCalled();
  });

  it("bulkUpdatePublished returns { count }", async () => {
    ctx.gal.updateMany.mockResolvedValue({ count: 3 });
    const svc = createGalleryService(ctx.config);
    const r = await svc.bulkUpdatePublished(["a", "b", "c"], true);
    expect(r).toEqual({ count: 3 });
    const arg = ctx.gal.updateMany.mock.calls[0]?.[0];
    expect(arg.where).toEqual({ id: { in: ["a", "b", "c"] } });
    expect(arg.data.published).toBe(true);
  });

  it("bulkUpdateFeatured returns { count }", async () => {
    ctx.gal.updateMany.mockResolvedValue({ count: 2 });
    const svc = createGalleryService(ctx.config);
    const r = await svc.bulkUpdateFeatured(["a", "b"], false);
    expect(r).toEqual({ count: 2 });
    const arg = ctx.gal.updateMany.mock.calls[0]?.[0];
    expect(arg.data.featured).toBe(false);
  });

  it("togglePublish returns full detail with flipped published", async () => {
    ctx.gal.findUnique.mockResolvedValue({ published: false });
    ctx.gal.update.mockResolvedValue({ id: "g1", published: true });
    const svc = createGalleryService(ctx.config);
    const r = await svc.togglePublish("g1");
    const arg = ctx.gal.update.mock.calls[0]?.[0];
    expect(arg.data.published).toBe(true);
    expect(arg.include).toEqual({ category: true });
    expect(r.published).toBe(true);
  });

  it("togglePublish throws GalleryNotFoundError when not found", async () => {
    ctx.gal.findUnique.mockResolvedValue(null);
    const svc = createGalleryService(ctx.config);
    await expect(svc.togglePublish("missing")).rejects.toBeInstanceOf(
      GalleryNotFoundError,
    );
  });

  it("togglePublish — thrown error carries id", async () => {
    ctx.gal.findUnique.mockResolvedValue(null);
    const svc = createGalleryService(ctx.config);
    try {
      await svc.togglePublish("missing-id-xyz");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(GalleryNotFoundError);
      expect((e as GalleryNotFoundError).id).toBe("missing-id-xyz");
    }
  });

  it("count() returns prisma.count result", async () => {
    ctx.gal.count.mockResolvedValue(42);
    const svc = createGalleryService(ctx.config);
    const r = await svc.count();
    expect(r).toBe(42);
    expect(ctx.gal.count).toHaveBeenCalledWith({});
  });

  it("count({ published: true }) passes where clause", async () => {
    ctx.gal.count.mockResolvedValue(5);
    const svc = createGalleryService(ctx.config);
    await svc.count({ published: true });
    const arg = ctx.gal.count.mock.calls[0]?.[0];
    expect(arg.where).toEqual({ published: true });
  });

  it("listRecent orders by createdAt desc and applies take", async () => {
    ctx.gal.findMany.mockResolvedValue([]);
    const svc = createGalleryService(ctx.config);
    await svc.listRecent(5);
    const arg = ctx.gal.findMany.mock.calls[0]?.[0];
    expect(arg.orderBy).toEqual({ createdAt: "desc" });
    expect(arg.take).toBe(5);
    expect(arg.include).toEqual({ category: true });
  });

  it("uses modelName override when provided", async () => {
    const customGal: GalleryDelegateMock = {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    };
    const prisma: any = {
      photo: customGal,
      $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
    };
    const config: GalleryConfig = {
      prisma,
      modelName: "photo",
      apiWrapper: ((h: any) => (async () => h({} as any)) as any) as any,
      limits: { maxFeatured: 7, mosaicCount: 7, batchMax: 20 },
    };
    const svc = createGalleryService(config);
    await svc.listPublished();
    expect(customGal.findMany).toHaveBeenCalled();
  });
});

describe("featured 상한 서버 검사", () => {
  let ctx: ReturnType<typeof makeMock>;
  beforeEach(() => {
    ctx = makeMock();
  });

  it("create: featured 를 켜는데 이미 상한이면 거부한다", async () => {
    ctx.gal.count.mockResolvedValue(7); // maxFeatured 7
    const svc = createGalleryService(ctx.config);
    await expect(
      svc.create(
        { imageUrl: "https://cdn.test/a.jpg", categoryId: "cat-1", featured: true, published: true },
        "user-1",
      ),
    ).rejects.toThrow(FeaturedLimitExceededError);
    expect(ctx.gal.create).not.toHaveBeenCalled();
  });

  it("create: featured 가 아니면 상한과 무관하게 생성한다", async () => {
    ctx.gal.count.mockResolvedValue(7);
    ctx.gal.create.mockResolvedValue({ id: "g1" });
    const svc = createGalleryService(ctx.config);
    await svc.create(
      { imageUrl: "https://cdn.test/a.jpg", categoryId: "cat-1", featured: false, published: true },
      "user-1",
    );
    expect(ctx.gal.create).toHaveBeenCalled();
  });

  it("createMany: 일괄 featured 건수를 더해 상한을 넘으면 거부한다", async () => {
    ctx.gal.count.mockResolvedValue(5); // 남은 자리 2
    const svc = createGalleryService(ctx.config);
    const items = Array.from({ length: 3 }, (_, i) => ({
      imageUrl: `https://cdn.test/${i}.jpg`,
      categoryId: "cat-1",
      featured: true,
      published: true,
    }));
    await expect(svc.createMany(items, "user-1")).rejects.toThrow(FeaturedLimitExceededError);
    expect(ctx.gal.createMany).not.toHaveBeenCalled();
  });

  it("createMany: 남은 자리 안이면 생성한다", async () => {
    ctx.gal.count.mockResolvedValue(5);
    ctx.gal.createMany.mockResolvedValue({ count: 2 });
    const svc = createGalleryService(ctx.config);
    const items = Array.from({ length: 2 }, (_, i) => ({
      imageUrl: `https://cdn.test/${i}.jpg`,
      categoryId: "cat-1",
      featured: true,
      published: true,
    }));
    await svc.createMany(items, "user-1");
    expect(ctx.gal.createMany).toHaveBeenCalled();
  });

  it("update: featured 를 새로 켜는데 상한이면 거부한다", async () => {
    ctx.gal.findUnique.mockResolvedValue({ id: "g1", featured: false, published: true });
    ctx.gal.count.mockResolvedValue(7);
    const svc = createGalleryService(ctx.config);
    await expect(svc.update("g1", { featured: true })).rejects.toThrow(FeaturedLimitExceededError);
    expect(ctx.gal.update).not.toHaveBeenCalled();
  });

  it("update: featured 를 끄는 요청은 상한을 넘은 상태에서도 허용한다", async () => {
    ctx.gal.findUnique.mockResolvedValue({ id: "g1", featured: true, published: true });
    ctx.gal.count.mockResolvedValue(9); // 이미 상한 초과
    ctx.gal.update.mockResolvedValue({ id: "g1" });
    const svc = createGalleryService(ctx.config);
    await svc.update("g1", { featured: false });
    expect(ctx.gal.update).toHaveBeenCalled();
  });

  it("bulkUpdateFeatured: 새로 켜지는 건수를 더해 상한을 넘으면 거부한다", async () => {
    // 대상 3건 모두 공개·비featured, 현재 5건 → 5+3 > 7
    ctx.gal.findMany.mockResolvedValue([
      { id: "a", featured: false, published: true },
      { id: "b", featured: false, published: true },
      { id: "c", featured: false, published: true },
    ]);
    ctx.gal.count.mockResolvedValue(5);
    const svc = createGalleryService(ctx.config);
    await expect(svc.bulkUpdateFeatured(["a", "b", "c"], true)).rejects.toThrow(
      FeaturedLimitExceededError,
    );
    expect(ctx.gal.updateMany).not.toHaveBeenCalled();
  });

  it("bulkUpdateFeatured: 이미 featured 이거나 비공개인 대상은 새로 세지 않는다", async () => {
    // 3건 중 새로 집계에 드는 것은 c 하나뿐 → 6+1 = 7
    ctx.gal.findMany.mockResolvedValue([
      { id: "a", featured: true, published: true },
      { id: "b", featured: false, published: false },
      { id: "c", featured: false, published: true },
    ]);
    ctx.gal.count.mockResolvedValue(6);
    ctx.gal.updateMany.mockResolvedValue({ count: 3 });
    const svc = createGalleryService(ctx.config);
    await svc.bulkUpdateFeatured(["a", "b", "c"], true);
    expect(ctx.gal.updateMany).toHaveBeenCalled();
  });

  it("bulkUpdateFeatured: 끄는 요청은 상한을 넘은 상태에서도 허용한다", async () => {
    ctx.gal.count.mockResolvedValue(9);
    ctx.gal.updateMany.mockResolvedValue({ count: 2 });
    const svc = createGalleryService(ctx.config);
    await svc.bulkUpdateFeatured(["a", "b"], false);
    expect(ctx.gal.updateMany).toHaveBeenCalled();
  });

  it("bulkUpdatePublished: 공개로 바뀌며 집계에 드는 featured 건수를 검사한다", async () => {
    // 비공개 featured 2건을 공개로 → 6+2 > 7
    ctx.gal.findMany.mockResolvedValue([
      { id: "a", featured: true, published: false },
      { id: "b", featured: true, published: false },
    ]);
    ctx.gal.count.mockResolvedValue(6);
    const svc = createGalleryService(ctx.config);
    await expect(svc.bulkUpdatePublished(["a", "b"], true)).rejects.toThrow(
      FeaturedLimitExceededError,
    );
    expect(ctx.gal.updateMany).not.toHaveBeenCalled();
  });

  it("bulkUpdatePublished: 비공개로 바꾸는 요청은 검사하지 않는다", async () => {
    ctx.gal.count.mockResolvedValue(9);
    ctx.gal.updateMany.mockResolvedValue({ count: 2 });
    const svc = createGalleryService(ctx.config);
    await svc.bulkUpdatePublished(["a", "b"], false);
    expect(ctx.gal.updateMany).toHaveBeenCalled();
  });

  it("togglePublish: 비공개 featured 항목을 공개로 바꿀 때 상한을 검사한다", async () => {
    ctx.gal.findUnique.mockResolvedValue({ id: "g1", published: false, featured: true });
    ctx.gal.count.mockResolvedValue(7);
    const svc = createGalleryService(ctx.config);
    await expect(svc.togglePublish("g1")).rejects.toThrow(FeaturedLimitExceededError);
    expect(ctx.gal.update).not.toHaveBeenCalled();
  });

  it("togglePublish: 공개를 내리는 요청은 상한과 무관하다", async () => {
    ctx.gal.findUnique.mockResolvedValue({ id: "g1", published: true, featured: true });
    ctx.gal.count.mockResolvedValue(9);
    ctx.gal.update.mockResolvedValue({ id: "g1" });
    const svc = createGalleryService(ctx.config);
    await svc.togglePublish("g1");
    expect(ctx.gal.update).toHaveBeenCalled();
  });

  it("update: 이미 featured 인 항목의 다른 필드 수정은 상한 검사를 하지 않는다", async () => {
    ctx.gal.findUnique.mockResolvedValue({ id: "g1", featured: true, published: true });
    ctx.gal.count.mockResolvedValue(9);
    ctx.gal.update.mockResolvedValue({ id: "g1" });
    const svc = createGalleryService(ctx.config);
    await svc.update("g1", { caption: "수정" });
    expect(ctx.gal.update).toHaveBeenCalled();
  });
});
