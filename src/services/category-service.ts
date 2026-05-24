import type {
  GalleryConfig,
  GalleryCategoryItem,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../types";

/**
 * spec §9-2 의 categoryService.
 *
 * 호스트 독립성을 위해 Prisma delegate 는 `config.prisma[modelName]` 패턴으로 접근한다
 * (modelName 기본값 = "galleryCategory", gallery 본체 modelName 기본값 = "gallery").
 *
 * remove() 는 `onDelete: Restrict` 보강 — 사전 gallery.count() 후 throw.
 * admin UX 가 친화적 에러 메시지를 표시하도록 명시적 throw 를 사용.
 */
export function createCategoryService(config: GalleryConfig) {
  const categoryDelegate = () =>
    config.prisma[config.categoryModelName ?? "galleryCategory"];
  const galleryDelegate = () => config.prisma[config.modelName ?? "gallery"];

  async function list(opts?: { isActive?: boolean }): Promise<GalleryCategoryItem[]> {
    const where =
      opts?.isActive !== undefined ? { isActive: opts.isActive } : undefined;
    const rows = await categoryDelegate().findMany({
      ...(where ? { where } : {}),
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows as GalleryCategoryItem[];
  }

  async function getBySlug(slug: string): Promise<GalleryCategoryItem | null> {
    const row = await categoryDelegate().findUnique({ where: { slug } });
    return (row as GalleryCategoryItem | null) ?? null;
  }

  async function getById(id: string): Promise<GalleryCategoryItem | null> {
    const row = await categoryDelegate().findUnique({ where: { id } });
    return (row as GalleryCategoryItem | null) ?? null;
  }

  async function create(data: CreateCategoryInput): Promise<GalleryCategoryItem> {
    const row = await categoryDelegate().create({ data });
    return row as GalleryCategoryItem;
  }

  async function update(
    id: string,
    data: UpdateCategoryInput,
  ): Promise<GalleryCategoryItem> {
    const row = await categoryDelegate().update({ where: { id }, data });
    return row as GalleryCategoryItem;
  }

  /**
   * 사용 중 카테고리 (galleries 가 참조) 는 삭제 차단.
   * DB 의 `onDelete: Restrict` 가 최종 방어선이지만, 친화적 에러를 위해 사전 count.
   */
  async function remove(id: string): Promise<void> {
    const inUse = await galleryDelegate().count({ where: { categoryId: id } });
    if (inUse > 0) {
      throw new Error(
        `[@withwiz/gallery-kit] category in use: ${inUse} gallery item(s) reference this category (id=${id})`,
      );
    }
    await categoryDelegate().delete({ where: { id } });
  }

  /**
   * ids 배열 순서대로 sortOrder = 0..N-1 로 갱신.
   * 단일 mutation 묶음 — $transaction 사용 (배열 형태).
   */
  async function reorder(ids: string[]): Promise<void> {
    const ops = ids.map((id, idx) =>
      categoryDelegate().update({ where: { id }, data: { sortOrder: idx } }),
    );
    await config.prisma.$transaction(ops);
  }

  return { list, getBySlug, getById, create, update, remove, reorder };
}

export type CategoryService = ReturnType<typeof createCategoryService>;
