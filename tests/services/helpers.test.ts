import { describe, it, expect } from "vitest";
import { buildPaginatedResult } from "../../src/services/helpers";

describe("buildPaginatedResult", () => {
  it("computes meta for first page with exactly limit items", () => {
    const r = buildPaginatedResult([1, 2, 3], 1, 3, 9);
    expect(r.items).toEqual([1, 2, 3]);
    expect(r.meta).toEqual({
      page: 1,
      limit: 3,
      total: 9,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    });
  });

  it("computes meta for last page (partial)", () => {
    const r = buildPaginatedResult([7], 3, 3, 7);
    expect(r.meta).toEqual({
      page: 3,
      limit: 3,
      total: 7,
      totalPages: 3,
      hasNext: false,
      hasPrev: true,
    });
  });

  it("computes meta for empty result", () => {
    const r = buildPaginatedResult<number>([], 1, 10, 0);
    expect(r.items).toEqual([]);
    expect(r.meta).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });
  });

  it("computes hasPrev=true on page>1", () => {
    const r = buildPaginatedResult([1], 2, 1, 3);
    expect(r.meta.hasPrev).toBe(true);
    expect(r.meta.hasNext).toBe(true);
  });

  it("exact fit divides correctly (total % limit === 0)", () => {
    const r = buildPaginatedResult([1, 2], 5, 2, 10);
    expect(r.meta.totalPages).toBe(5);
    expect(r.meta.hasNext).toBe(false);
  });
});
