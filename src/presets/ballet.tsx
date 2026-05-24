/**
 * @withwiz/gallery-kit/presets/ballet
 *
 * 발레용 reference public 컴포넌트. ballet 의
 *   `src/components/sections/Gallery.tsx`
 * 의 모자이크 + 라이트박스 결합을 host 독립으로 추출.
 *
 * 사용 예 (host RSC + client mount):
 *
 *   import { PublicGalleryMosaic } from "@withwiz/gallery-kit/presets/ballet";
 *   import { getFeaturedGalleries } from "@withwiz/gallery-kit/server";
 *   import "@withwiz/gallery-kit/components/gallery.css";
 *
 *   export default async function HomePage() {
 *     const featured = await getFeaturedGalleries(config, 7);
 *     const images = featured.map((g) => ({ src: g.imageUrl, alt: g.caption ?? "갤러리" }));
 *     return <PublicGalleryMosaic images={images} count={7} />;
 *   }
 *
 * yeroom 등 다른 host 는 이 preset 을 fork 하거나 `useGalleryLightbox` hook 만
 * 가져다 직접 그릴 수 있다.
 *
 * Host-independence:
 *   - `next/image`, `next/navigation`, `useI18n`, `@withwiz/pms` 등 직접 의존 0
 *   - 이미지는 plain `<img>` 사용. host 가 next/image 로 그리고 싶다면 fork.
 *   - 모든 라벨은 props.i18n 으로만 (fallback 한글).
 */

import { useEffect, useRef, useState, type JSX } from "react";
import { useGalleryLightbox, type LightboxImage } from "../hooks/useGalleryLightbox";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { cn } from "../utils/cn";

const FALLBACK_I18N = {
  sectionLabel: "갤러리",
  moments: "공연의 순간들",
  expandAria: "이미지 확대",
  lbClose: "닫기",
  lbPrev: "이전 이미지",
  lbNext: "다음 이미지",
} as const;

export interface PublicGalleryMosaicProps {
  /** 표시할 이미지 목록 (host 가 loaders 등에서 받아온 src/alt 매핑) */
  images: LightboxImage[];
  /** 모자이크 그리드 칸 수 (default 7). images.length > count 이면 slice. */
  count?: number;
  /** UI 라벨 i18n override. 미주입 키는 한글 fallback. */
  i18n?: Partial<Record<keyof typeof FALLBACK_I18N, string>>;
  /** 외부 className 추가 */
  className?: string;
  /** 스크롤 reveal (IntersectionObserver) 사용 여부 (default true). false 면 즉시 visible. */
  scrollReveal?: boolean;
  /** 섹션 헤더 비노출 (default false). host 가 자체 헤더를 두는 경우 true. */
  hideHeader?: boolean;
}

/**
 * 발레 home gallery 의 모자이크 + 라이트박스.
 *
 *   - useGalleryLightbox 가 ESC / Arrow 키바인딩과 wrap-around 를 담당.
 *   - useScrollReveal 로 fade-in (scrollReveal=true 일 때).
 *   - lightbox open 시 body scroll lock (overflow:hidden).
 *   - images 가 빈 배열이면 null 반환.
 */
export function PublicGalleryMosaic(props: PublicGalleryMosaicProps): JSX.Element | null {
  const {
    images: rawImages,
    count = 7,
    i18n: i18nOverride,
    className,
    scrollReveal = true,
    hideHeader = false,
  } = props;

  const i18n = { ...FALLBACK_I18N, ...(i18nOverride ?? {}) };

  // count 만큼 잘라 사용 (images.length > count 인 경우 super-fluous 제거)
  const images = rawImages.slice(0, count);

  const lightbox = useGalleryLightbox(images);
  const { ref: revealRef, isVisible } = useScrollReveal({ once: true });

  // body scroll lock — lightbox 가 열린 동안 host 페이지의 스크롤을 막는다.
  // SSR safe: document 가 정의된 환경에서만 동작.
  useEffect(() => {
    if (!lightbox.isOpen) return;
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lightbox.isOpen]);

  // useScrollReveal 의 ref 는 RefObject<HTMLElement | null> 광폭 타입.
  // <section> element 에 마운트하기 위한 어댑터 ref.
  const sectionRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!scrollReveal) return;
    // sectionRef.current 를 revealRef 에 동기화 (initial only — sectionRef 가 안정적이라 가정)
    revealRef.current = sectionRef.current;
  }, [scrollReveal, revealRef]);

  if (images.length === 0) return null;

  const showReveal = scrollReveal ? isVisible : true;

  return (
    <section
      ref={sectionRef}
      className={cn(
        "gallery-public-mosaic-section",
        showReveal && "gallery-public-mosaic-section--visible",
        className,
      )}
      aria-label={i18n.sectionLabel}
    >
      {!hideHeader && (
        <header className="gallery-public-mosaic__head">
          <div className="gallery-public-mosaic__label">{i18n.sectionLabel}</div>
          <h2 className="gallery-public-mosaic__title">{i18n.moments}</h2>
        </header>
      )}

      <div className="gallery-public-mosaic" data-count={images.length}>
        {images.map((img, i) => (
          <div
            key={`${img.src}-${i}`}
            className="gallery-public-mosaic__item"
            role="button"
            tabIndex={0}
            aria-label={img.alt ?? i18n.expandAria}
            onClick={() => lightbox.open(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                lightbox.open(i);
              }
            }}
          >
            <img
              src={img.src}
              alt={img.alt ?? ""}
              className="gallery-public-mosaic__img"
              loading="lazy"
            />
            <div className="gallery-public-mosaic__hover">
              <div className="gallery-public-mosaic__icon" aria-hidden="true">
                +
              </div>
            </div>
          </div>
        ))}
      </div>

      {lightbox.isOpen && lightbox.current && (
        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={i18n.moments}
          onClick={lightbox.close}
        >
          <button
            type="button"
            className="gallery-lightbox__close"
            aria-label={i18n.lbClose}
            onClick={(e) => {
              e.stopPropagation();
              lightbox.close();
            }}
          >
            ×
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                className="gallery-lightbox__nav gallery-lightbox__prev"
                aria-label={i18n.lbPrev}
                onClick={(e) => {
                  e.stopPropagation();
                  lightbox.prev();
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="gallery-lightbox__nav gallery-lightbox__next"
                aria-label={i18n.lbNext}
                onClick={(e) => {
                  e.stopPropagation();
                  lightbox.next();
                }}
              >
                ›
              </button>
            </>
          )}

          <div className="gallery-lightbox__content" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.current.src}
              alt={lightbox.current.alt ?? ""}
              className="gallery-lightbox__img"
            />
          </div>

          {images.length > 1 && (
            <div className="gallery-lightbox__counter">
              {lightbox.currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
