import type { ApiContext, ApiWrapper, PrismaLike } from "./api-context";
import type React from "react";

export * from "./pagination";
export * from "./api-context";

// ─── i18n keys ─────────────────────────────────────
export type GalleryI18nKey =
  | "admin.title"
  | "admin.newButton"
  | "admin.searchPlaceholder"
  | "admin.emptyState"
  | "admin.bulkSelectAll"
  | "admin.bulkPublish"
  | "admin.bulkUnpublish"
  | "admin.bulkFeature"
  | "admin.bulkUnfeature"
  | "admin.bulkDelete"
  | "admin.featuredOverLimit"
  | "form.caption"
  | "form.captionPlaceholder"
  | "form.category"
  | "form.sortOrder"
  | "form.published"
  | "form.featured"
  | "form.save"
  | "form.cancel"
  | "form.imageDropPrompt"
  | "form.imageReplacePrompt"
  | "preview.title"
  | "preview.dragHint"
  | "preview.emptyState"
  | "category.title"
  | "category.newButton"
  | "category.slug"
  | "category.labelKo"
  | "category.labelEn"
  | "category.deleteConfirmInUse"
  | "public.galleryLabel"
  | "public.moments"
  | "public.expandAria"
  | "public.lbClose"
  | "public.lbPrev"
  | "public.lbNext";

export type GallerySlotName =
  | "managerRoot"
  | "managerToolbar"
  | "listRoot"
  | "listItem"
  | "editFormRoot"
  | "homePreviewRoot"
  | "imageDropZone"
  | "emptyState";

// ─── Domain primitives (Sprint 2 에서 service 가 사용) ─────────────
export interface GalleryListItem {
  id: string;
  imageUrl: string;
  imageKey: string | null;
  caption: string | null;
  categoryId: string;
  category?: { id: string; slug: string; labelKo: string; labelEn: string | null };
  sortOrder: number;
  featured: boolean;
  published: boolean;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type GalleryDetail = GalleryListItem;

export interface GalleryCategoryItem {
  id: string;
  slug: string;
  labelKo: string;
  labelEn: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGalleryInput {
  imageUrl: string;
  imageKey?: string;
  caption?: string;
  categoryId: string;
  sortOrder?: number;
  featured?: boolean;
  published?: boolean;
}

export type UpdateGalleryInput = Partial<CreateGalleryInput>;

export interface CreateCategoryInput {
  slug: string;
  labelKo: string;
  labelEn?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

// ─── GalleryConfig (spec §6-2) ─────────────────────
export interface GalleryConfig {
  prisma: PrismaLike;
  modelName?: string;
  categoryModelName?: string;

  apiWrapper: ApiWrapper;
  authorIdFromContext?: (ctx: ApiContext) => string;
  permissions?: {
    canEdit?: (ctx: ApiContext, gallery: { authorId: string }) => boolean;
    canDelete?: (ctx: ApiContext, gallery: { authorId: string }) => boolean;
  };

  storage?: {
    isEnabled: () => boolean;
    collectKeys: (imageKey: string) => string[];
    deleteKeys: (keys: string[]) => Promise<void>;
    validateUpload?: (file: { name: string; size: number; type: string }) =>
      | { ok: true }
      | { ok: false; reason: string };
  };

  limits: {
    maxFeatured: number;
    mosaicCount: number;
    batchMax: number;
    captionMaxLength?: number;
  };

  revalidate?: (path: string, type?: "page" | "layout") => void;
  revalidatePaths?: string[];

  i18n?: Partial<Record<GalleryI18nKey, string>> & Record<string, string>;

  ui?: {
    classNames?: Partial<Record<GallerySlotName, string>>;
    slots?: Partial<Record<GallerySlotName, React.ReactNode>>;
  };
}
