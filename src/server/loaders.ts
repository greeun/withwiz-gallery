/**
 * RSC loaders — spec §9-4.
 *
 * Server Components 가 직접 호출하는 함수. 각 함수는 service 의 대응 메서드를
 * 얇게 감싸기만 한다. host 가 매번 `config` 를 주입해 explicit DI 를 유지한다
 * (setGalleryConfig 의존 회피 — host 의 layout/page 에서 config 를 명시적으로
 * 주입하는 것이 RSC graph 캐싱과 호환성 면에서 더 안전).
 */
import type {
  GalleryConfig,
  GalleryListItem,
  PaginatedResult,
} from "../types";
import { createGalleryService } from "../services";

type SortKey = "sortOrder" | "createdAt" | "updatedAt" | "caption";

/**
 * spec §9-4: `getGalleryItems(config, opts) → PaginatedResult<GalleryListItem>`
 *
 * admin 페이지의 RSC 가 직접 호출. fetch 라운드트립 없이 service 호출.
 */
export async function getGalleryItems(
  config: GalleryConfig,
  opts: {
    page?: number;
    limit?: number;
    categoryId?: string;
    published?: boolean;
    search?: string;
    sortBy?: SortKey;
  },
): Promise<PaginatedResult<GalleryListItem>> {
  const service = createGalleryService(config);
  return service.listAll(opts);
}

/**
 * spec §9-4: `getFeaturedGalleries(config, limit?) → GalleryListItem[]`
 *
 * 홈 페이지의 모자이크 그리드 등 featured 영역에서 호출.
 */
export async function getFeaturedGalleries(
  config: GalleryConfig,
  limit?: number,
): Promise<GalleryListItem[]> {
  const service = createGalleryService(config);
  return service.listFeatured(limit);
}

/**
 * spec §9-4: `getRecentGalleries(config, limit) → GalleryListItem[]`
 *
 * 대시보드의 최근 항목 위젯 등에서 호출.
 */
export async function getRecentGalleries(
  config: GalleryConfig,
  limit: number,
): Promise<GalleryListItem[]> {
  const service = createGalleryService(config);
  return service.listRecent(limit);
}

/**
 * spec §9-4: `getGalleryCount(config, opts?) → number`
 *
 * 대시보드 통계 등에서 호출. `opts.published` 미지정 시 전체 count.
 */
export async function getGalleryCount(
  config: GalleryConfig,
  opts?: { published?: boolean },
): Promise<number> {
  const service = createGalleryService(config);
  return service.count(opts);
}
