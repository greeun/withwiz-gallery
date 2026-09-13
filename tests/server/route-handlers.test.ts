import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGalleryRoutes } from "../../src/server/route-handlers";
import type {
  ApiContext,
  ApiWrapper,
  GalleryConfig,
  RouteHandler,
} from "../../src/types";

// ─── Mocked apiWrapper that synthesizes ApiContext from invoker-provided overrides ───
// The wrapper is called once per route at factory time and remembers the inner handler.
// Tests then call the returned RouteHandler with a "_ctx" smuggled via a fake NextRequest URL.

interface DelegateMock {
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

function makeDelegate(): DelegateMock {
  return {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  };
}

interface Harness {
  config: GalleryConfig;
  gal: DelegateMock;
  cat: DelegateMock;
  revalidate: ReturnType<typeof vi.fn>;
  callWith: (
    handler: RouteHandler,
    ctx: Partial<ApiContext> & {
      method?: string;
      url?: string;
      body?: unknown;
    },
  ) => Promise<Response>;
}

function makeHarness(overrides?: Partial<GalleryConfig>): Harness {
  const gal = makeDelegate();
  const cat = makeDelegate();
  const prisma: any = {
    gallery: gal,
    galleryCategory: cat,
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };

  const revalidate = vi.fn();

  // Each route stores its inner handler; the returned RouteHandler — when called by tests —
  // looks at a Symbol-keyed payload on globalThis to reconstruct ApiContext.
  const apiWrapper: ApiWrapper = (handler) => {
    return (async (_req: any, _routeCtx: any) => {
      // tests bypass next/server's NextRequest by passing a fully formed ApiContext via callWith.
      const ctx = (globalThis as any).__GK_TEST_CTX as ApiContext;
      return handler(ctx);
    }) as RouteHandler;
  };

  const config: GalleryConfig = {
    prisma,
    apiWrapper,
    authorIdFromContext: (ctx) => ctx.user?.id ?? "",
    limits: { maxFeatured: 7, mosaicCount: 7, batchMax: 20, captionMaxLength: 200 },
    revalidate,
    revalidatePaths: ["/", "/home/v1"],
    ...overrides,
  };

  async function callWith(
    handler: RouteHandler,
    ctxOverride: Partial<ApiContext> & {
      method?: string;
      url?: string;
      body?: unknown;
    },
  ): Promise<Response> {
    const url = ctxOverride.url ?? "http://localhost/api/admin/galleries";
    const body = ctxOverride.body;
    const fakeRequest = {
      url,
      json: async () => body,
    };
    const userPresent = "user" in ctxOverride;
    const ctx: ApiContext = {
      request: fakeRequest as any,
      user: userPresent ? ctxOverride.user : { id: "user-1" },
      params: ctxOverride.params,
    };
    (globalThis as any).__GK_TEST_CTX = ctx;
    try {
      return await handler({} as any, undefined as any);
    } finally {
      (globalThis as any).__GK_TEST_CTX = undefined;
    }
  }

  return { config, gal, cat, revalidate, callWith };
}

// ─── collection ──────────────────────────────────────────

describe("createGalleryRoutes.collection.GET", () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it("returns paginated list with default pagination", async () => {
    h.gal.findMany.mockResolvedValue([{ id: "g1" }, { id: "g2" }]);
    h.gal.count.mockResolvedValue(2);
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.collection.GET, {
      url: "http://localhost/api/admin/galleries",
    });
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.items).toHaveLength(2);
    expect(json.data.meta.total).toBe(2);
  });

  it("parses categoryId / published / search / sortBy from query", async () => {
    h.gal.findMany.mockResolvedValue([]);
    h.gal.count.mockResolvedValue(0);
    const routes = createGalleryRoutes(h.config);
    await h.callWith(routes.collection.GET, {
      url: "http://localhost/api/admin/galleries?categoryId=cat-1&published=true&search=foo&sortBy=createdAt",
    });
    const arg = h.gal.findMany.mock.calls[0]?.[0];
    expect(arg.where).toEqual({
      categoryId: "cat-1",
      published: true,
      caption: { contains: "foo", mode: "insensitive" },
    });
    expect(arg.orderBy).toEqual({ createdAt: "desc" });
  });
});

