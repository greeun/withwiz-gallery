/**
 * Route handler factory — spec §9-3.
 *
 * `createGalleryRoutes(config)` 가 host 의 `apiWrapper` 로 감싼 9 개 라우트를 반환한다.
 * host 는 각 라우트 파일에서 `export const { GET, POST } = galleryRoutes.collection` 식으로 사용.
 *
 * 설계 원칙:
 *   - 모든 mutation 종료 직전 `config.revalidate?.(path)` 를 `config.revalidatePaths` 각 path 에 대해 호출.
 *   - `config.permissions?.canEdit/canDelete` 가 함수면 호출 → false 시 403 반환.
 *     미설정이면 admin 전원 모든 권한 (spec §16 v0.1 정책).
 *   - bulk (collection DELETE / bulk PATCH) 도 동일 훅을 대상 전원에 적용한다.
 *     하나라도 거부되면 전체 403 (부분 성공 없음). 존재하지 않는 id 가 섞이면 404.
 *   - `config.permissions?.canManageCategories` 가 함수면 카테고리 CUD 에 적용.
 *   - `ctx.params?.id` 는 host 미들웨어가 채워준다고 가정 (spec §6-1).
 *   - 카테고리 `remove` 의 in-use 에러는 service throw → handler 가 잡아 409 반환.
 */
import { NextResponse } from "next/server";
import type {
  ApiContext,
  GalleryConfig,
  RouteHandler,
} from "../types";
import { createGalleryService } from "../services";
import { createCategoryService } from "../services/category-service";
import { createGallerySchemas } from "../validators";
import {
  CategoryInUseError,
  GalleryNotFoundError,
} from "../errors";
import {
  parsePagination,
  getSearchParam,
  parseSortKey,
  validateAndParse,
  validateIds,
} from "../utils/api-helpers";

const VALID_SORT_KEYS = [
  "sortOrder",
  "createdAt",
  "updatedAt",
  "caption",
] as const;

type SortKey = (typeof VALID_SORT_KEYS)[number];

export interface GalleryRoutes {
  collection: { GET: RouteHandler; POST: RouteHandler; DELETE: RouteHandler };
  item: { GET: RouteHandler; PUT: RouteHandler; DELETE: RouteHandler };
  publishToggle: { PATCH: RouteHandler };
  bulk: { POST: RouteHandler; PATCH: RouteHandler };
  categoryCollection: { GET: RouteHandler; POST: RouteHandler };
  categoryItem: {
    GET: RouteHandler;
    PUT: RouteHandler;
    DELETE: RouteHandler;
  };
}

function jsonError(message: string, status: number, error?: string): Response {
  return NextResponse.json(
    { success: false, error: error ?? "Error", message },
    { status },
  );
}

function callRevalidate(config: GalleryConfig): void {
  if (!config.revalidate || !config.revalidatePaths) return;
  for (const p of config.revalidatePaths) {
    config.revalidate(p);
  }
}

function getAuthorId(config: GalleryConfig, ctx: ApiContext): string | null {
  if (config.authorIdFromContext) {
    try {
      const id = config.authorIdFromContext(ctx);
      return id || null;
    } catch {
      return null;
    }
  }
  return ctx.user?.id ?? null;
}

