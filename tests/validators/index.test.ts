import { describe, it, expect } from "vitest";
import {
  createGallerySchemas,
  type CreateGallerySchemasOptions,
} from "../../src/validators";

const CUID = "clxxxxxxxxxxxxxxxxxxxxxxx"; // valid 25-char cuid

function makeSchemas(overrides: Partial<CreateGallerySchemasOptions> = {}) {
  return createGallerySchemas({
    ...overrides,
    batchMax: overrides.batchMax ?? 20,
    captionMaxLength: overrides.captionMaxLength ?? 200,
  });
}

describe("CreateGallerySchema — imageUrl hardening", () => {
  const base = { categoryId: CUID };

  it("rejects javascript: scheme", () => {
    const { CreateGallerySchema } = makeSchemas();
    expect(
      CreateGallerySchema.safeParse({ ...base, imageUrl: "javascript:alert(1)" }).success,
    ).toBe(false);
  });

  it("rejects data: scheme", () => {
    const { CreateGallerySchema } = makeSchemas();
    expect(
      CreateGallerySchema.safeParse({ ...base, imageUrl: "data:image/png;base64,AAAA" })
        .success,
    ).toBe(false);
  });

  it("accepts http and https by default", () => {
    const { CreateGallerySchema } = makeSchemas();
    expect(
      CreateGallerySchema.safeParse({ ...base, imageUrl: "http://cdn.example.com/a.webp" })
        .success,
    ).toBe(true);
    expect(
      CreateGallerySchema.safeParse({ ...base, imageUrl: "https://cdn.example.com/a.webp" })
        .success,
    ).toBe(true);
  });

  it("honours imageUrlProtocols override (https only)", () => {
    const { CreateGallerySchema } = makeSchemas({ imageUrlProtocols: ["https"] });
    expect(
      CreateGallerySchema.safeParse({ ...base, imageUrl: "http://cdn.example.com/a.webp" })
        .success,
    ).toBe(false);
  });

  it("honours imageUrlHosts allowlist", () => {
    const { CreateGallerySchema } = makeSchemas({ imageUrlHosts: ["cdn.example.com"] });
    expect(
      CreateGallerySchema.safeParse({ ...base, imageUrl: "https://cdn.example.com/a.webp" })
        .success,
    ).toBe(true);
    expect(
      CreateGallerySchema.safeParse({ ...base, imageUrl: "https://evil.example.org/a.webp" })
        .success,
    ).toBe(false);
  });
});

