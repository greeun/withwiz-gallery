/**
 * 테스트 전용 메모리 기반 Prisma 가짜 객체.
 *
 * `createGalleryService` / `createCategoryService` 가 실제로 사용하는 delegate 호출 형태만 구현한다.
 * 실제 라우트 핸들러와 관리자 컴포넌트를 연결한 왕복 테스트에서 DB 대신 사용한다.
 */
import type { GalleryCategoryItem, GalleryListItem } from "../../src/types";

type Row = Record<string, any>;
type OrderBy = Record<string, "asc" | "desc"> | Array<Record<string, "asc" | "desc">>;

export interface GallerySeed {
  id: string;
  imageUrl?: string;
  imageKey?: string | null;
  caption?: string | null;
  categoryId: string;
  sortOrder?: number;
  featured?: boolean;
  published?: boolean;
  authorId?: string;
}

export interface CategorySeed {
  id: string;
  slug: string;
  labelKo?: string;
  labelEn?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface InMemoryPrisma {
  prisma: any;
  galleries: GalleryListItem[];
  categories: GalleryCategoryItem[];
}

/** 컬럼 값 하나를 Prisma where 조건과 비교한다 (`in`, `contains` + `mode`, 동등 비교). */
function matchValue(actual: unknown, expected: unknown): boolean {
  if (expected && typeof expected === "object" && !Array.isArray(expected) && !(expected instanceof Date)) {
    const cond = expected as Record<string, unknown>;
    if ("in" in cond) return (cond.in as unknown[]).includes(actual);
    if ("contains" in cond) {
      const needle = String(cond.contains);
      const hay = typeof actual === "string" ? actual : "";
      return cond.mode === "insensitive"
        ? hay.toLowerCase().includes(needle.toLowerCase())
        : hay.includes(needle);
    }
    return false;
  }
  return actual === expected;
}

function makeDelegate(
  rows: Row[],
  opts: {
    idPrefix: string;
    relation?: { field: string; foreignKey: string; target: () => Row[] };
  },
) {
  let seq = rows.length;

  function relatedOf(row: Row): Row | null {
    if (!opts.relation) return null;
    return opts.relation.target().find((r) => r.id === row[opts.relation!.foreignKey]) ?? null;
  }

  function matches(row: Row, where?: Record<string, unknown>): boolean {
    if (!where) return true;
    return Object.entries(where).every(([key, expected]) => {
      if (opts.relation && key === opts.relation.field) {
        // 관계 필터 (예: category: { slug })
        const related = relatedOf(row);
        if (!related) return false;
        return Object.entries(expected as Record<string, unknown>).every(([k, v]) => related[k] === v);
      }
      return matchValue(row[key], expected);
    });
  }

  function project(row: Row, args: { include?: Record<string, boolean>; select?: Record<string, boolean> }): Row {
    if (args.select) {
      const out: Row = {};
      for (const [k, on] of Object.entries(args.select)) if (on) out[k] = row[k];
      return out;
    }
    const out: Row = { ...row };
    if (args.include && opts.relation && args.include[opts.relation.field]) {
      const rel = relatedOf(row);
      out[opts.relation.field] = rel ? { ...rel } : null;
    }
    return out;
  }

  function sort(list: Row[], orderBy?: OrderBy): Row[] {
    if (!orderBy) return list;
    const keys = (Array.isArray(orderBy) ? orderBy : [orderBy]).flatMap((o) => Object.entries(o));
    return [...list].sort((a, b) => {
      for (const [field, dir] of keys) {
        const av = a[field] instanceof Date ? a[field].getTime() : a[field];
        const bv = b[field] instanceof Date ? b[field].getTime() : b[field];
        if (av === bv) continue;
        const cmp = av > bv ? 1 : -1;
        return dir === "desc" ? -cmp : cmp;
      }
      return 0;
    });
  }

  function findIndexByWhere(where: Record<string, unknown>): number {
    return rows.findIndex((r) => matches(r, where));
  }

  function notFound(): Error {
    const err = new Error("Record to update not found.") as Error & { code: string };
    err.code = "P2025";
    return err;
  }

  return {
    async findMany(args: any = {}) {
      let list = rows.filter((r) => matches(r, args.where));
      list = sort(list, args.orderBy);
      if (args.skip) list = list.slice(args.skip);
      if (args.take !== undefined) list = list.slice(0, args.take);
      return list.map((r) => project(r, args));
    },
    async findUnique(args: any) {
      const idx = findIndexByWhere(args.where);
      return idx === -1 ? null : project(rows[idx], args);
    },
    async count(args: any = {}) {
      return rows.filter((r) => matches(r, args.where)).length;
    },
    async create(args: any) {
      seq += 1;
      const now = new Date();
      const row: Row = { id: `${opts.idPrefix}-${seq}`, createdAt: now, updatedAt: now, ...args.data };
      rows.push(row);
      return project(row, args);
    },
    async createMany(args: any) {
      for (const data of args.data as Row[]) {
        seq += 1;
        const now = new Date();
        rows.push({ id: `${opts.idPrefix}-${seq}`, createdAt: now, updatedAt: now, ...data });
      }
      return { count: (args.data as Row[]).length };
    },
    async update(args: any) {
      const idx = findIndexByWhere(args.where);
      if (idx === -1) throw notFound();
      rows[idx] = { ...rows[idx], ...args.data, updatedAt: new Date() };
      return project(rows[idx], args);
    },
    async updateMany(args: any) {
      let count = 0;
      rows.forEach((r, i) => {
        if (matches(r, args.where)) {
          rows[i] = { ...r, ...args.data };
          count += 1;
        }
      });
      return { count };
    },
    async delete(args: any) {
      const idx = findIndexByWhere(args.where);
      if (idx === -1) throw notFound();
      const [removed] = rows.splice(idx, 1);
      return removed;
    },
    async deleteMany(args: any) {
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i -= 1) {
        if (matches(rows[i], args.where)) rows.splice(i, 1);
      }
      return { count: before - rows.length };
    },
  };
}

export function createInMemoryPrisma(seed: {
  categories?: CategorySeed[];
  galleries?: GallerySeed[];
}): InMemoryPrisma {
  const base = new Date("2026-01-01T00:00:00Z");
  const categories: GalleryCategoryItem[] = (seed.categories ?? []).map((c) => ({
    labelKo: `${c.slug}-ko`,
    labelEn: null,
    sortOrder: 0,
    isActive: true,
    createdAt: base,
    updatedAt: base,
    ...c,
  }));
  const galleries: GalleryListItem[] = (seed.galleries ?? []).map((g) => ({
    imageUrl: `https://cdn.test/${g.id}.jpg`,
    imageKey: null,
    caption: `cap-${g.id}`,
    sortOrder: 0,
    featured: false,
    published: false,
    authorId: "user-1",
    createdAt: base,
    updatedAt: base,
    ...g,
  }));

  const galleryDelegate = makeDelegate(galleries as unknown as Row[], {
    idPrefix: "g",
    relation: { field: "category", foreignKey: "categoryId", target: () => categories as unknown as Row[] },
  });
  const categoryDelegate = makeDelegate(categories as unknown as Row[], { idPrefix: "c" });

  const prisma: any = {
    gallery: galleryDelegate,
    galleryCategory: categoryDelegate,
    async $transaction(input: any) {
      if (typeof input === "function") return input(prisma);
      return Promise.all(input);
    },
  };

  return { prisma, galleries, categories };
}
