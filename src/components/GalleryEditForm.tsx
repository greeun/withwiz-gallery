import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type JSX,
} from "react";
import { cn } from "../utils/cn";
import { ToggleSwitch } from "./ToggleSwitch";
import { ImageDropZone } from "./ImageDropZone";
import type {
  CreateGalleryInput,
  GalleryCategoryItem,
  GalleryI18nKey,
  GalleryListItem,
  UpdateGalleryInput,
} from "../types";

export interface GalleryEditFormProps {
  /** 편집 대상. null 이면 새로 생성 모드. */
  value: GalleryListItem | null;
  categories: GalleryCategoryItem[];
  onSubmit: (data: CreateGalleryInput | UpdateGalleryInput) => void | Promise<void>;
  onCancel?: () => void;
  onDelete?: () => void | Promise<void>;
  /** 다중 모드 (새 모드 + 여러 이미지). onSubmitMany 가 함께 주입되어야 동작. */
  multipleMode?: boolean;
  onSubmitMany?: (items: CreateGalleryInput[]) => void | Promise<void>;
  /** featured 토글 가능 여부. false 이고 현재 미선택 상태이면 토글 비활성. true 이면 자유. */
  canToggleFeatured?: boolean;
  saving?: boolean;
  /** 새 모드에서 이미지 파일을 host 가 업로드하고 그 결과 URL 을 반환. 미주입 시 ObjectURL preview 만 가능. */
  onImageSelect?: (file: File) => Promise<{ url: string; key?: string }>;
  i18n?: Partial<Record<GalleryI18nKey, string>>;
  className?: string;
}

interface FormState {
  imageUrl: string;
  imageKey: string;
  caption: string;
  categoryId: string;
  sortOrder: number;
  featured: boolean;
  published: boolean;
}

interface MultiImage {
  url: string;
  key?: string;
}

const DEFAULT_TEXT: Partial<Record<GalleryI18nKey, string>> = {
  "form.caption": "Caption",
  "form.captionPlaceholder": "Image description (optional)",
  "form.category": "Category",
  "form.sortOrder": "Sort order",
  "form.published": "Published",
  "form.featured": "Featured",
  "form.save": "Save",
  "form.cancel": "Cancel",
  "form.imageDropPrompt": "Drop image here or click to browse",
  "form.imageReplacePrompt": "Drop a new image to replace",
  "admin.featuredOverLimit": "Featured cap reached — uncheck others first",
};

function t(
  i18n: Partial<Record<GalleryI18nKey, string>> | undefined,
  key: GalleryI18nKey,
): string {
  return i18n?.[key] ?? DEFAULT_TEXT[key] ?? key;
}

function buildInitialForm(
  value: GalleryListItem | null,
  categories: GalleryCategoryItem[],
): FormState {
  if (value) {
    return {
      imageUrl: value.imageUrl,
      imageKey: value.imageKey ?? "",
      caption: value.caption ?? "",
      categoryId: value.categoryId,
      sortOrder: value.sortOrder,
      featured: value.featured,
      published: value.published,
    };
  }
  return {
    imageUrl: "",
    imageKey: "",
    caption: "",
    categoryId: categories[0]?.id ?? "",
    sortOrder: 0,
    featured: false,
    published: false,
  };
}

/** Gallery admin edit form — self-contained.
 *
 *  단일 모드: 1 image + 메타. value.imageUrl 이 비어있으면 새 이미지를 onImageSelect 로 업로드.
 *  다중 모드 (multipleMode + value=null): 여러 이미지를 자동 caption suffix + sortOrder auto-increment 로 일괄 생성.
 */
