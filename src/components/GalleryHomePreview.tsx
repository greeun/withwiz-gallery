import { useCallback, useRef, useState, type DragEvent, type JSX } from "react";
import { cn } from "../utils/cn";
import type { GalleryI18nKey, GalleryListItem } from "../types";

export interface GalleryHomePreviewProps {
  /** 표시할 항목들 — 호출자가 published & featured 필터 + 정렬을 마친 상태. */
  items: GalleryListItem[];
  /** 모자이크 셀 개수 (host config.limits.mosaicCount). */
  maxCount: number;
  /** drag-and-drop 으로 재정렬된 결과를 통보. orderedIds 의 길이 = 현재 보이는 items 수. */
  onReorder: (orderedIds: string[]) => void | Promise<void>;
  /** ★ 토글. next = 현재 featured 의 반대값. */
  onToggleFeatured: (id: string, next: boolean) => void | Promise<void>;
  i18n?: Partial<Record<GalleryI18nKey, string>>;
  className?: string;
}

const DEFAULT_TEXT: Partial<Record<GalleryI18nKey, string>> = {
  "preview.title": "Home preview",
  "preview.dragHint": "Drag tiles to reorder",
  "preview.emptyState": "Select images to feature on the home page",
};

function t(
  i18n: Partial<Record<GalleryI18nKey, string>> | undefined,
  key: GalleryI18nKey,
): string {
  return i18n?.[key] ?? DEFAULT_TEXT[key] ?? key;
}

/** 어드민 홈 프리뷰 — 모자이크 그리드 + HTML5 drag swap + 별 토글.
 *
 *  drag 동작:
 *    1. dragStart 에서 dragIndex 기록
 *    2. dragOver 에서 dragOverIndex 기록 (visual highlight 용)
 *    3. drop 시 dragIndex 와 drop target index 가 다르면 swap 후 onReorder
 *
 *  키보드 접근성은 v0.2 — 현재는 mouse 만.
 */
export function GalleryHomePreview(props: GalleryHomePreviewProps): JSX.Element {
  const { items, maxCount, onReorder, onToggleFeatured, i18n, className } = props;

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const reorderedRef = useRef<string[] | null>(null);

  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, index: number) => {
      setDragIndex(index);
      try {
        e.dataTransfer.effectAllowed = "move";
      } catch {}
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>, index: number) => {
      e.preventDefault();
      try {
        e.dataTransfer.dropEffect = "move";
      } catch {}
      setDragOverIndex(index);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, dropIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === dropIndex) {
        reorderedRef.current = null;
        return;
      }
      const reordered = [...items];
      const tmp = reordered[dragIndex];
      reordered[dragIndex] = reordered[dropIndex];
      reordered[dropIndex] = tmp;
      reorderedRef.current = reordered.map((it) => it.id);
    },
    [dragIndex, items],
  );

  const handleDragEnd = useCallback(() => {
    if (reorderedRef.current) {
      void onReorder(reorderedRef.current);
    }
    reorderedRef.current = null;
    setDragIndex(null);
    setDragOverIndex(null);
  }, [onReorder]);

  const handleStarClick = useCallback(
    (item: GalleryListItem) => {
      void onToggleFeatured(item.id, !item.featured);
    },
    [onToggleFeatured],
  );

  if (items.length === 0) {
    return (
      <div className={cn("gallery-home-preview", "gallery-home-preview--empty", className)}>
        <div className="gallery-home-preview__header">
          <h3 className="gallery-home-preview__title">{t(i18n, "preview.title")}</h3>
        </div>
        <div className="gallery-home-preview__empty">{t(i18n, "preview.emptyState")}</div>
      </div>
    );
  }

  return (
    <div className={cn("gallery-home-preview", className)}>
      <div className="gallery-home-preview__header">
        <h3 className="gallery-home-preview__title">{t(i18n, "preview.title")}</h3>
        <span className="gallery-home-preview__count">
          {items.length}/{maxCount}
        </span>
      </div>
      <div className="gallery-home-preview__hint">{t(i18n, "preview.dragHint")}</div>
      <div
        className="gallery-home-preview__mosaic"
        data-count={maxCount}
      >
        {Array.from({ length: maxCount }).map((_, slotIndex) => {
          const item = items[slotIndex];
          if (!item) {
            return (
              <div
                key={`empty-${slotIndex}`}
                className="gallery-home-preview__tile gallery-home-preview__tile--empty"
              >
                <span className="gallery-home-preview__order">{slotIndex + 1}</span>
              </div>
            );
          }
          return (
            <div
              key={item.id}
              className={cn(
                "gallery-home-preview__tile",
                dragOverIndex === slotIndex && "gallery-home-preview__tile--drag-over",
                dragIndex === slotIndex && "gallery-home-preview__tile--dragging",
              )}
              draggable
              onDragStart={(e) => handleDragStart(e, slotIndex)}
              onDragOver={(e) => handleDragOver(e, slotIndex)}
              onDrop={(e) => handleDrop(e, slotIndex)}
              onDragEnd={handleDragEnd}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.caption ?? ""}
                className="gallery-home-preview__img"
              />
              <button
                type="button"
                className={cn(
                  "gallery-home-preview__star",
                  item.featured && "gallery-home-preview__star--active",
                )}
                onClick={() => handleStarClick(item)}
                aria-label={item.featured ? "unfeature" : "feature"}
                aria-pressed={item.featured}
              >
                {item.featured ? "★" : "☆"}
              </button>
              <span className="gallery-home-preview__order">{slotIndex + 1}</span>
              {item.caption ? (
                <div className="gallery-home-preview__caption">{item.caption}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
