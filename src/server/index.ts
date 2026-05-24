/**
 * Server entry — Node 전용. RSC / route handler / loader 가 import.
 * Sprint 2 시점에는 service factories + helpers 만 노출.
 * Sprint 3 에서 route handler factory 와 RSC loaders 가 추가된다.
 */

export { createGalleryService } from "../services";
export type { GalleryService } from "../services";
export { createCategoryService } from "../services/category-service";
export type { CategoryService } from "../services/category-service";
export { buildPaginatedResult } from "../services/helpers";

// DI + 타입 재노출 — host 가 `@withwiz/gallery-kit/server` 한 곳에서 모든 server-side API 를 가져올 수 있게 함.
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
