import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import { cn } from "../utils/cn";
import { getGalleryConfig } from "../config";
import { GalleryManagerLayout } from "./GalleryManagerLayout";
import { GalleryEditForm, type GalleryEditFormProps } from "./GalleryEditForm";
import { GalleryHomePreview } from "./GalleryHomePreview";
import type {
  CreateGalleryInput,
  GalleryCategoryItem,
  GalleryI18nKey,
  GalleryListItem,
  UpdateGalleryInput,
} from "../types";

export interface GalleryAdminManagerProps {
  /** 초기 mode (라우트에서 결정). undefined = list view. */
  initialMode?: "list" | "new" | "edit";
  /** 편집 대상 ID (initialMode === "edit" 또는 URL 진입 시). */
  initialSelectedId?: string;
  /** 이미지 파일을 host 가 업로드하고 결과 URL·key 를 반환하는 함수. `GalleryEditForm` 에 그대로 전달한다.
   *  미전달 시 새 이미지를 선택할 수 없고 편집 폼이 업로드 함수 누락 오류를 표시한다. */
  onImageSelect?: GalleryEditFormProps["onImageSelect"];
  className?: string;
}

// host 가 더 정교한 인증 fetcher 가 필요하면 v0.2 에 config.clientFetch 추가 검토.
async function clientFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json", ...(init?.headers as any) } : init?.headers,
    ...init,
  });
}

