export type ImageVariant = "lg" | "md" | "sm" | "thumb";

/** URL 의 파일 확장자 앞에 variant suffix 를 삽입.
 *  - "lg" 는 원본을 그대로 반환 (관례)
 *  - 확장자 없는 경로는 그대로 반환
 *  예: getVariantUrl("/a/b.webp", "md") -> "/a/b_md.webp"
 */
export function getVariantUrl(url: string, variant: ImageVariant): string {
  if (variant === "lg") return url;
  const dotIdx = url.lastIndexOf(".");
  const slashIdx = url.lastIndexOf("/");
  if (dotIdx === -1 || dotIdx < slashIdx) return url;
  const base = url.slice(0, dotIdx);
  const ext = url.slice(dotIdx);
  return `${base}_${variant}${ext}`;
}
