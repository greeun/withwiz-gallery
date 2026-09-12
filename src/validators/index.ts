import { z } from "zod";

/**
 * spec §9-1 충실 구현.
 *
 * 호스트가 `config.limits.batchMax` 와 `config.limits.captionMaxLength` 를 넘겨
 * 패키지 내부 스키마를 생성한다. categoryId 는 cuid 형식만 검증하고,
 * 실제 카테고리 존재 여부는 service 레이어가 Prisma FK 제약으로 자연스럽게 잡는다.
 *
 * 보안 강화 (security hardening):
 *   - imageUrl: 프로토콜 allowlist (기본 https/http) — javascript:/data: 스킴 차단.
 *     `imageUrlHosts` 지정 시 호스트 allowlist 도 적용.
 *   - imageKey: 저장소 삭제 (`config.storage.deleteKeys`) 에 그대로 전달되므로
 *     경로 순회 (`..`), 선행 슬래시, 공백/제어문자를 차단하는 형식 검증을 기본 적용.
 */

export const DEFAULT_IMAGE_URL_PROTOCOLS = ["https:", "http:"] as const;
export const DEFAULT_IMAGE_KEY_MAX_LENGTH = 512;

/** 영숫자로 시작, 영숫자/`.`/`_`/`-`/`/` 만 허용. `..` 세그먼트 및 `//` 금지. */
export const DEFAULT_IMAGE_KEY_PATTERN =
  /^(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\/\/)[A-Za-z0-9][A-Za-z0-9._\-/]*$/;

export interface CreateGallerySchemasOptions {
  batchMax: number;
  captionMaxLength: number;
  imageUrlProtocols?: readonly string[];
  imageUrlHosts?: readonly string[];
  imageKeyPattern?: RegExp;
}

function buildImageUrlSchema(opts: CreateGallerySchemasOptions) {
  const protocols = new Set(
    (opts.imageUrlProtocols ?? DEFAULT_IMAGE_URL_PROTOCOLS).map((p) =>
      p.endsWith(":") ? p.toLowerCase() : `${p.toLowerCase()}:`,
    ),
  );
  const hosts = opts.imageUrlHosts
    ? new Set(opts.imageUrlHosts.map((h) => h.toLowerCase()))
    : null;

  return z
    .string()
    .max(2048)
    .url()
    .refine(
      (value) => {
        let parsed: URL;
        try {
          parsed = new URL(value);
        } catch {
          return false;
        }
        if (!protocols.has(parsed.protocol)) return false;
        if (hosts && !hosts.has(parsed.hostname.toLowerCase())) return false;
        return true;
      },
      { message: "imageUrl 의 프로토콜 또는 호스트가 허용 목록에 없습니다" },
    );
}

export function createGallerySchemas(opts: CreateGallerySchemasOptions) {
  const imageKeyPattern = opts.imageKeyPattern ?? DEFAULT_IMAGE_KEY_PATTERN;

  const ImageUrlSchema = buildImageUrlSchema(opts);
  const ImageKeySchema = z
    .string()
    .min(1)
    .max(DEFAULT_IMAGE_KEY_MAX_LENGTH)
    .regex(imageKeyPattern, "imageKey 형식이 올바르지 않습니다");

  const CreateGallerySchema = z.object({
    imageUrl: ImageUrlSchema,
    imageKey: ImageKeySchema.optional(),
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