describe("CreateGallerySchema — imageKey hardening", () => {
  const base = { categoryId: CUID, imageUrl: "https://cdn.example.com/a.webp" };
  const parse = (imageKey: string, opts?: Partial<CreateGallerySchemasOptions>) =>
    makeSchemas(opts).CreateGallerySchema.safeParse({ ...base, imageKey }).success;

  it("accepts a normal nested key", () => {
    expect(parse("gallery/2026/abc_123-def.webp")).toBe(true);
  });

  it("rejects path traversal segments", () => {
    expect(parse("../other/key.webp")).toBe(false);
    expect(parse("gallery/../secret.webp")).toBe(false);
    expect(parse("gallery/..")).toBe(false);
  });

  it("rejects leading slash and double slash", () => {
    expect(parse("/gallery/a.webp")).toBe(false);
    expect(parse("gallery//a.webp")).toBe(false);
  });

  it("rejects whitespace, control chars and empty string", () => {
    expect(parse("gallery/a b.webp")).toBe(false);
    expect(parse("gallery/a\nb.webp")).toBe(false);
    expect(parse("")).toBe(false);
  });

  it("rejects keys over 512 chars", () => {
    expect(parse("a".repeat(513))).toBe(false);
    expect(parse("a".repeat(512))).toBe(true);
  });

  it("honours imageKeyPattern override", () => {
    expect(parse("gallery/a.webp", { imageKeyPattern: /^uploads\// })).toBe(false);
    expect(parse("uploads/a.webp", { imageKeyPattern: /^uploads\// })).toBe(true);
  });
});

describe("createGallerySchemas() returns 7 schemas", () => {
  it("exposes all 7 expected schema keys", () => {
    const s = makeSchemas();
    expect(s.CreateGallerySchema).toBeDefined();
    expect(s.UpdateGallerySchema).toBeDefined();
    expect(s.BatchCreateGallerySchema).toBeDefined();
    expect(s.BulkUpdateSchema).toBeDefined();
    expect(s.CreateCategorySchema).toBeDefined();
    expect(s.UpdateCategorySchema).toBeDefined();
    expect(s.ReorderCategorySchema).toBeDefined();
  });
});

describe("CreateGallerySchema", () => {
  it("accepts minimal valid payload", () => {
    const { CreateGallerySchema } = makeSchemas();
    const r = CreateGallerySchema.safeParse({
      imageUrl: "https://cdn.example.com/a.webp",
      categoryId: CUID,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.sortOrder).toBe(0);
      expect(r.data.featured).toBe(false);
      expect(r.data.published).toBe(false);
    }
  });

  it("rejects non-url imageUrl", () => {
    const { CreateGallerySchema } = makeSchemas();
    const r = CreateGallerySchema.safeParse({
      imageUrl: "not-a-url",
      categoryId: CUID,
    });
    expect(r.success).toBe(false);
  });

  it("rejects caption over captionMaxLength", () => {
    const { CreateGallerySchema } = makeSchemas({ captionMaxLength: 10 });
    const r = CreateGallerySchema.safeParse({
      imageUrl: "https://cdn.example.com/a.webp",
      categoryId: CUID,
      caption: "a".repeat(11),
    });
    expect(r.success).toBe(false);
  });

  it("rejects non-cuid categoryId", () => {
    const { CreateGallerySchema } = makeSchemas();
    const r = CreateGallerySchema.safeParse({
      imageUrl: "https://cdn.example.com/a.webp",
      categoryId: "not-cuid",
    });
    expect(r.success).toBe(false);
  });

  it("rejects negative sortOrder", () => {
    const { CreateGallerySchema } = makeSchemas();
    const r = CreateGallerySchema.safeParse({
      imageUrl: "https://cdn.example.com/a.webp",
      categoryId: CUID,
      sortOrder: -1,
    });
    expect(r.success).toBe(false);
  });
});

describe("UpdateGallerySchema", () => {
  it("accepts empty object (all partial)", () => {
    const { UpdateGallerySchema } = makeSchemas();
    expect(UpdateGallerySchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update", () => {
    const { UpdateGallerySchema } = makeSchemas();
    const r = UpdateGallerySchema.safeParse({ caption: "new caption" });
    expect(r.success).toBe(true);
  });

  it("still validates field shape when provided", () => {
    const { UpdateGallerySchema } = makeSchemas();
    expect(UpdateGallerySchema.safeParse({ imageUrl: "nope" }).success).toBe(false);
  });

  it("does not fill create defaults for omitted fields", () => {
    const { UpdateGallerySchema } = makeSchemas();
    const r = UpdateGallerySchema.safeParse({ caption: "new caption" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toStrictEqual({ caption: "new caption" });
  });
});

describe("BatchCreateGallerySchema", () => {
  it("accepts batch under batchMax", () => {
    const { BatchCreateGallerySchema } = makeSchemas({ batchMax: 3 });
    const r = BatchCreateGallerySchema.safeParse({
      items: [
        { imageUrl: "https://cdn.example.com/a.webp", categoryId: CUID },
        { imageUrl: "https://cdn.example.com/b.webp", categoryId: CUID },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty items array", () => {
    const { BatchCreateGallerySchema } = makeSchemas();
    expect(BatchCreateGallerySchema.safeParse({ items: [] }).success).toBe(false);
  });

  it("rejects batch over batchMax", () => {
    const { BatchCreateGallerySchema } = makeSchemas({ batchMax: 2 });
    const r = BatchCreateGallerySchema.safeParse({
      items: [
        { imageUrl: "https://cdn.example.com/a.webp", categoryId: CUID },
        { imageUrl: "https://cdn.example.com/b.webp", categoryId: CUID },
        { imageUrl: "https://cdn.example.com/c.webp", categoryId: CUID },
      ],
    });
    expect(r.success).toBe(false);
  });
});

describe("BulkUpdateSchema", () => {
  it("accepts ids + published toggle", () => {
    const { BulkUpdateSchema } = makeSchemas();
    const r = BulkUpdateSchema.safeParse({ ids: [CUID], published: true });
    expect(r.success).toBe(true);
  });

  it("accepts ids + featured toggle", () => {
    const { BulkUpdateSchema } = makeSchemas();
    const r = BulkUpdateSchema.safeParse({ ids: [CUID], featured: false });
    expect(r.success).toBe(true);
  });

  it("rejects empty ids", () => {
    const { BulkUpdateSchema } = makeSchemas();
    expect(BulkUpdateSchema.safeParse({ ids: [] }).success).toBe(false);
  });

  it("rejects non-cuid ids", () => {
    const { BulkUpdateSchema } = makeSchemas();
    expect(BulkUpdateSchema.safeParse({ ids: ["xxx"] }).success).toBe(false);
  });

  it("rejects ids over batchMax", () => {
    const { BulkUpdateSchema } = makeSchemas({ batchMax: 1 });
    expect(
      BulkUpdateSchema.safeParse({ ids: [CUID, CUID], published: true }).success,
    ).toBe(false);
  });
});

describe("CreateCategorySchema", () => {
  it("accepts minimal valid category", () => {
    const { CreateCategorySchema } = makeSchemas();
    const r = CreateCategorySchema.safeParse({ slug: "PERFORMANCE", labelKo: "공연" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.sortOrder).toBe(0);
      expect(r.data.isActive).toBe(true);
    }
  });

  it("accepts SLUG with digits and underscore", () => {
    const { CreateCategorySchema } = makeSchemas();
    expect(
      CreateCategorySchema.safeParse({ slug: "A1_B2", labelKo: "x" }).success,
    ).toBe(true);
  });

  it("rejects lowercase slug", () => {
    const { CreateCategorySchema } = makeSchemas();
    expect(
      CreateCategorySchema.safeParse({ slug: "performance", labelKo: "공연" }).success,
    ).toBe(false);
  });

  it("rejects slug starting with digit", () => {
    const { CreateCategorySchema } = makeSchemas();
    expect(
      CreateCategorySchema.safeParse({ slug: "1ABC", labelKo: "공연" }).success,
    ).toBe(false);
  });

  it("rejects empty labelKo", () => {
    const { CreateCategorySchema } = makeSchemas();
    expect(
      CreateCategorySchema.safeParse({ slug: "PERFORMANCE", labelKo: "" }).success,
    ).toBe(false);
  });

  it("rejects slug over 64 chars", () => {
    const { CreateCategorySchema } = makeSchemas();
    expect(
      CreateCategorySchema.safeParse({ slug: "A".repeat(65), labelKo: "x" }).success,
    ).toBe(false);
  });
});

describe("UpdateCategorySchema", () => {
  it("accepts empty object", () => {
    const { UpdateCategorySchema } = makeSchemas();
    expect(UpdateCategorySchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial labelEn", () => {
    const { UpdateCategorySchema } = makeSchemas();
    expect(UpdateCategorySchema.safeParse({ labelEn: "X" }).success).toBe(true);
  });

  it("still validates slug shape when provided", () => {
    const { UpdateCategorySchema } = makeSchemas();
    expect(UpdateCategorySchema.safeParse({ slug: "lower" }).success).toBe(false);
  });

  it("does not fill create defaults for omitted fields", () => {
    const { UpdateCategorySchema } = makeSchemas();
    const r = UpdateCategorySchema.safeParse({ labelKo: "수정" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toStrictEqual({ labelKo: "수정" });
  });
});

describe("ReorderCategorySchema", () => {
  it("accepts non-empty cuid array", () => {
    const { ReorderCategorySchema } = makeSchemas();
    const r = ReorderCategorySchema.safeParse({ ids: [CUID, CUID] });
    expect(r.success).toBe(true);
  });

  it("rejects empty ids", () => {
    const { ReorderCategorySchema } = makeSchemas();
    expect(ReorderCategorySchema.safeParse({ ids: [] }).success).toBe(false);
  });

  it("rejects non-cuid ids", () => {
    const { ReorderCategorySchema } = makeSchemas();
    expect(ReorderCategorySchema.safeParse({ ids: ["x"] }).success).toBe(false);
  });
});