describe("createGalleryRoutes.collection.POST", () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  const validBody = {
    imageUrl: "https://cdn.example.com/a.jpg",
    categoryId: "ckaaaaaaaaaaaaaaaaaaaaaaa",
  };

  it("creates gallery and revalidates", async () => {
    h.gal.create.mockResolvedValue({ id: "new-1", ...validBody });
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.collection.POST, {
      body: validBody,
    });
    expect(res.status).toBe(201);
    const json: any = await res.json();
    expect(json.data.id).toBe("new-1");
    expect(h.revalidate).toHaveBeenCalledTimes(2);
    expect(h.revalidate).toHaveBeenCalledWith("/");
    expect(h.revalidate).toHaveBeenCalledWith("/home/v1");
  });

  it("returns 400 on invalid body", async () => {
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.collection.POST, {
      body: { imageUrl: "not-a-url" },
    });
    expect(res.status).toBe(400);
    expect(h.gal.create).not.toHaveBeenCalled();
    expect(h.revalidate).not.toHaveBeenCalled();
  });

  it("returns 401 if user id missing", async () => {
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.collection.POST, {
      body: validBody,
      user: undefined as any,
    });
    expect(res.status).toBe(401);
  });
});

describe("createGalleryRoutes.collection.DELETE", () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it("removes many and revalidates", async () => {
    h.gal.deleteMany.mockResolvedValue({ count: 3 });
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.collection.DELETE, {
      body: { ids: ["a", "b", "c"] },
    });
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.data.count).toBe(3);
    expect(h.revalidate).toHaveBeenCalledTimes(2);
  });

  it("returns 400 on missing ids", async () => {
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.collection.DELETE, {
      body: { ids: [] },
    });
    expect(res.status).toBe(400);
    expect(h.revalidate).not.toHaveBeenCalled();
  });

  it("returns 400 when ids exceed batchMax", async () => {
    const routes = createGalleryRoutes(h.config);
    const ids = Array.from({ length: 21 }, (_, i) => `id-${i}`);
    const res = await h.callWith(routes.collection.DELETE, { body: { ids } });
    expect(res.status).toBe(400);
    expect(h.gal.deleteMany).not.toHaveBeenCalled();
  });

  it("returns 403 when canDelete denies any target (no partial delete)", async () => {
    h = makeHarness({
      permissions: { canDelete: (_ctx, g) => g.authorId === "user-1" },
    });
    h.gal.findMany.mockResolvedValue([
      { id: "a", authorId: "user-1" },
      { id: "b", authorId: "someone-else" },
    ]);
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.collection.DELETE, {
      body: { ids: ["a", "b"] },
    });
    expect(res.status).toBe(403);
    expect(h.gal.deleteMany).not.toHaveBeenCalled();
    expect(h.revalidate).not.toHaveBeenCalled();
  });

  it("returns 404 when canDelete is set and some ids do not exist", async () => {
    h = makeHarness({ permissions: { canDelete: () => true } });
    h.gal.findMany.mockResolvedValue([{ id: "a", authorId: "user-1" }]);
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.collection.DELETE, {
      body: { ids: ["a", "missing"] },
    });
    expect(res.status).toBe(404);
    expect(h.gal.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes when canDelete approves all targets", async () => {
    h = makeHarness({
      permissions: { canDelete: (_ctx, g) => g.authorId === "user-1" },
    });
    h.gal.findMany.mockResolvedValue([
      { id: "a", authorId: "user-1" },
      { id: "b", authorId: "user-1" },
    ]);
    h.gal.deleteMany.mockResolvedValue({ count: 2 });
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.collection.DELETE, {
      body: { ids: ["a", "b"] },
    });
    expect(res.status).toBe(200);
    expect(h.gal.deleteMany).toHaveBeenCalledTimes(1);
  });
});

// ─── item ────────────────────────────────────────────────

