export { setGalleryConfig, getGalleryConfig } from "./config";

export type {
  // pagination
  PaginatedResult,
  PaginationMeta,
  SortOrder,
  // api-context
  PrismaLike,
  ApiContext,
  RouteHandler,
  ApiWrapper,
  // domain
  GalleryListItem,
  GalleryDetail,
  GalleryCategoryItem,
  CreateGalleryInput,
  UpdateGalleryInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  // config + i18n + slot
  GalleryConfig,
  GalleryI18nKey,
  GallerySlotName,
} from "./types";

export { cn } from "./utils/cn";
export { getVariantUrl, type ImageVariant } from "./utils/image-variants";
