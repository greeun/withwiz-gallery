import { NextResponse } from "next/server";
import type { z } from "zod";

interface RequestLike {
  url: string;
}

export function parsePagination(req: RequestLike): { page: number; limit: number } {
  const { searchParams } = new URL(req.url);
  const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "20", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
  return { page, limit };
}

export function getSearchParam(req: RequestLike, key: string): string | undefined {
  const { searchParams } = new URL(req.url);
  const v = searchParams.get(key);
  return v ?? undefined;
}

export type ValidateAndParseResult<T> =
  | { success: true; data: T }
  | { success: false; response: Response };

export function validateAndParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): ValidateAndParseResult<T> {
  const parsed = schema.safeParse(data);
  if (parsed.success) return { success: true, data: parsed.data };
  return {
    success: false,
    response: NextResponse.json(
      { success: false, error: "ValidationError", details: parsed.error.issues },
      { status: 400 },
    ),
  };
}

export type ValidateIdsResult =
  | { valid: true; ids: string[] }
  | { valid: false; response: Response };

export function validateIds(input: unknown): ValidateIdsResult {
  if (!Array.isArray(input) || input.length === 0) {
    return {
      valid: false,
      response: NextResponse.json(
        { success: false, error: "InvalidIds", message: "ids must be a non-empty array" },
        { status: 400 },
      ),
    };
  }
  const ids = input.filter((x): x is string => typeof x === "string" && x.length > 0);
  if (ids.length === 0) {
    return {
      valid: false,
      response: NextResponse.json(
        { success: false, error: "InvalidIds", message: "ids array contains no valid strings" },
        { status: 400 },
      ),
    };
  }
  return { valid: true, ids };
}

export function parseSortKey<T extends string>(
  searchParams: URLSearchParams,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = searchParams.get("sortBy");
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}