async function jsonOrNull(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** 목록 응답 본문에서 항목 배열을 꺼낸다.
 *  `createGalleryRoutes` 의 collection.GET 은 `{ success, data: { items, meta } }` 를 반환한다.
 *  호스트가 자체 라우트에서 `data` 를 배열로 반환하거나 본문 자체를 배열로 반환하는 경우도 계속 받는다. */
function extractListItems<T>(json: any): T[] {
  const data = json?.data ?? json;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

const DEFAULT_TEXT: Partial<Record<GalleryI18nKey, string>> = {
  "admin.title": "Gallery",
  "admin.newButton": "+ New",
  "admin.searchPlaceholder": "Search...",
  "admin.emptyState": "Select an item to edit",
};

function t(
  i18n: Partial<Record<GalleryI18nKey, string>> | undefined,
  key: GalleryI18nKey,
): string {
  return i18n?.[key] ?? DEFAULT_TEXT[key] ?? key;
}

/** 메인 마운트 포인트. host 의 페이지는 단순히 `<GalleryAdminManager initialSelectedId={id} />` 마운트. */
export function GalleryAdminManager(props: GalleryAdminManagerProps): JSX.Element {
  const { initialMode, initialSelectedId, onImageSelect, className } = props;
  const config = getGalleryConfig();
  const i18n = (config.i18n ?? {}) as Partial<Record<GalleryI18nKey, string>>;
  const ui = config.ui;
  const maxFeatured = config.limits.maxFeatured;
  const mosaicCount = config.limits.mosaicCount;

  const [items, setItems] = useState<GalleryListItem[]>([]);
  const [categories, setCategories] = useState<GalleryCategoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [mode, setMode] = useState<"list" | "new" | "edit">(
    initialMode ?? (initialSelectedId ? "edit" : "list"),
  );
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 목록 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await clientFetch("/api/admin/galleries");
        const json = await jsonOrNull(res);
        if (!cancelled && mountedRef.current) {
          setItems(extractListItems<GalleryListItem>(json));
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // 카테고리 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await clientFetch("/api/admin/gallery-categories");
        const json = await jsonOrNull(res);
        if (!cancelled && mountedRef.current) {
          const data = json?.data ?? json ?? [];
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return items.find((i) => i.id === selectedId) ?? null;
  }, [selectedId, items]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((g) => (g.caption ?? "").toLowerCase().includes(q));
  }, [items, search]);

  const featuredCount = useMemo(
    () => items.filter((i) => i.featured && i.published).length,
    [items],
  );
  const previewItems = useMemo(
    () =>
      items
        .filter((i) => i.featured && i.published)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [items],
  );

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMode("edit");
  }, []);

  const handleNewClick = useCallback(() => {
    setSelectedId(null);
    setMode("new");
  }, []);

  const handleCancel = useCallback(() => {
    setSelectedId(null);
    setMode("list");
  }, []);

  const handleSubmit = useCallback(
    async (data: CreateGalleryInput | UpdateGalleryInput) => {
      setSaving(true);
      try {
        if (mode === "new") {
          await clientFetch("/api/admin/galleries", {
            method: "POST",
            body: JSON.stringify(data),
          });
        } else if (selectedId) {
          await clientFetch(`/api/admin/galleries/${selectedId}`, {
            method: "PUT",
            body: JSON.stringify(data),
          });
        }
        if (mountedRef.current) {
          refresh();
          setMode("list");
          setSelectedId(null);
        }
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    },
    [mode, selectedId, refresh],
  );

  const handleSubmitMany = useCallback(
    async (batch: CreateGalleryInput[]) => {
      setSaving(true);
      try {
        await clientFetch("/api/admin/galleries/bulk", {
          method: "POST",
          body: JSON.stringify({ items: batch }),
        });
        if (mountedRef.current) {
          refresh();
          setMode("list");
        }
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    },
    [refresh],
  );

  const handleDelete = useCallback(async () => {
    if (!selectedId) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this item?")) return;
    await clientFetch(`/api/admin/galleries/${selectedId}`, { method: "DELETE" });
    if (mountedRef.current) {
      setSelectedId(null);
      setMode("list");
      refresh();
    }
  }, [selectedId, refresh]);

  const handleToggleFeatured = useCallback(
    async (id: string, next: boolean) => {
      if (next && featuredCount >= maxFeatured) {
        if (typeof window !== "undefined") {
          window.alert(t(i18n, "admin.featuredOverLimit"));
        }
        return;
      }
      await clientFetch(`/api/admin/galleries/${id}`, {
        method: "PUT",
        body: JSON.stringify({ featured: next }),
      });
      if (mountedRef.current) refresh();
    },
    [featuredCount, maxFeatured, i18n, refresh],
  );

  const handleReorder = useCallback(
    async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, index) =>
          clientFetch(`/api/admin/galleries/${id}`, {
            method: "PUT",
            body: JSON.stringify({ sortOrder: index + 1 }),
          }),
        ),
      );
      if (mountedRef.current) refresh();
    },
    [refresh],
  );

  const isMultipleMode = mode === "new";
  const editForm =
    mode === "list"
      ? null
      : (
          <GalleryEditForm
            key={mode === "new" ? "new" : selectedId ?? "edit"}
            value={mode === "edit" ? selectedItem : null}
            categories={categories}
            saving={saving}
            multipleMode={isMultipleMode}
            canToggleFeatured={featuredCount < maxFeatured || (selectedItem?.featured ?? false)}
            i18n={i18n}
            onSubmit={handleSubmit}
            onSubmitMany={handleSubmitMany}
            onCancel={handleCancel}
            onDelete={mode === "edit" ? handleDelete : undefined}
            onImageSelect={onImageSelect}
          />
        );

  const filterControls = (
    <div className="gallery-manager__filter-controls">
      <input
        type="search"
        className="gallery-manager__search"
        aria-label={t(i18n, "admin.searchPlaceholder")}
        placeholder={t(i18n, "admin.searchPlaceholder")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <span className="gallery-manager__count">{filteredItems.length}</span>
    </div>
  );

  const toolbar = (
    <div className="gallery-manager__toolbar-row">
      <h1 className="gallery-manager__title">{t(i18n, "admin.title")}</h1>
      <button
        type="button"
        className="gallery-manager__new-btn"
        onClick={handleNewClick}
      >
        {t(i18n, "admin.newButton")}
      </button>
    </div>
  );

  const listRoot = (
    <ul className="gallery-manager__list-ul">
      {filteredItems.map((item) => (
        <li
          key={item.id}
          className={cn("gallery-list-item", selectedId === item.id && "gallery-list-item--active")}
          onClick={() => handleSelect(item.id)}
        >
          {/* 키보드 접근용 네이티브 button. Enter·Space 로 발생한 click 이 li 의 onClick 으로 전파되어 항목을 선택한다. */}
          <button type="button" className="gallery-list-item__select">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt="" className="gallery-list-item__thumb" />
            <span className="gallery-list-item__body">
              <span className="gallery-list-item__caption">
                {item.caption || "(no caption)"}
              </span>
              <span className="gallery-list-item__meta">
                {item.featured ? "★ " : ""}
                {item.published ? "공개" : "비공개"} · 순서 {item.sortOrder}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  const homePreview = (
    <GalleryHomePreview
      items={previewItems}
      maxCount={mosaicCount}
      onReorder={handleReorder}
      onToggleFeatured={handleToggleFeatured}
      i18n={i18n}
    />
  );

  return (
    <GalleryManagerLayout
      className={className}
      listRoot={listRoot}
      filterControls={filterControls}
      toolbar={toolbar}
      editForm={editForm}
      homePreview={homePreview}
      i18n={i18n}
      ui={ui}
    />
  );
}