describe("createGalleryRoutes.item.GET", () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it("returns 200 with data when found", async () => {
    h.gal.findUnique.mockResolvedValue({ id: "g1", authorId: "u1" });
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.item.GET, {
      params: { id: "g1" },
    });
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.data.id).toBe("g1");
  });

  it("returns 404 when not found", async () => {
    h.gal.findUnique.mockResolvedValue(null);
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.item.GET, {
      params: { id: "missing" },
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when id param missing", async () => {
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.item.GET, {});
    expect(res.status).toBe(400);
  });
});

describe("createGalleryRoutes.item.PUT", () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it("updates item, revalidates, returns 200", async () => {
    h.gal.findUnique.mockResolvedValue({ id: "g1", authorId: "u1" });
    h.gal.update.mockResolvedValue({ id: "g1", caption: "updated" });
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.item.PUT, {
      params: { id: "g1" },
      body: { caption: "updated" },
    });
    expect(res.status).toBe(200);
    expect(h.revalidate).toHaveBeenCalledTimes(2);
  });

  it("updates only the provided fields (omitted sortOrder/featured/published stay as-is)", async () => {
    h.gal.findUnique.mockResolvedValue({ id: "g1", authorId: "u1" });
    h.gal.update.mockResolvedValue({ id: "g1", caption: "updated" });
    const routes = createGalleryRoutes(h.config);
    await h.callWith(routes.item.PUT, {
      params: { id: "g1" },
      body: { caption: "updated" },
    });
    expect(h.gal.update).toHaveBeenCalledTimes(1);
    expect(h.gal.update.mock.calls[0][0].data).toStrictEqual({ caption: "updated" });
  });

  it("returns 404 when target not found", async () => {
    h.gal.findUnique.mockResolvedValue(null);
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.item.PUT, {
      params: { id: "missing" },
      body: { caption: "x" },
    });
    expect(res.status).toBe(404);
    expect(h.revalidate).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid body", async () => {
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.item.PUT, {
      params: { id: "g1" },
      body: { sortOrder: -1 },
    });
    expect(res.status).toBe(400);
  });

  it("returns 403 when canEdit policy denies", async () => {
    h.gal.findUnique.mockResolvedValue({ id: "g1", authorId: "other" });
    const config: GalleryConfig = {
      ...h.config,
      permissions: { canEdit: () => false },
    };
    const routes = createGalleryRoutes(config);
    const res = await h.callWith(routes.item.PUT, {
      params: { id: "g1" },
      body: { caption: "x" },
    });
    expect(res.status).toBe(403);
    expect(h.gal.update).not.toHaveBeenCalled();
    expect(h.revalidate).not.toHaveBeenCalled();
  });

  it("allows update when canEdit policy approves", async () => {
    h.gal.findUnique.mockResolvedValue({ id: "g1", authorId: "user-1" });
    h.gal.update.mockResolvedValue({ id: "g1", caption: "ok" });
    const config: GalleryConfig = {
      ...h.config,
      permissions: { canEdit: (_ctx, g) => g.authorId === "user-1" },
    };
    const routes = createGalleryRoutes(config);
    const res = await h.callWith(routes.item.PUT, {
      params: { id: "g1" },
      body: { caption: "ok" },
    });
    expect(res.status).toBe(200);
  });
});

describe("createGalleryRoutes.item.DELETE", () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it("deletes item and revalidates (no permissions)", async () => {
    h.gal.delete.mockResolvedValue({});
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.item.DELETE, {
      params: { id: "g1" },
    });
    expect(res.status).toBe(204);
    expect(h.gal.delete).toHaveBeenCalled();
    expect(h.revalidate).toHaveBeenCalledTimes(2);
  });

  it("returns 403 when canDelete denies", async () => {
    h.gal.findUnique.mockResolvedValue({ id: "g1", authorId: "other" });
    const config: GalleryConfig = {
      ...h.config,
      permissions: { canDelete: () => false },
    };
    const routes = createGalleryRoutes(config);
    const res = await h.callWith(routes.item.DELETE, {
      params: { id: "g1" },
    });
    expect(res.status).toBe(403);
    expect(h.gal.delete).not.toHaveBeenCalled();
  });

  it("returns 404 when canDelete is set but item missing", async () => {
    h.gal.findUnique.mockResolvedValue(null);
    const config: GalleryConfig = {
      ...h.config,
      permissions: { canDelete: () => true },
    };
    const routes = createGalleryRoutes(config);
    const res = await h.callWith(routes.item.DELETE, {
      params: { id: "missing" },
    });
    expect(res.status).toBe(404);
  });
});

