/**
 * Server entry — Node 전용. RSC / route handler / loader 가 import.
 * Sprint 2: service factories + helpers.
 * Sprint 3: route handler factory + RSC loaders 추가.
 */

export { createGalleryService } from "../services";
export type { GalleryService } from "../services";
export { createCategoryService } from "../services/category-service";
export type { CategoryService } from "../services/category-service";
export { buildPaginatedResult } from "../services/helpers";

// Sprint 3 — route handler factory + RSC loaders
export { createGalleryRoutes } from "./route-handlers";
export type { GalleryRoutes } from "./route-handlers";
export {
  getGalleryItems,
  getFeaturedGalleries,
  getRecentGalleries,
  getGalleryCount,
} from "./loaders";

// Typed error 계층 (Sprint 3 follow-up) — host 가 catch 후 자체 처리 가능
export {
  GalleryError,
  GalleryNotFoundError,
  CategoryNotFoundError,
  CategoryInUseError,
  PermissionDeniedError,
} from "../errors";

// DI + 타입 재노출 — host 가 `@withwiz/gallery/server` 한 곳에서 모든 server-side API 를 가져올 수 있게 함.
export { setGalleryConfig, getGalleryConfig } from "../config";
export type {
  GalleryConfig,
  GalleryI18nKey,
  GallerySlotName,
  GalleryListItem,
  GalleryDetail,
  GalleryCategoryItem,
  CreateGalleryInput,
  UpdateGalleryInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  PaginatedResult,
  PaginationMeta,
  SortOrder,
  PrismaLike,
  ApiContext,
  RouteHandler,
  ApiWrapper,
} from "../types";
