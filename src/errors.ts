/**
 * Typed error 계층 — Sprint 3 follow-up.
 *
 * Sprint 3 의 위험 2 ("service throw → HTTP 매핑이 메시지 문자열 매칭에 의존") 를 해소한다.
 * route handler 는 `instanceof` 분기로 HTTP status / error code 를 결정한다.
 *
 * 외부 동작 (HTTP status + response body shape) 은 그대로 유지하고, 내부 표현만 강화한다.
 *
 * 호스트 (Next.js / Express / 기타) 에서도 catch 후 자체 처리 가능하도록
 * `src/index.ts` 와 `src/server/index.ts` 양쪽에서 re-export 한다.
 */

export class GalleryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class GalleryNotFoundError extends GalleryError {
  constructor(public readonly id: string) {
    super(`Gallery not found: ${id}`);
  }
}

export class CategoryNotFoundError extends GalleryError {
  constructor(public readonly id: string) {
    super(`Category not found: ${id}`);
  }
}

export class CategoryInUseError extends GalleryError {
  constructor(
    public readonly categoryId: string,
    public readonly galleryCount: number,
  ) {
    super(
      `Category ${categoryId} is in use by ${galleryCount} galleries`,
    );
  }
}

export class PermissionDeniedError extends GalleryError {
  constructor(
    public readonly action: "edit" | "delete",
    public readonly resourceId: string,
  ) {
    super(`Permission denied: cannot ${action} ${resourceId}`);
  }
}

export class FeaturedLimitExceededError extends GalleryError {
  constructor(
    public readonly limit: number,
    public readonly attempted: number,
  ) {
    super(`Featured limit exceeded: ${attempted} requested, limit is ${limit}`);
  }
}
