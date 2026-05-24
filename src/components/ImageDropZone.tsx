import { useRef, type JSX } from "react";
import { useImageDropZone } from "../hooks/useImageDropZone";
import { cn } from "../utils/cn";

export interface ImageDropZoneProps {
  onFiles: (files: File[]) => void | Promise<void>;
  accept?: string[];
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  /** 현재 표시할 미리보기 이미지 URL (선택). null/undefined 면 placeholder 표시. */
  previewUrl?: string | null;
  /** i18n 키 미주입 시 fallback 텍스트. host 의 i18n 시스템과 무관. */
  i18n?: {
    dropPrompt?: string;
    replacePrompt?: string;
    rejected?: string;
  };
  className?: string;
}

const DEFAULT_TEXT = {
  dropPrompt: "Drop image here or click to browse",
  replacePrompt: "Drop a new image to replace",
  rejected: "Some files were rejected",
};

/** primitive UI 드롭존. useImageDropZone hook 위에 얹은 thin component.
 *
 *  - 클릭 시 hidden `<input type="file">` 트리거
 *  - previewUrl 있으면 이미지 표시 + replace 안내
 *  - isDragging 상태에서 `.gallery-dropzone--dragging` 클래스
 *  - rejectedReasons 가 있으면 `.gallery-dropzone__rejected` 영역 표시
 */
export function ImageDropZone(props: ImageDropZoneProps): JSX.Element {
  const {
    onFiles,
    accept,
    maxSize,
    multiple,
    disabled = false,
    previewUrl,
    i18n,
    className,
  } = props;

  const inputRef = useRef<HTMLInputElement>(null);

  const { isDragging, dropProps, inputProps, rejectedReasons } = useImageDropZone({
    onFiles,
    accept,
    maxSize,
    multiple,
    disabled,
  });

  const text = {
    dropPrompt: i18n?.dropPrompt ?? DEFAULT_TEXT.dropPrompt,
    replacePrompt: i18n?.replacePrompt ?? DEFAULT_TEXT.replacePrompt,
    rejected: i18n?.rejected ?? DEFAULT_TEXT.rejected,
  };

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const containerClass = cn(
    "gallery-dropzone",
    isDragging && "gallery-dropzone--dragging",
    disabled && "gallery-dropzone--disabled",
    previewUrl && "gallery-dropzone--has-preview",
    className,
  );

  return (
    <div className="gallery-dropzone-wrap">
      <input
        ref={inputRef}
        {...inputProps}
        disabled={disabled}
        className="gallery-dropzone__input"
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
        aria-hidden="true"
        tabIndex={-1}
      />
      <div
        className={containerClass}
        onClick={openPicker}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        {...dropProps}
      >
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt=""
              className="gallery-dropzone__preview"
            />
            <div className="gallery-dropzone__prompt gallery-dropzone__prompt--overlay">
              {text.replacePrompt}
            </div>
          </>
        ) : (
          <div className="gallery-dropzone__prompt">{text.dropPrompt}</div>
        )}
      </div>
      {rejectedReasons.length > 0 ? (
        <ul className="gallery-dropzone__rejected" role="alert">
          <li className="gallery-dropzone__rejected-title">{text.rejected}</li>
          {rejectedReasons.map((reason, i) => (
            <li key={i} className="gallery-dropzone__rejected-item">
              {reason}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
