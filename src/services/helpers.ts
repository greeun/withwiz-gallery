import type { PaginatedResult } from "../types/pagination";

/**
 * pagination math 를 일관되게 처리. 일반적인 offset 페이지네이션 메타 계산과 같은 시맨틱.
 *
 * - total === 0 일 때 totalPages = 0 (clamp 안 함; UI 에서 "결과 없음" 로 처리)
 * - page > totalPages 여도 결과 자체는 caller 의 query 가 결정 — meta 만 계산
 */
export function buildPaginatedResult<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResult<T> {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