// ─── publishToggle ───────────────────────────────────────

describe("createGalleryRoutes.publishToggle.PATCH", () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it("toggles publish flag and revalidates", async () => {
    h.gal.findUnique
      .mockResolvedValueOnce({ published: false }) // togglePublish read
      .mockResolvedValueOnce({ published: false }); // permission check (not exercised)
    h.gal.update.mockResolvedValue({ id: "g1", published: true });
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.publishToggle.PATCH, {
      params: { id: "g1" },
    });
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.data.published).toBe(true);
    expect(h.revalidate).toHaveBeenCalledTimes(2);
  });

  it("returns 404 when service throws not-found", async () => {
    h.gal.findUnique.mockResolvedValue(null);
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.publishToggle.PATCH, {
      params: { id: "missing" },
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when id param missing", async () => {
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.publishToggle.PATCH, {});
    expect(res.status).toBe(400);
  });
});

// ─── bulk ────────────────────────────────────────────────

describe("createGalleryRoutes.bulk.POST", () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it("creates many and returns count 201", async () => {
    h.gal.createMany.mockResolvedValue({ count: 3 });
    const routes = createGalleryRoutes(h.config);
    const validItems = [
      {
        imageUrl: "https://cdn.example.com/1.jpg",
        categoryId: "ckaaaaaaaaaaaaaaaaaaaaaaa",
      },
      {
        imageUrl: "https://cdn.example.com/2.jpg",
        categoryId: "ckaaaaaaaaaaaaaaaaaaaaaaa",
      },
      {
        imageUrl: "https://cdn.example.com/3.jpg",
        categoryId: "ckaaaaaaaaaaaaaaaaaaaaaaa",
      },
    ];
    const res = await h.callWith(routes.bulk.POST, {
      body: { items: validItems },
    });
    expect(res.status).toBe(201);
    const json: any = await res.json();
    expect(json.data.count).toBe(3);
    expect(h.revalidate).toHaveBeenCalledTimes(2);
  });

  it("returns 400 on invalid items", async () => {
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.bulk.POST, {
      body: { items: [] },
    });
    expect(res.status).toBe(400);
  });
});

describe("createGalleryRoutes.bulk.PATCH", () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it("bulk-updates published flag and revalidates", async () => {
    h.gal.updateMany.mockResolvedValue({ count: 4 });
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.bulk.PATCH, {
      body: {
        ids: ["ckaaaaaaaaaaaaaaaaaaaaaaa", "ckbbbbbbbbbbbbbbbbbbbbbbb"],
        published: true,
      },
    });
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.data.count).toBe(4);
    expect(h.revalidate).toHaveBeenCalledTimes(2);
  });

  it("returns 400 on invalid ids", async () => {
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.bulk.PATCH, {
      body: { ids: [], published: true },
    });
    expect(res.status).toBe(400);
  });

  it("returns 200 with count 0 when neither published nor featured given", async () => {
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.bulk.PATCH, {
      body: { ids: ["ckaaaaaaaaaaaaaaaaaaaaaaa"] },
    });
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.data.count).toBe(0);
  });

  it("returns 403 when canEdit denies any target", async () => {
    h = makeHarness({
      permissions: { canEdit: (_ctx, g) => g.authorId === "user-1" },
    });
    h.gal.findMany.mockResolvedValue([
      { id: "ckaaaaaaaaaaaaaaaaaaaaaaa", authorId: "user-1" },
      { id: "ckbbbbbbbbbbbbbbbbbbbbbbb", authorId: "other" },
    ]);
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.bulk.PATCH, {
      body: {
        ids: ["ckaaaaaaaaaaaaaaaaaaaaaaa", "ckbbbbbbbbbbbbbbbbbbbbbbb"],
        published: true,
      },
    });
    expect(res.status).toBe(403);
    expect(h.gal.updateMany).not.toHaveBeenCalled();
    expect(h.revalidate).not.toHaveBeenCalled();
  });

  it("bulk-updates when canEdit approves all targets", async () => {
    h = makeHarness({ permissions: { canEdit: () => true } });
    h.gal.findMany.mockResolvedValue([
      { id: "ckaaaaaaaaaaaaaaaaaaaaaaa", authorId: "user-1" },
    ]);
    h.gal.updateMany.mockResolvedValue({ count: 1 });
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.bulk.PATCH, {
      body: { ids: ["ckaaaaaaaaaaaaaaaaaaaaaaa"], featured: true },
    });
    expect(res.status).toBe(200);
    expect(h.gal.updateMany).toHaveBeenCalledTimes(1);
  });
});