export function GalleryEditForm(props: GalleryEditFormProps): JSX.Element {
  const {
    value,
    categories,
    onSubmit,
    onCancel,
    onDelete,
    multipleMode = false,
    onSubmitMany,
    canToggleFeatured = true,
    saving = false,
    onImageSelect,
    i18n,
    className,
  } = props;

  const isNew = value === null;
  const [form, setForm] = useState<FormState>(() => buildInitialForm(value, categories));
  const [multiImages, setMultiImages] = useState<MultiImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const valueIdRef = useRef<string | null>(value?.id ?? null);
  const dirtyRef = useRef(false);

  // value 가 null → non-null 또는 다른 id 로 변경되면 form 을 재초기화.
  // 단, 사용자가 입력 중인 경우 (dirty) 는 덮어쓰지 않음.
  useEffect(() => {
    const newId = value?.id ?? null;
    if (newId !== valueIdRef.current) {
      valueIdRef.current = newId;
      if (!dirtyRef.current) {
        setForm(buildInitialForm(value, categories));
      }
    } else if (value && !dirtyRef.current) {
      // 같은 id 이지만 value 내용이 바뀐 경우 (refresh 후 갱신).
      setForm(buildInitialForm(value, categories));
    }
  }, [value, categories]);

  // categories 가 늦게 로드된 경우, form.categoryId 가 비어있으면 첫 항목으로 채움.
  useEffect(() => {
    if (!form.categoryId && categories.length > 0) {
      setForm((f) => ({ ...f, categoryId: categories[0].id }));
    }
  }, [categories, form.categoryId]);

  const isMultiActive = isNew && multipleMode && multiImages.length > 1;

  // featured 토글의 disabled 결정.
  // canToggleFeatured=false && 현재 form.featured=false → 켜는 것은 차단. 끄는 것은 가능.
  const featuredDisabled = !canToggleFeatured && !form.featured;

  const updateField = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    dirtyRef.current = true;
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setImageError(null);
      if (!onImageSelect) {
        setImageError("onImageSelect prop missing — host must provide upload handler");
        return;
      }
      try {
        if (isNew && multipleMode) {
          // 다중 모드 — 각 파일 업로드 후 multiImages 누적.
          const uploaded = await Promise.all(files.map((f) => onImageSelect(f)));
          setMultiImages((prev) => {
            const next = [...prev, ...uploaded];
            // 첫 번째 이미지를 form.imageUrl 로 반영 (단일 저장 fallback 용).
            setForm((f) => {
              if (!f.imageUrl && next.length > 0) {
                return { ...f, imageUrl: next[0].url, imageKey: next[0].key ?? "" };
              }
              return f;
            });
            return next;
          });
        } else {
          // 단일 모드 — 첫 파일만 사용.
          const r = await onImageSelect(files[0]);
          setForm((f) => ({ ...f, imageUrl: r.url, imageKey: r.key ?? "" }));
        }
      } catch (err) {
        setImageError(err instanceof Error ? err.message : "Image upload failed");
      }
    },
    [isNew, multipleMode, onImageSelect],
  );

  const handleSubmit = useCallback(async () => {
    if (isMultiActive && onSubmitMany) {
      const items: CreateGalleryInput[] = multiImages.map((img, i) => ({
        imageUrl: img.url,
        imageKey: img.key || undefined,
        caption: form.caption ? `${form.caption}_${i + 1}` : undefined,
        categoryId: form.categoryId,
        sortOrder: form.sortOrder + i,
        featured: form.featured,
        published: form.published,
      }));
      await onSubmitMany(items);
      return;
    }

    if (!form.imageUrl) {
      setImageError("Image is required");
      return;
    }

    const payload: CreateGalleryInput | UpdateGalleryInput = {
      imageUrl: form.imageUrl,
      imageKey: form.imageKey || undefined,
      caption: form.caption || undefined,
      categoryId: form.categoryId,
      sortOrder: form.sortOrder,
      featured: form.featured,
      published: form.published,
    };
    await onSubmit(payload);
  }, [form, isMultiActive, multiImages, onSubmit, onSubmitMany]);

  const captionPreview = useMemo(() => {
    if (!isMultiActive || !form.caption) return null;
    return multiImages
      .slice(0, 3)
      .map((_, i) => `${form.caption}_${i + 1}`)
      .join(", ") + (multiImages.length > 3 ? ", ..." : "");
  }, [isMultiActive, multiImages, form.caption]);

  return (
    <div className={cn("gallery-edit-form", className)}>
      <header className="gallery-edit-form__header">
        <h2 className="gallery-edit-form__title">
          {isNew
            ? isMultiActive
              ? `Batch (${multiImages.length})`
              : "New image"
            : "Edit image"}
        </h2>
        <div className="gallery-edit-form__actions" data-toggle-group>
          <span data-toggle="featured">
            <ToggleSwitch
              checked={form.featured}
              onChange={(v) => updateField("featured", v)}
              label={t(i18n, "form.featured")}
              disabled={featuredDisabled}
              size="sm"
            />
          </span>
          {featuredDisabled ? (
            <span className="gallery-edit-form__note">{t(i18n, "admin.featuredOverLimit")}</span>
          ) : null}
          <span data-toggle="published">
            <ToggleSwitch
              checked={form.published}
              onChange={(v) => updateField("published", v)}
              label={t(i18n, "form.published")}
              size="sm"
            />
          </span>
          {!isNew && onDelete ? (
            <button
              type="button"
              className="gallery-edit-form__btn gallery-edit-form__btn--danger"
              onClick={() => void onDelete()}
            >
              Delete
            </button>
          ) : null}
          {onCancel ? (
            <button
              type="button"
              className="gallery-edit-form__btn"
              onClick={onCancel}
            >
              {t(i18n, "form.cancel")}
            </button>
          ) : null}
          <button
            type="button"
            className="gallery-edit-form__btn gallery-edit-form__btn--primary"
            onClick={() => void handleSubmit()}
            disabled={saving}
          >
            {saving ? "Saving..." : isMultiActive ? `Save ${multiImages.length}` : t(i18n, "form.save")}
          </button>
        </div>
      </header>

      <div className="gallery-edit-form__section">
        <div className="gallery-edit-form__section-title">Image</div>
        <ImageDropZone
          onFiles={handleFiles}
          previewUrl={form.imageUrl || null}
          multiple={isNew && multipleMode}
          i18n={{
            dropPrompt: t(i18n, "form.imageDropPrompt"),
            replacePrompt: t(i18n, "form.imageReplacePrompt"),
          }}
        />
        {imageError ? (
          <div className="gallery-edit-form__error" role="alert">{imageError}</div>
        ) : null}
        {isMultiActive ? (
          <div className="gallery-edit-form__multi-grid">
            {multiImages.map((img, i) => (
              <div key={img.key ?? `mi-${i}`} className="gallery-edit-form__multi-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="gallery-edit-form__multi-img" />
                <button
                  type="button"
                  className="gallery-edit-form__multi-remove"
                  onClick={() => {
                    setMultiImages((prev) => {
                      const next = prev.filter((_, idx) => idx !== i);
                      setForm((f) => {
                        if (next.length > 0) {
                          return { ...f, imageUrl: next[0].url, imageKey: next[0].key ?? "" };
                        }
                        return { ...f, imageUrl: "", imageKey: "" };
                      });
                      return next;
                    });
                  }}
                  aria-label="remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="gallery-edit-form__section">
        <div className="gallery-edit-form__section-title">{t(i18n, "form.caption")}</div>
        <input
          type="text"
          name="caption"
          className="gallery-edit-form__input"
          value={form.caption}
          maxLength={200}
          placeholder={t(i18n, "form.captionPlaceholder")}
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField("caption", e.target.value)}
        />
        {captionPreview ? (
          <div className="gallery-edit-form__hint">Preview: {captionPreview}</div>
        ) : null}
      </div>

      <div className="gallery-edit-form__row">
        <div className="gallery-edit-form__section">
          <div className="gallery-edit-form__section-title">{t(i18n, "form.category")}</div>
          <select
            name="categoryId"
            className="gallery-edit-form__input"
            value={form.categoryId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => updateField("categoryId", e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.labelKo}</option>
            ))}
          </select>
        </div>
        <div className="gallery-edit-form__section">
          <div className="gallery-edit-form__section-title">{t(i18n, "form.sortOrder")}</div>
          <input
            type="number"
            name="sortOrder"
            className="gallery-edit-form__input"
            value={form.sortOrder}
            min={0}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const n = parseInt(e.target.value, 10);
              updateField("sortOrder", Number.isNaN(n) ? 0 : n);
            }}
          />
          {isMultiActive ? (
            <div className="gallery-edit-form__hint">
              {form.sortOrder} ~ {form.sortOrder + multiImages.length - 1}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
