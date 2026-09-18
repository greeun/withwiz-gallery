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
import { clientFetch, failureMessage, jsonOrNull } from "./_shared";
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

/** 목록 응답 본문에서 항목 배열을 꺼낸다.
 *  `createGalleryRoutes` 의 collection.GET 은 `{ success, data: { items, meta } }` 를 반환한다.
 *  호스트가 자체 라우트에서 `data` 를 배열로 반환하거나 본문 자체를 배열로 반환하는 경우도 계속 받는다. */
function extractListItems<T>(json: any): T[] {
  const data = json?.data ?? json;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

/** 목록 응답의 페이지 정보. 배열만 돌려주는 호스트 자체 라우트에서는 없을 수 있다. */
function extractTotalPages(json: any): number | null {
  const meta = json?.data?.meta ?? json?.meta;
  const total = meta?.totalPages;
  return typeof total === "number" && Number.isFinite(total) ? total : null;
}

/** 목록을 여러 페이지에 걸쳐 받을 때의 요청 상한. 서버 기본 페이지 크기 20 기준 2,000건이다. */
const MAX_LIST_PAGES = 100;

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
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 목록 로드. 이 화면은 검색·featured 개수·홈 미리보기를 모두 받은 항목으로 계산하므로
  // 첫 페이지만 받으면 값이 어긋난다. 응답 meta 의 총 페이지 수를 보고 남은 페이지를 이어 받는다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const first = await clientFetch("/api/admin/galleries");
        if (!first.ok) {
          if (!cancelled && mountedRef.current) {
            setError(await failureMessage(first, "Failed to load list"));
          }
          return;
        }
        const firstJson = await jsonOrNull(first);
        const collected = extractListItems<GalleryListItem>(firstJson);
        const totalPages = extractTotalPages(firstJson);

        if (totalPages !== null && totalPages > 1) {
          const lastPage = Math.min(totalPages, MAX_LIST_PAGES);
          for (let page = 2; page <= lastPage; page++) {
            if (cancelled || !mountedRef.current) return;
            const res = await clientFetch(`/api/admin/galleries?page=${page}`);
            if (!res.ok) break;
            collected.push(...extractListItems<GalleryListItem>(await jsonOrNull(res)));
          }
        }

        if (!cancelled && mountedRef.current) {
          setItems(collected);
          setError(null);
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
      setError(null);
      try {
        let res: Response | null = null;
        if (mode === "new") {
          res = await clientFetch("/api/admin/galleries", {
            method: "POST",
            body: JSON.stringify(data),
          });
        } else if (selectedId) {
          res = await clientFetch(`/api/admin/galleries/${selectedId}`, {
            method: "PUT",
            body: JSON.stringify(data),
          });
        }
        // 실패하면 편집 폼을 그대로 두어 입력을 잃지 않게 한다.
        if (res && !res.ok) {
          if (mountedRef.current) setError(await failureMessage(res, "Save failed"));
          return;
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
      // 서버도 같은 검사를 하지만, 요청 전에 막아야 올린 이미지 정보를 잃지 않는다.
      const adding = batch.filter((it) => it.featured === true && it.published === true).length;
      if (adding > 0 && featuredCount + adding > maxFeatured) {
        setError(t(i18n, "admin.featuredOverLimit"));
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const res = await clientFetch("/api/admin/galleries/bulk", {
          method: "POST",
          body: JSON.stringify({ items: batch }),
        });
        if (!res.ok) {
          if (mountedRef.current) setError(await failureMessage(res, "Save failed"));
          return;
        }
        if (mountedRef.current) {
          refresh();
          setMode("list");
        }
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    },
    [featuredCount, maxFeatured, i18n, refresh],
  );

  const handleDelete = useCallback(async () => {
    if (!selectedId) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this item?")) return;
    setError(null);
    const res = await clientFetch(`/api/admin/galleries/${selectedId}`, { method: "DELETE" });
    if (!res.ok) {
      if (mountedRef.current) setError(await failureMessage(res, "Delete failed"));
      return;
    }
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
      setError(null);
      const res = await clientFetch(`/api/admin/galleries/${id}`, {
        method: "PUT",
        body: JSON.stringify({ featured: next }),
      });
      if (!res.ok) {
        if (mountedRef.current) setError(await failureMessage(res, "Save failed"));
        return;
      }
      if (mountedRef.current) refresh();
    },
    [featuredCount, maxFeatured, i18n, refresh],
  );

  const handleReorder = useCallback(
    async (orderedIds: string[]) => {
      setError(null);
      const results = await Promise.all(
        orderedIds.map((id, index) =>
          clientFetch(`/api/admin/galleries/${id}`, {
            method: "PUT",
            body: JSON.stringify({ sortOrder: index + 1 }),
          }),
        ),
      );
      // 일부만 성공했을 수 있으므로, 실패를 알리고 목록을 다시 읽어 서버의 실제 순서를 보여 준다.
      const failed = results.find((res) => !res.ok);
      if (failed && mountedRef.current) {
        setError(await failureMessage(failed, "Reorder failed"));
      }
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
    <>
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
      {error ? (
        <div className="gallery-manager__error" role="alert">{error}</div>
      ) : null}
    </>
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