// ─── categoryCollection ──────────────────────────────────

describe("createGalleryRoutes.categoryCollection.GET", () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it("lists categories without filter", async () => {
    h.cat.findMany.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.categoryCollection.GET, {
      url: "http://localhost/api/admin/gallery-categories",
    });
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.data).toHaveLength(2);
    const arg = h.cat.findMany.mock.calls[0]?.[0];
    expect(arg.where).toBeUndefined();
  });

  it("passes isActive filter from query", async () => {
    h.cat.findMany.mockResolvedValue([]);
    const routes = createGalleryRoutes(h.config);
    await h.callWith(routes.categoryCollection.GET, {
      url: "http://localhost/api/admin/gallery-categories?isActive=true",
    });
    const arg = h.cat.findMany.mock.calls[0]?.[0];
    expect(arg.where).toEqual({ isActive: true });
  });
});

describe("createGalleryRoutes.categoryCollection.POST", () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it("creates category 201", async () => {
    h.cat.create.mockResolvedValue({ id: "c1", slug: "PERFORMANCE" });
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.categoryCollection.POST, {
      body: { slug: "PERFORMANCE", labelKo: "공연" },
    });
    expect(res.status).toBe(201);
    expect(h.revalidate).toHaveBeenCalledTimes(2);
  });

  it("returns 400 on invalid slug", async () => {
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.categoryCollection.POST, {
      body: { slug: "lowercase", labelKo: "x" },
    });
    expect(res.status).toBe(400);
  });
});

// ─── categoryItem ────────────────────────────────────────

describe("createGalleryRoutes.categoryItem.GET", () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it("returns 200 when category exists", async () => {
    h.cat.findUnique.mockResolvedValue({ id: "c1", slug: "PERFORMANCE" });
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.categoryItem.GET, {
      params: { id: "c1" },
    });
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    h.cat.findUnique.mockResolvedValue(null);
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.categoryItem.GET, {
      params: { id: "missing" },
    });
    expect(res.status).toBe(404);
  });
});

describe("createGalleryRoutes.categoryItem.PUT", () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it("updates category and revalidates", async () => {
    h.cat.findUnique.mockResolvedValue({ id: "c1" });
    h.cat.update.mockResolvedValue({ id: "c1", labelKo: "수정" });
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.categoryItem.PUT, {
      params: { id: "c1" },
      body: { labelKo: "수정" },
    });
    expect(res.status).toBe(200);
    expect(h.revalidate).toHaveBeenCalledTimes(2);
  });

  it("updates only the provided fields (omitted sortOrder/isActive stay as-is)", async () => {
    h.cat.findUnique.mockResolvedValue({ id: "c1" });
    h.cat.update.mockResolvedValue({ id: "c1", labelKo: "수정" });
    const routes = createGalleryRoutes(h.config);
    await h.callWith(routes.categoryItem.PUT, {
      params: { id: "c1" },
      body: { labelKo: "수정" },
    });
    expect(h.cat.update).toHaveBeenCalledTimes(1);
    expect(h.cat.update.mock.calls[0][0].data).toStrictEqual({ labelKo: "수정" });
  });

  it("returns 404 when category missing", async () => {
    h.cat.findUnique.mockResolvedValue(null);
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.categoryItem.PUT, {
      params: { id: "missing" },
      body: { labelKo: "x" },
    });
    expect(res.status).toBe(404);
  });
});

