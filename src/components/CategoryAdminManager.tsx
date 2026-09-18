import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type JSX,
} from "react";
import { cn } from "../utils/cn";
import { getGalleryConfig } from "../config";
import { ToggleSwitch } from "./ToggleSwitch";
import type { GalleryCategoryItem, GalleryI18nKey } from "../types";
import { clientFetch, errorMessageOf, jsonOrNull } from "./_shared";

export interface CategoryAdminManagerProps {
  className?: string;
}

const DEFAULT_TEXT: Partial<Record<GalleryI18nKey, string>> = {
  "category.title": "Gallery categories",
  "category.newButton": "+ New category",
  "category.slug": "Slug (uppercase)",
  "category.labelKo": "Label (Ko)",
  "category.labelEn": "Label (En)",
  "category.deleteConfirmInUse": "This category has galleries — remove or move them first",
};

function t(
  i18n: Partial<Record<GalleryI18nKey, string>> | undefined,
  key: GalleryI18nKey,
): string {
  return i18n?.[key] ?? DEFAULT_TEXT[key] ?? key;
}

interface FormState {
  id: string | null;
  slug: string;
  labelKo: string;
  labelEn: string;
  sortOrder: number;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  id: null,
  slug: "",
  labelKo: "",
  labelEn: "",
  sortOrder: 0,
  isActive: true,
};

/** 카테고리 어드민 UI. 사용 중인 카테고리는 server 가 409 로 반환 → 안내 표시. */
export function CategoryAdminManager(props: CategoryAdminManagerProps): JSX.Element {
  const { className } = props;
  const config = getGalleryConfig();
  const i18n = (config.i18n ?? {}) as Partial<Record<GalleryI18nKey, string>>;

  const [items, setItems] = useState<GalleryCategoryItem[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(true);
  // 같은 화면에 여러 번 마운트되어도 label ↔ input 연결 id 가 겹치지 않도록 useId 로 만든다.
  const fieldIdBase = useId();
  const fieldIds = {
    slug: `${fieldIdBase}-slug`,
    labelKo: `${fieldIdBase}-labelKo`,
    labelEn: `${fieldIdBase}-labelEn`,
    sortOrder: `${fieldIdBase}-sortOrder`,
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await clientFetch("/api/admin/gallery-categories");
        const json = await jsonOrNull(res);
        if (!cancelled && mountedRef.current) {
          const data = json?.data ?? json ?? [];
          setItems(Array.isArray(data) ? data : []);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleEdit = useCallback((cat: GalleryCategoryItem) => {
    setError(null);
    setForm({
      id: cat.id,
      slug: cat.slug,
      labelKo: cat.labelKo,
      labelEn: cat.labelEn ?? "",
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    });
  }, []);

  const handleNew = useCallback(() => {
    setError(null);
    setForm(EMPTY_FORM);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const body = JSON.stringify({
        slug: form.slug,
        labelKo: form.labelKo,
        labelEn: form.labelEn || undefined,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      });
      const url = form.id
        ? `/api/admin/gallery-categories/${form.id}`
        : "/api/admin/gallery-categories";
      const method = form.id ? "PUT" : "POST";
      const res = await clientFetch(url, { method, body });
      if (!res.ok) {
        const json = await jsonOrNull(res);
        setError(errorMessageOf(json) ?? `Save failed (${res.status})`);
        return;
      }
      if (mountedRef.current) {
        setForm(EMPTY_FORM);
        refresh();
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [form, refresh]);

  const handleDelete = useCallback(
    async (cat: GalleryCategoryItem) => {
      if (typeof window !== "undefined" && !window.confirm(`Delete "${cat.labelKo}"?`)) return;
      setError(null);
      const res = await clientFetch(`/api/admin/gallery-categories/${cat.id}`, {
        method: "DELETE",
      });
      if (res.status === 409) {
        setError(t(i18n, "category.deleteConfirmInUse"));
        return;
      }
      if (!res.ok) {
        const json = await jsonOrNull(res);
        setError(errorMessageOf(json) ?? `Delete failed (${res.status})`);
        return;
      }
      if (mountedRef.current) refresh();
    },
    [i18n, refresh],
  );

  return (
    <div className={cn("gallery-category-admin", className)}>
      <header className="gallery-category-admin__header">
        <h2 className="gallery-category-admin__title">{t(i18n, "category.title")}</h2>
        <button
          type="button"
          className="gallery-category-admin__new"
          onClick={handleNew}
        >
          {t(i18n, "category.newButton")}
        </button>
      </header>

      {error ? (
        <div className="gallery-category-admin__error" role="alert">{error}</div>
      ) : null}

      <ul className="gallery-category-admin__list">
        {items.map((c) => (
          <li key={c.id} className="gallery-category-admin__item">
            <button
              type="button"
              className="gallery-category-admin__item-row"
              onClick={() => handleEdit(c)}
            >
              <span className="gallery-category-admin__slug">{c.slug}</span>
              <span className="gallery-category-admin__label">{c.labelKo}</span>
              <span className="gallery-category-admin__order">#{c.sortOrder}</span>
              <span className="gallery-category-admin__active">
                {c.isActive ? "✓" : "✗"}
              </span>
            </button>
            <button
              type="button"
              className="gallery-category-admin__delete"
              onClick={() => void handleDelete(c)}
              aria-label="delete"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <div className="gallery-category-admin__form">
        <div className="gallery-category-admin__form-title">
          {form.id ? "Edit category" : "New category"}
        </div>
        <div className="gallery-category-admin__field">
          <label className="gallery-category-admin__field-label" htmlFor={fieldIds.slug}>{t(i18n, "category.slug")}</label>
          <input
            id={fieldIds.slug}
            name="slug"
            className="gallery-category-admin__input"
            value={form.slug}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, slug: e.target.value.toUpperCase() }))}
            placeholder="UPPER_SNAKE"
          />
        </div>
        <div className="gallery-category-admin__field">
          <label className="gallery-category-admin__field-label" htmlFor={fieldIds.labelKo}>{t(i18n, "category.labelKo")}</label>
          <input
            id={fieldIds.labelKo}
            name="labelKo"
            className="gallery-category-admin__input"
            value={form.labelKo}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, labelKo: e.target.value }))}
          />
        </div>
        <div className="gallery-category-admin__field">
          <label className="gallery-category-admin__field-label" htmlFor={fieldIds.labelEn}>{t(i18n, "category.labelEn")}</label>
          <input
            id={fieldIds.labelEn}
            name="labelEn"
            className="gallery-category-admin__input"
            value={form.labelEn}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, labelEn: e.target.value }))}
          />
        </div>
        <div className="gallery-category-admin__field gallery-category-admin__field--row">
          <label className="gallery-category-admin__field-label" htmlFor={fieldIds.sortOrder}>Sort order</label>
          <input
            id={fieldIds.sortOrder}
            type="number"
            name="sortOrder"
            className="gallery-category-admin__input"
            value={form.sortOrder}
            min={0}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const n = parseInt(e.target.value, 10);
              setForm((f) => ({ ...f, sortOrder: Number.isNaN(n) ? 0 : n }));
            }}
          />
          <ToggleSwitch
            checked={form.isActive}
            onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            label="Active"
            size="sm"
          />
        </div>
        <div className="gallery-category-admin__form-actions">
          {form.id ? (
            <button
              type="button"
              className="gallery-category-admin__cancel"
              onClick={() => setForm(EMPTY_FORM)}
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            className="gallery-category-admin__save"
            onClick={() => void handleSave()}
            disabled={saving || !form.slug || !form.labelKo}
          >
            {saving ? "Saving..." : form.id ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
