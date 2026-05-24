import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicGalleryMosaic } from "../../src/presets/ballet";
import type { LightboxImage } from "../../src/hooks/useGalleryLightbox";

function makeImages(n: number): LightboxImage[] {
  return Array.from({ length: n }, (_, i) => ({
    src: `/img${i}.jpg`,
    alt: `이미지 ${i}`,
  }));
}

describe("PublicGalleryMosaic", () => {
  it("images 가 빈 배열이면 null 렌더 (DOM 에 아무 요소 없음)", () => {
    const { container } = render(<PublicGalleryMosaic images={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("기본 count=7, 7장 전달 시 data-count='7' 모자이크 + 7 tile 노출", () => {
    const { container } = render(<PublicGalleryMosaic images={makeImages(7)} />);
    const mosaic = container.querySelector(".gallery-public-mosaic");
    expect(mosaic).not.toBeNull();
    expect(mosaic!.getAttribute("data-count")).toBe("7");
    const tiles = container.querySelectorAll(".gallery-public-mosaic__item");
    expect(tiles.length).toBe(7);
  });

  it("images.length 가 count 보다 크면 count 만큼만 노출 (slice)", () => {
    const { container } = render(
      <PublicGalleryMosaic images={makeImages(10)} count={4} />,
    );
    const tiles = container.querySelectorAll(".gallery-public-mosaic__item");
    expect(tiles.length).toBe(4);
    expect(
      container.querySelector(".gallery-public-mosaic")?.getAttribute("data-count"),
    ).toBe("4");
  });

  it("tile 클릭 → lightbox overlay 노출 (.gallery-lightbox)", () => {
    const { container } = render(<PublicGalleryMosaic images={makeImages(3)} />);
    expect(container.querySelector(".gallery-lightbox")).toBeNull();
    const firstTile = container.querySelector(
      ".gallery-public-mosaic__item",
    ) as HTMLElement;
    expect(firstTile).not.toBeNull();
    act(() => {
      fireEvent.click(firstTile);
    });
    const overlay = container.querySelector(".gallery-lightbox");
    expect(overlay).not.toBeNull();
    // 첫 이미지가 표시됨
    const lightboxImg = container.querySelector(
      ".gallery-lightbox__img",
    ) as HTMLImageElement | null;
    expect(lightboxImg?.getAttribute("src")).toBe("/img0.jpg");
  });

  it("lightbox 열린 상태에서 ArrowRight → 다음 이미지", () => {
    const { container } = render(<PublicGalleryMosaic images={makeImages(3)} />);
    const firstTile = container.querySelector(
      ".gallery-public-mosaic__item",
    ) as HTMLElement;
    act(() => {
      fireEvent.click(firstTile);
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    });
    const lightboxImg = container.querySelector(
      ".gallery-lightbox__img",
    ) as HTMLImageElement;
    expect(lightboxImg.getAttribute("src")).toBe("/img1.jpg");
  });

  it("lightbox 열린 상태에서 ESC → close (overlay 사라짐)", () => {
    const { container } = render(<PublicGalleryMosaic images={makeImages(3)} />);
    const firstTile = container.querySelector(
      ".gallery-public-mosaic__item",
    ) as HTMLElement;
    act(() => {
      fireEvent.click(firstTile);
    });
    expect(container.querySelector(".gallery-lightbox")).not.toBeNull();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(container.querySelector(".gallery-lightbox")).toBeNull();
  });

  it("hideHeader=true 시 헤더(.gallery-public-mosaic__head) 미렌더", () => {
    const { container } = render(
      <PublicGalleryMosaic images={makeImages(3)} hideHeader />,
    );
    expect(container.querySelector(".gallery-public-mosaic__head")).toBeNull();
  });

  it("i18n.expandAria override 가 tile 의 aria-label 에 반영 (img.alt 미설정 시)", () => {
    const images: LightboxImage[] = [{ src: "/x.jpg" }];
    const { container } = render(
      <PublicGalleryMosaic
        images={images}
        i18n={{ expandAria: "확대해서 보기" }}
      />,
    );
    const tile = container.querySelector(
      ".gallery-public-mosaic__item",
    ) as HTMLElement;
    expect(tile.getAttribute("aria-label")).toBe("확대해서 보기");
  });

  it("lightbox close 버튼 클릭 → close", () => {
    const { container } = render(<PublicGalleryMosaic images={makeImages(2)} />);
    const firstTile = container.querySelector(
      ".gallery-public-mosaic__item",
    ) as HTMLElement;
    act(() => {
      fireEvent.click(firstTile);
    });
    const closeBtn = container.querySelector(
      ".gallery-lightbox__close",
    ) as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    act(() => {
      fireEvent.click(closeBtn);
    });
    expect(container.querySelector(".gallery-lightbox")).toBeNull();
  });

  it("lightbox prev / next 버튼 클릭 동작", () => {
    const { container } = render(<PublicGalleryMosaic images={makeImages(3)} />);
    const firstTile = container.querySelector(
      ".gallery-public-mosaic__item",
    ) as HTMLElement;
    act(() => {
      fireEvent.click(firstTile);
    });
    const nextBtn = container.querySelector(
      ".gallery-lightbox__next",
    ) as HTMLButtonElement;
    act(() => {
      fireEvent.click(nextBtn);
    });
    let lightboxImg = container.querySelector(
      ".gallery-lightbox__img",
    ) as HTMLImageElement;
    expect(lightboxImg.getAttribute("src")).toBe("/img1.jpg");

    const prevBtn = container.querySelector(
      ".gallery-lightbox__prev",
    ) as HTMLButtonElement;
    act(() => {
      fireEvent.click(prevBtn);
    });
    lightboxImg = container.querySelector(
      ".gallery-lightbox__img",
    ) as HTMLImageElement;
    expect(lightboxImg.getAttribute("src")).toBe("/img0.jpg");
  });
});