describe("createGalleryRoutes.categoryItem.DELETE", () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it("deletes category when not in use and revalidates", async () => {
    h.gal.count.mockResolvedValue(0);
    h.cat.delete.mockResolvedValue({});
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.categoryItem.DELETE, {
      params: { id: "c1" },
    });
    expect(res.status).toBe(204);
    expect(h.revalidate).toHaveBeenCalledTimes(2);
  });

  it("returns 409 when category in use", async () => {
    h.gal.count.mockResolvedValue(5);
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.categoryItem.DELETE, {
      params: { id: "c1" },
    });
    expect(res.status).toBe(409);
    expect(h.cat.delete).not.toHaveBeenCalled();
    expect(h.revalidate).not.toHaveBeenCalled();
  });

  it("returns 400 when id missing", async () => {
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.categoryItem.DELETE, {});
    expect(res.status).toBe(400);
  });
});

// ─── canManageCategories ─────────────────────────────────

describe("createGalleryRoutes — permissions.canManageCategories", () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness({ permissions: { canManageCategories: () => false } });
  });

  it("returns 403 on category POST when denied", async () => {
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.categoryCollection.POST, {
      body: { slug: "NEW", labelKo: "새" },
    });
    expect(res.status).toBe(403);
    expect(h.cat.create).not.toHaveBeenCalled();
  });

  it("returns 403 on category PUT when denied", async () => {
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.categoryItem.PUT, {
      params: { id: "c1" },
      body: { labelKo: "변경" },
    });
    expect(res.status).toBe(403);
    expect(h.cat.update).not.toHaveBeenCalled();
  });

  it("returns 403 on category DELETE when denied", async () => {
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.categoryItem.DELETE, {
      params: { id: "c1" },
    });
    expect(res.status).toBe(403);
    expect(h.cat.delete).not.toHaveBeenCalled();
  });

  it("still allows category GET when denied (read is not gated)", async () => {
    h.cat.findMany.mockResolvedValue([]);
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.categoryCollection.GET, {});
    expect(res.status).toBe(200);
  });
});

// ─── search length cap ───────────────────────────────────

describe("createGalleryRoutes.collection.GET — search length cap", () => {
  it("truncates search to searchMaxLength (default 100)", async () => {
    const h = makeHarness();
    h.gal.findMany.mockResolvedValue([]);
    h.gal.count.mockResolvedValue(0);
    const routes = createGalleryRoutes(h.config);
    await h.callWith(routes.collection.GET, {
      url: `http://localhost/api/admin/galleries?search=${"x".repeat(500)}`,
    });
    const arg = h.gal.findMany.mock.calls[0][0];
    expect(arg.where.caption.contains).toHaveLength(100);
  });

  it("respects config.validation.searchMaxLength", async () => {
    const h = makeHarness({ validation: { searchMaxLength: 10 } });
    h.gal.findMany.mockResolvedValue([]);
    h.gal.count.mockResolvedValue(0);
    const routes = createGalleryRoutes(h.config);
    await h.callWith(routes.collection.GET, {
      url: `http://localhost/api/admin/galleries?search=${"y".repeat(50)}`,
    });
    const arg = h.gal.findMany.mock.calls[0][0];
    expect(arg.where.caption.contains).toHaveLength(10);
  });
});

// ─── revalidate fallback (no config.revalidate / paths) ───

describe("createGalleryRoutes — no revalidate config", () => {
  it("works without revalidate / revalidatePaths set", async () => {
    const h = makeHarness({ revalidate: undefined, revalidatePaths: undefined });
    h.gal.create.mockResolvedValue({ id: "g1" });
    const routes = createGalleryRoutes(h.config);
    const res = await h.callWith(routes.collection.POST, {
      body: {
        imageUrl: "https://cdn.example.com/a.jpg",
        categoryId: "ckaaaaaaaaaaaaaaaaaaaaaaa",
      },
    });
    expect(res.status).toBe(201);
    expect(h.revalidate).not.toHaveBeenCalled();
  });
});
