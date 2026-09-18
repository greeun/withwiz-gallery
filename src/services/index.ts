import type {
  GalleryConfig,
  GalleryDetail,
  GalleryListItem,
  CreateGalleryInput,
  UpdateGalleryInput,
  PaginatedResult,
} from "../types";
import { FeaturedLimitExceededError, GalleryNotFoundError } from "../errors";
import { buildPaginatedResult } from "./helpers";

export { buildPaginatedResult } from "./helpers";
export { createCategoryService } from "./category-service";
export type { CategoryService } from "./category-service";

type SortKey = "sortOrder" | "createdAt" | "updatedAt" | "caption";

/**
 * spec §9-2 의 createGalleryService.
 *
 * 핵심 규칙:
 * - Prisma delegate 는 `config.prisma[config.modelName ?? "gallery"]` 패턴.
 * - `include: { category: true }` 만 사용. **author include 금지** (Gallery 모델에 author 관계 없음, §3 호스트 독립 원칙).
 * - 삭제 시 `config.storage` 가 isEnabled() true 면 collectKeys → deleteKeys.
 * - `revalidate` 는 service 에서 호출하지 않음 (route handler 책임).
 */
export function createGalleryService(config: GalleryConfig) {
  const galleryDelegate = () => config.prisma[config.modelName ?? "gallery"];
  const baseInclude = { category: true } as const;

  /**
   * 공개 상태로 featured 인 항목 수. 관리 화면의 홈 미리보기 계산(`featured && published`)과
   * 공개 목록 조회(`listFeatured`)가 쓰는 기준과 같다.
   */
  async function countFeatured(excludeId?: string): Promise<number> {
    const where: Record<string, unknown> = { published: true, featured: true };
    if (excludeId) where.id = { not: excludeId };
    return (await galleryDelegate().count({ where })) as number;
  }

  /**
   * featured 를 새로 켜는 요청만 상한을 검사한다. 이미 상한을 넘긴 기존 데이터는
   * 그대로 두고, featured 를 끄거나 다른 필드를 고치는 요청은 막지 않는다.
   */
  async function assertFeaturedRoom(adding: number, excludeId?: string): Promise<void> {
    if (adding <= 0) return;
    const limit = config.limits.maxFeatured;
    const current = await countFeatured(excludeId);
    if (current + adding > limit) {
      throw new FeaturedLimitExceededError(limit, current + adding);
    }
  }

  function orderByFor(sortBy: SortKey) {
    switch (sortBy) {
      case "sortOrder":
        return [{ sortOrder: "asc" as const }, { createdAt: "desc" as const }];
      case "caption":
        return { caption: "asc" as const };
      case "createdAt":
      case "updatedAt":
        return { [sortBy]: "desc" as const };
    }
  }

  // ── Public-facing read methods ─────────────────────

  async function listFeatured(limit?: number): Promise<GalleryListItem[]> {
    const rows = await galleryDelegate().findMany({
      where: { published: true, featured: true },
      include: baseInclude,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      ...(limit ? { take: limit } : {}),
    });
    return rows as GalleryListItem[];
  }

  async function listPublished(limit?: number): Promise<GalleryListItem[]> {
    const rows = await galleryDelegate().findMany({
      where: { published: true },
      include: baseInclude,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      ...(limit ? { take: limit } : {}),
    });
    return rows as GalleryListItem[];
  }

  async function listPublishedByCategory(
    categorySlug: string,
    limit?: number,
  ): Promise<GalleryListItem[]> {
    const rows = await galleryDelegate().findMany({
      where: { published: true, category: { slug: categorySlug } },
      include: baseInclude,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      ...(limit ? { take: limit } : {}),
    });
    return rows as GalleryListItem[];
  }

  // ── Admin list / detail ────────────────────────────

  async function listAll(opts: {
    page?: number;
    limit?: number;
    categoryId?: string;
    published?: boolean;
    search?: string;
    sortBy?: SortKey;
  }): Promise<PaginatedResult<GalleryListItem>> {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;
    const sortBy = opts.sortBy ?? "sortOrder";
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (opts.categoryId) where.categoryId = opts.categoryId;
    if (opts.published !== undefined) where.published = opts.published;
    if (opts.search) where.caption = { contains: opts.search, mode: "insensitive" };

    const [items, total] = await Promise.all([
      galleryDelegate().findMany({
        where,
        include: baseInclude,
        orderBy: orderByFor(sortBy),
        skip,
        take: limit,
      }),
      galleryDelegate().count({ where }),
    ]);

    return buildPaginatedResult(items as GalleryListItem[], page, limit, total);
  }

  async function getById(id: string): Promise<GalleryDetail | null> {
    const row = await galleryDelegate().findUnique({
      where: { id },
      include: baseInclude,
    });
    return (row as GalleryDetail | null) ?? null;
  }

  /**
   * bulk 권한 검사용 — ids 에 해당하는 row 의 {id, authorId} 만 조회.
   * 존재하지 않는 id 는 결과에서 빠진다 (caller 가 길이 비교로 판단).
   */
  async function getAuthorIds(
    ids: string[],
  ): Promise<Array<{ id: string; authorId: string }>> {
    const rows = await galleryDelegate().findMany({
      where: { id: { in: ids } },
      select: { id: true, authorId: true },
    });
    return rows as Array<{ id: string; authorId: string }>;
  }

  // ── Mutations ──────────────────────────────────────

  async function create(
    data: CreateGalleryInput,
    authorId: string,
  ): Promise<GalleryDetail> {
    if (data.featured === true && data.published === true) {
      await assertFeaturedRoom(1);
    }
    const row = await galleryDelegate().create({
      data: {
        imageUrl: data.imageUrl,
        imageKey: data.imageKey ?? null,
        caption: data.caption ?? null,
        categoryId: data.categoryId,
        sortOrder: data.sortOrder ?? 0,
        featured: data.featured ?? false,
        published: data.published ?? false,
        authorId,
      },
      include: baseInclude,
    });
    return row as GalleryDetail;
  }

  async function createMany(
    items: CreateGalleryInput[],
    authorId: string,
  ): Promise<{ count: number }> {
    const adding = items.filter((it) => it.featured === true && it.published === true).length;
    await assertFeaturedRoom(adding);
    const result = await galleryDelegate().createMany({
      data: items.map((it) => ({
        imageUrl: it.imageUrl,
        imageKey: it.imageKey ?? null,
        caption: it.caption ?? null,
        categoryId: it.categoryId,
        sortOrder: it.sortOrder ?? 0,
        featured: it.featured ?? false,
        published: it.published ?? false,
        authorId,
      })),
    });
    return { count: result.count };
  }

  async function update(
    id: string,
    data: UpdateGalleryInput,
  ): Promise<GalleryDetail> {
    if (data.featured === true || data.published === true) {
      const current = (await galleryDelegate().findUnique({
        where: { id },
        select: { featured: true, published: true },
      })) as { featured: boolean; published: boolean } | null;
      const nextFeatured = data.featured ?? current?.featured ?? false;
      const nextPublished = data.published ?? current?.published ?? false;
      const wasCounted = current?.featured === true && current?.published === true;
      // 집계에 새로 들어가는 경우만 검사한다. 이미 집계에 있던 항목은 자리를 차지하고 있다.
      if (nextFeatured && nextPublished && !wasCounted) {
        await assertFeaturedRoom(1, id);
      }
    }

    const patch: Record<string, unknown> = {};
    if (data.imageUrl !== undefined) patch.imageUrl = data.imageUrl;
    if (data.imageKey !== undefined) patch.imageKey = data.imageKey ?? null;
    if (data.caption !== undefined) patch.caption = data.caption ?? null;
    if (data.categoryId !== undefined) patch.categoryId = data.categoryId;
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
    if (data.featured !== undefined) patch.featured = data.featured;
    if (data.published !== undefined) patch.published = data.published;

    const row = await galleryDelegate().update({
      where: { id },
      data: patch,
      include: baseInclude,
    });
    return row as GalleryDetail;
  }

  async function remove(id: string): Promise<void> {
    const storageEnabled = config.storage?.isEnabled?.() === true;
    let imageKey: string | null = null;
    if (storageEnabled) {
      const row = (await galleryDelegate().findUnique({
        where: { id },
        select: { imageKey: true },
      })) as { imageKey: string | null } | null;
      imageKey = row?.imageKey ?? null;
    }
    await galleryDelegate().delete({ where: { id } });
    if (storageEnabled && imageKey && config.storage) {
      const keys = config.storage.collectKeys(imageKey);
      if (keys.length > 0) await config.storage.deleteKeys(keys);
    }
  }

  async function removeMany(ids: string[]): Promise<{ count: number }> {
    const storageEnabled = config.storage?.isEnabled?.() === true;
    let imageKeys: string[] = [];
    if (storageEnabled) {
      const rows = (await galleryDelegate().findMany({
        where: { id: { in: ids } },
        select: { imageKey: true },
      })) as Array<{ imageKey: string | null }>;
      imageKeys = rows
        .map((r) => r.imageKey)
        .filter((k): k is string => typeof k === "string" && k.length > 0);
    }
    const result = await galleryDelegate().deleteMany({ where: { id: { in: ids } } });
    if (storageEnabled && imageKeys.length > 0 && config.storage) {
      const allKeys = imageKeys.flatMap((k) => config.storage!.collectKeys(k));
      const uniqueKeys = [...new Set(allKeys)];
      if (uniqueKeys.length > 0) await config.storage.deleteKeys(uniqueKeys);
    }
    return { count: result.count };
  }

  async function bulkUpdatePublished(
    ids: string[],
    published: boolean,
  ): Promise<{ count: number }> {
    const result = await galleryDelegate().updateMany({
      where: { id: { in: ids } },
      data: { published, updatedAt: new Date() },
    });
    return { count: result.count };
  }

  async function bulkUpdateFeatured(
    ids: string[],
    featured: boolean,
  ): Promise<{ count: number }> {
    const result = await galleryDelegate().updateMany({
      where: { id: { in: ids } },
      data: { featured, updatedAt: new Date() },
    });
    return { count: result.count };
  }

  async function togglePublish(id: string): Promise<GalleryDetail> {
    const current = (await galleryDelegate().findUnique({
      where: { id },
      select: { published: true },
    })) as { published: boolean } | null;
    if (!current) {
      throw new GalleryNotFoundError(id);
    }
    const row = await galleryDelegate().update({
      where: { id },
      data: { published: !current.published },
      include: baseInclude,
    });
    return row as GalleryDetail;
  }

  async function count(opts?: { published?: boolean }): Promise<number> {
    const where = opts?.published !== undefined ? { published: opts.published } : undefined;
    const n = await galleryDelegate().count(where ? { where } : {});
    return n as number;
  }

  async function listRecent(limit: number): Promise<GalleryListItem[]> {
    const rows = await galleryDelegate().findMany({
      include: baseInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows as GalleryListItem[];
  }

  return {
    listFeatured,
    listPublished,
    listPublishedByCategory,
    listAll,
    getById,
    getAuthorIds,
    create,
    createMany,
    update,
    remove,
    removeMany,
    bulkUpdatePublished,
    bulkUpdateFeatured,
    togglePublish,
    count,
    listRecent,
  };
}

export type GalleryService = ReturnType<typeof createGalleryService>;
