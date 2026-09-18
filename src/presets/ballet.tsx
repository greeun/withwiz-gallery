/**
 * @withwiz/gallery/presets/ballet — 호환 별칭
 *
 * 0.2.x 까지 공개하던 서브패스다. 구현은 `@withwiz/gallery/presets/mosaic` 으로 옮겼고,
 * 이 모듈은 이전 기본 제목("공연의 순간들")만 유지한 채 같은 컴포넌트를 렌더링한다.
 *
 * @deprecated `@withwiz/gallery/presets/mosaic` 을 사용하고, 제목은 `i18n.moments` 로 지정한다.
 */

import type { JSX } from "react";
import {
  PublicGalleryMosaic as MosaicPreset,
  type PublicGalleryMosaicProps,
} from "./mosaic";

export type { PublicGalleryMosaicProps };

/** 0.2.x 기본 라벨 중 presets/mosaic 과 다른 값 */
const LEGACY_I18N = { moments: "공연의 순간들" } as const;

/** @deprecated `@withwiz/gallery/presets/mosaic` 의 `PublicGalleryMosaic` 을 사용한다. */
export function PublicGalleryMosaic(props: PublicGalleryMosaicProps): JSX.Element {
  return <MosaicPreset {...props} i18n={{ ...LEGACY_I18N, ...(props.i18n ?? {}) }} />;
}
