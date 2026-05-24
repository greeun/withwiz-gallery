import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  parsePagination,
  getSearchParam,
  validateAndParse,
  validateIds,
  parseSortKey,
} from "../../src/utils/api-helpers";

function makeReq(url: string): { url: string } {
  return { url } as any;
}

describe("parsePagination", () => {
  it("defaults to page 1 limit 20", () => {
    expect(parsePagination(makeReq("https://x.com/api") as any)).toEqual({ page: 1, limit: 20 });
  });
  it("parses query params", () => {
    expect(parsePagination(makeReq("https://x.com/api?page=3&limit=5") as any)).toEqual({ page: 3, limit: 5 });
  });
  it("clamps invalid", () => {
    expect(parsePagination(makeReq("https://x.com/api?page=-1&limit=9999") as any)).toEqual({ page: 1, limit: 100 });
  });
});

describe("getSearchParam", () => {
  it("returns string value", () => {
    expect(getSearchParam(makeReq("https://x.com/?q=hello") as any, "q")).toBe("hello");
  });
  it("returns undefined for missing", () => {
    expect(getSearchParam(makeReq("https://x.com/") as any, "q")).toBeUndefined();
  });
});

describe("validateAndParse", () => {
  const schema = z.object({ name: z.string() });
  it("success path", () => {
    const r = validateAndParse(schema, { name: "x" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.name).toBe("x");
  });
  it("failure returns 400 response", async () => {
    const r = validateAndParse(schema, { name: 1 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.response.status).toBe(400);
  });
});

describe("validateIds", () => {
  it("accepts non-empty cuid array", () => {
    const r = validateIds(["clxxxxxxxxxxxxxxxxxxxxxxx"]);
    expect(r.valid).toBe(true);
  });
  it("rejects non-array", () => {
    const r = validateIds("nope" as any);
    expect(r.valid).toBe(false);
  });
  it("rejects empty array", () => {
    const r = validateIds([]);
    expect(r.valid).toBe(false);
  });
});

describe("parseSortKey", () => {
  it("returns provided when in allow-list", () => {
    const sp = new URLSearchParams("sortBy=createdAt");
    expect(parseSortKey(sp, ["createdAt", "sortOrder"] as const, "sortOrder")).toBe("createdAt");
  });
  it("falls back when not in allow-list", () => {
    const sp = new URLSearchParams("sortBy=evil");
    expect(parseSortKey(sp, ["createdAt", "sortOrder"] as const, "sortOrder")).toBe("sortOrder");
  });
});