function getRouteId(ctx: ApiContext): string | null {
  const id = ctx.params?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

const DEFAULT_SEARCH_MAX_LENGTH = 100;

function canManageCategories(config: GalleryConfig, ctx: ApiContext): boolean {
  const fn = config.permissions?.canManageCategories;
  return fn ? fn(ctx) === true : true;
}

type BulkPermissionCheck =
  | { ok: true }
  | { ok: false; response: Response };

/**
 * bulk 대상 전원에 대해 permission 훅을 적용한다.
 *  - 훅 미설정: 통과.
 *  - 대상 중 존재하지 않는 id: 404 (권한 검사 대상이 불명확하므로 거부).
 *  - 하나라도 거부: 403.
 */
async function checkBulkPermission(
  ctx: ApiContext,
  ids: string[],
  hook: ((ctx: ApiContext, gallery: { authorId: string }) => boolean) | undefined,
  loadAuthorIds: (ids: string[]) => Promise<Array<{ id: string; authorId: string }>>,
): Promise<BulkPermissionCheck> {
  if (!hook) return { ok: true };
  const unique = [...new Set(ids)];
  const rows = await loadAuthorIds(unique);
  if (rows.length !== unique.length) {
    return {
      ok: false,
      response: jsonError("one or more gallery items not found", 404, "NotFound"),
    };
  }
  for (const row of rows) {
    if (!hook(ctx, { authorId: row.authorId })) {
      return { ok: false, response: jsonError("forbidden", 403, "Forbidden") };
    }
  }
  return { ok: true };
}

export function createGalleryRoutes(config: GalleryConfig): GalleryRoutes {
  const service = createGalleryService(config);
  const categoryService = createCategoryService(config);
  const schemas = createGallerySchemas({
    batchMax: config.limits.batchMax,
    captionMaxLength: config.limits.captionMaxLength ?? 200,
    imageUrlProtocols: config.validation?.imageUrlProtocols,
    imageUrlHosts: config.validation?.imageUrlHosts,
    imageKeyPattern: config.validation?.imageKeyPattern,
  });
  const searchMaxLength =
    config.validation?.searchMaxLength ?? DEFAULT_SEARCH_MAX_LENGTH;

  // ── /api/admin/galleries ─────────────────────────────

  const collectionGET = config.apiWrapper(async (ctx: ApiContext) => {
    const { page, limit } = parsePagination(ctx.request);
    const { searchParams } = new URL(ctx.request.url);
    const categoryId = getSearchParam(ctx.request, "categoryId");
    const publishedRaw = getSearchParam(ctx.request, "published");
    const searchRaw = getSearchParam(ctx.request, "search")?.trim();
    const search = searchRaw ? searchRaw.slice(0, searchMaxLength) : undefined;
    const sortBy = parseSortKey<SortKey>(
      searchParams,
      VALID_SORT_KEYS,
      "sortOrder",
    );

    const published =
      publishedRaw === "true"
        ? true
        : publishedRaw === "false"
          ? false
          : undefined;

    const result = await service.listAll({
      page,
      limit,
      categoryId,
      published,
      search,
      sortBy,
    });

    return NextResponse.json({ success: true, data: result });
  });

  const collectionPOST = config.apiWrapper(async (ctx: ApiContext) => {
    const authorId = getAuthorId(config, ctx);
    if (!authorId) return jsonError("authentication required", 401, "Unauthorized");

    const body = await ctx.request.json();
    const validation = validateAndParse(schemas.CreateGallerySchema, body);
    if (!validation.success) return validation.response;

    const item = await service.create(validation.data, authorId);
    callRevalidate(config);
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  });

  const collectionDELETE = config.apiWrapper(async (ctx: ApiContext) => {
    const body = await ctx.request.json();
    const check = validateIds(body?.ids);
    if (!check.valid) return check.response;
    if (check.ids.length > config.limits.batchMax) {
      return jsonError(
        `ids exceeds batchMax (${config.limits.batchMax})`,
        400,
        "InvalidIds",
      );
    }

    const perm = await checkBulkPermission(
      ctx,
      check.ids,
      config.permissions?.canDelete,
      service.getAuthorIds,
    );
    if (!perm.ok) return perm.response;

    const { count } = await service.removeMany(check.ids);
    callRevalidate(config);
    return NextResponse.json({ success: true, data: { count } });
  });

  // ── /api/admin/galleries/[id] ────────────────────────

  const itemGET = config.apiWrapper(async (ctx: ApiContext) => {
    const id = getRouteId(ctx);
    if (!id) return jsonError("missing route param: id", 400, "InvalidParams");

    const item = await service.getById(id);
    if (!item) return jsonError("Gallery item not found", 404, "NotFound");

    return NextResponse.json({ success: true, data: item });
  });

  const itemPUT = config.apiWrapper(async (ctx: ApiContext) => {
    const id = getRouteId(ctx);
    if (!id) return jsonError("missing route param: id", 400, "InvalidParams");

    const body = await ctx.request.json();
    const validation = validateAndParse(schemas.UpdateGallerySchema, body);
    if (!validation.success) return validation.response;

    const existing = await service.getById(id);
    if (!existing) return jsonError("Gallery item not found", 404, "NotFound");

    if (config.permissions?.canEdit) {
      const ok = config.permissions.canEdit(ctx, { authorId: existing.authorId });
      if (!ok) return jsonError("forbidden", 403, "Forbidden");
    }

    const item = await service.update(id, validation.data);
    callRevalidate(config);
    return NextResponse.json({ success: true, data: item });
  });

  const itemDELETE = config.apiWrapper(async (ctx: ApiContext) => {
    const id = getRouteId(ctx);
    if (!id) return jsonError("missing route param: id", 400, "InvalidParams");

    if (config.permissions?.canDelete) {
      const existing = await service.getById(id);
      if (!existing) return jsonError("Gallery item not found", 404, "NotFound");
      const ok = config.permissions.canDelete(ctx, {
        authorId: existing.authorId,
      });
      if (!ok) return jsonError("forbidden", 403, "Forbidden");
    }

    await service.remove(id);
    callRevalidate(config);
    return new NextResponse(null, { status: 204 });
  });

  // ── /api/admin/galleries/[id]/publish ────────────────

  const publishTogglePATCH = config.apiWrapper(async (ctx: ApiContext) => {
    const id = getRouteId(ctx);
    if (!id) return jsonError("missing route param: id", 400, "InvalidParams");

    if (config.permissions?.canEdit) {
      const existing = await service.getById(id);
      if (!existing) return jsonError("Gallery item not found", 404, "NotFound");
      const ok = config.permissions.canEdit(ctx, {
        authorId: existing.authorId,
      });
      if (!ok) return jsonError("forbidden", 403, "Forbidden");
    }

    try {
      const result = await service.togglePublish(id);
      callRevalidate(config);
      return NextResponse.json({ success: true, data: result });
    } catch (err) {
      // service.togglePublish throws GalleryNotFoundError on missing id — map to 404
      if (err instanceof GalleryNotFoundError) {
        return jsonError("Gallery item not found", 404, "NotFound");
      }
      throw err;
    }
  });

  // ── /api/admin/galleries/bulk ────────────────────────

  const bulkPOST = config.apiWrapper(async (ctx: ApiContext) => {
    const authorId = getAuthorId(config, ctx);
    if (!authorId) return jsonError("authentication required", 401, "Unauthorized");

    const body = await ctx.request.json();
    const validation = validateAndParse(schemas.BatchCreateGallerySchema, body);
    if (!validation.success) return validation.response;

    const result = await service.createMany(validation.data.items, authorId);
    callRevalidate(config);
    return NextResponse.json(
      { success: true, data: result },
      { status: 201 },
    );
  });

  const bulkPATCH = config.apiWrapper(async (ctx: ApiContext) => {
    const body = await ctx.request.json();
    const validation = validateAndParse(schemas.BulkUpdateSchema, body);
    if (!validation.success) return validation.response;

    const { ids, published, featured } = validation.data;

    const perm = await checkBulkPermission(
      ctx,
      ids,
      config.permissions?.canEdit,
      service.getAuthorIds,
    );
    if (!perm.ok) return perm.response;

    let count = 0;

    if (published !== undefined) {
      const r = await service.bulkUpdatePublished(ids, published);
      count = r.count;
    }
    if (featured !== undefined) {
      const r = await service.bulkUpdateFeatured(ids, featured);
      count = r.count;
    }

    callRevalidate(config);
    return NextResponse.json({ success: true, data: { count } });
  });

  // ── /api/admin/gallery-categories ────────────────────

  const categoryCollectionGET = config.apiWrapper(async (ctx: ApiContext) => {
    const isActiveRaw = getSearchParam(ctx.request, "isActive");
    const isActive =
      isActiveRaw === "true"
        ? true
        : isActiveRaw === "false"
          ? false
          : undefined;

    const items = await categoryService.list(
      isActive === undefined ? undefined : { isActive },
    );
    return NextResponse.json({ success: true, data: items });
  });

  const categoryCollectionPOST = config.apiWrapper(async (ctx: ApiContext) => {
    if (!canManageCategories(config, ctx)) return jsonError("forbidden", 403, "Forbidden");

    const body = await ctx.request.json();
    const validation = validateAndParse(schemas.CreateCategorySchema, body);
    if (!validation.success) return validation.response;

    const item = await categoryService.create(validation.data);
    callRevalidate(config);
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  });

  // ── /api/admin/gallery-categories/[id] ───────────────

  const categoryItemGET = config.apiWrapper(async (ctx: ApiContext) => {
    const id = getRouteId(ctx);
    if (!id) return jsonError("missing route param: id", 400, "InvalidParams");

    const item = await categoryService.getById(id);
    if (!item) return jsonError("Category not found", 404, "NotFound");
    return NextResponse.json({ success: true, data: item });
  });

  const categoryItemPUT = config.apiWrapper(async (ctx: ApiContext) => {
    const id = getRouteId(ctx);
    if (!id) return jsonError("missing route param: id", 400, "InvalidParams");
    if (!canManageCategories(config, ctx)) return jsonError("forbidden", 403, "Forbidden");

    const body = await ctx.request.json();
    const validation = validateAndParse(schemas.UpdateCategorySchema, body);
    if (!validation.success) return validation.response;

    const existing = await categoryService.getById(id);
    if (!existing) return jsonError("Category not found", 404, "NotFound");

    const item = await categoryService.update(id, validation.data);
    callRevalidate(config);
    return NextResponse.json({ success: true, data: item });
  });

  const categoryItemDELETE = config.apiWrapper(async (ctx: ApiContext) => {
    const id = getRouteId(ctx);
    if (!id) return jsonError("missing route param: id", 400, "InvalidParams");
    if (!canManageCategories(config, ctx)) return jsonError("forbidden", 403, "Forbidden");

    try {
      await categoryService.remove(id);
    } catch (err) {
      if (err instanceof CategoryInUseError) {
        return jsonError(err.message, 409, "CategoryInUse");
      }
      throw err;
    }
    callRevalidate(config);
    return new NextResponse(null, { status: 204 });
  });

  return {
    collection: {
      GET: collectionGET,
      POST: collectionPOST,
      DELETE: collectionDELETE,
    },
    item: { GET: itemGET, PUT: itemPUT, DELETE: itemDELETE },
    publishToggle: { PATCH: publishTogglePATCH },
    bulk: { POST: bulkPOST, PATCH: bulkPATCH },
    categoryCollection: {
      GET: categoryCollectionGET,
      POST: categoryCollectionPOST,
    },
    categoryItem: {
      GET: categoryItemGET,
      PUT: categoryItemPUT,
      DELETE: categoryItemDELETE,
    },
  };
}
