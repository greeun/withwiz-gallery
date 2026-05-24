import { z } from "zod";

/**
 * spec §9-1 충실 구현.
 *
 * 호스트가 `config.limits.batchMax` 와 `config.limits.captionMaxLength` 를 넘겨
 * 패키지 내부 스키마를 생성한다. categoryId 는 cuid 형식만 검증하고,
 * 실제 카테고리 존재 여부는 service 레이어가 Prisma FK 제약으로 자연스럽게 잡는다.
 */
export function createGallerySchemas(opts: {
  batchMax: number;
  captionMaxLength: number;
}) {
  const CreateGallerySchema = z.object({
    imageUrl: z.string().url(),
    imageKey: z.string().optional(),
    caption: z.string().max(opts.captionMaxLength).optional(),
    categoryId: z.string().cuid(),
    sortOrder: z.number().int().nonnegative().default(0),
    featured: z.boolean().default(false),
    published: z.boolean().default(false),
  });

  const UpdateGallerySchema = CreateGallerySchema.partial();

  const BatchCreateGallerySchema = z.object({
    items: z.array(CreateGallerySchema).min(1).max(opts.batchMax),
  });

  const BulkUpdateSchema = z.object({
    ids: z.array(z.string().cuid()).min(1).max(opts.batchMax),
    published: z.boolean().optional(),
    featured: z.boolean().optional(),
  });

  const CreateCategorySchema = z.object({
    slug: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Z][A-Z0-9_]*$/, "slug 는 대문자/숫자/언더스코어만"),
    labelKo: z.string().min(1).max(64),
    labelEn: z.string().min(1).max(64).optional(),
    sortOrder: z.number().int().nonnegative().default(0),
    isActive: z.boolean().default(true),
  });

  const UpdateCategorySchema = CreateCategorySchema.partial();

  const ReorderCategorySchema = z.object({
    ids: z.array(z.string().cuid()).min(1),
  });

  return {
    CreateGallerySchema,
    UpdateGallerySchema,
    BatchCreateGallerySchema,
    BulkUpdateSchema,
    CreateCategorySchema,
    UpdateCategorySchema,
    ReorderCategorySchema,
  };
}

export type GallerySchemas = ReturnType<typeof createGallerySchemas>;
