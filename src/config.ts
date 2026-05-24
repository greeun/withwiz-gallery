import type { GalleryConfig } from "./types";

let _config: GalleryConfig | null = null;

export function setGalleryConfig(config: GalleryConfig): void {
  _config = config;
}

export function getGalleryConfig(): GalleryConfig {
  if (!_config) {
    throw new Error(
      "[@withwiz/gallery-kit] GalleryConfig is not set. Call setGalleryConfig(config) at app bootstrap before using gallery-kit APIs.",
    );
  }
  return _config;
}

/** test 전용 — runtime 코드에서 호출하지 말 것. */
export function resetGalleryConfig(): void {
  _config = null;
}
