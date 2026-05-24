import { useCallback, useEffect, useState } from "react";

export interface LightboxImage {
  src: string;
  alt?: string;
}

export interface UseGalleryLightboxReturn {
  isOpen: boolean;
  currentIndex: number;
  current: LightboxImage | null;
  open: (index: number) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
}

/** headless 갤러리 라이트박스. open 상태에서 ESC / ←/→ 키바인딩 자동 등록.
 *
 *  - 이미지 0개일 때 `open` 호출은 no-op.
 *  - `next` / `prev` 는 wrap-around (마지막 다음 = 처음).
 *  - SSR safe: window keydown listener 는 isOpen && typeof window !== "undefined" 일 때만 등록.
 */
export function useGalleryLightbox(images: LightboxImage[]): UseGalleryLightboxReturn {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const isOpen = currentIndex >= 0 && currentIndex < images.length;
  const current = isOpen ? images[currentIndex] ?? null : null;

  const open = useCallback(
    (index: number) => {
      if (images.length === 0) return;
      if (index < 0 || index >= images.length) return;
      setCurrentIndex(index);
    },
    [images.length],
  );

  const close = useCallback(() => {
    setCurrentIndex(-1);
  }, []);

  const next = useCallback(() => {
    if (images.length === 0) return;
    setCurrentIndex((prev) => (prev < 0 ? prev : (prev + 1) % images.length));
  }, [images.length]);

  const prev = useCallback(() => {
    if (images.length === 0) return;
    setCurrentIndex((p) => (p < 0 ? p : (p - 1 + images.length) % images.length));
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === "undefined") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [isOpen, close, next, prev]);

  return { isOpen, currentIndex: isOpen ? currentIndex : -1, current, open, close, next, prev };
}
