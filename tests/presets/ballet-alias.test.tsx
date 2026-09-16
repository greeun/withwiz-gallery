import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicGalleryMosaic as BalletMosaic } from "../../src/presets/ballet";
import { PublicGalleryMosaic } from "../../src/presets/mosaic";
import type { LightboxImage } from "../../src/hooks/useGalleryLightbox";

/**
 * presets/ballet 는 presets/mosaic 의 호환 별칭이다.
 * 0.2.x 까지의 사용자가 보던 기본 제목("공연의 순간들")만 유지하고, 나머지 동작은 mosaic 과 같다.
 */
const images: LightboxImage[] = [
  { src: "/a.jpg", alt: "a" },
  { src: "/b.jpg", alt: "b" },
];

describe("presets/ballet 호환 별칭", () => {
  it("i18n 을 지정하지 않으면 이전 기본 제목을 유지한다", () => {
    const { container } = render(<BalletMosaic images={images} />);
    expect(container.querySelector(".gallery-public-mosaic__title")?.textContent).toBe("공연의 순간들");
    expect(container.querySelector("section")?.getAttribute("aria-label")).toBe("갤러리");
  });

  it("i18n 으로 지정한 라벨이 별칭의 기본 제목보다 우선한다", () => {
    const { container } = render(
      <BalletMosaic images={images} i18n={{ moments: "Moments", sectionLabel: "Gallery" }} />,
    );
    expect(container.querySelector(".gallery-public-mosaic__title")?.textContent).toBe("Moments");
    expect(container.querySelector("section")?.getAttribute("aria-label")).toBe("Gallery");
  });

  it("기본 제목 외의 마크업은 presets/mosaic 과 같다", () => {
    const i18n = { moments: "같은 제목" };
    const alias = render(<BalletMosaic images={images} count={1} className="x" i18n={i18n} />);
    const generic = render(<PublicGalleryMosaic images={images} count={1} className="x" i18n={i18n} />);
    expect(alias.container.innerHTML).toBe(generic.container.innerHTML);
  });
});
