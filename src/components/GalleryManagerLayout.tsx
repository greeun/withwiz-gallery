import { type JSX, type ReactNode } from "react";
import { cn } from "../utils/cn";
import type { GalleryI18nKey, GallerySlotName } from "../types";

export interface GalleryManagerLayoutProps {
  /** 좌측 페인 — 호스트가 렌더하는 갤러리 목록. */
  listRoot: ReactNode;
  /** 좌측 페인 상단 필터/검색 컨트롤 (선택). */
  filterControls?: ReactNode;
  /** 좌측 페인 위의 툴바 — bulk actions 등 (선택). */
  toolbar?: ReactNode;
  /** 중앙 페인 — 편집 폼. null 이면 emptyState 사용. */
  editForm: ReactNode | null;
  /** editForm 이 null 일 때 표시할 컨텐츠 (미주입 시 i18n fallback). */
  emptyState?: ReactNode;
  /** 우측 페인 — 홈 프리뷰 (선택). 미주입 시 우측 영역 자체가 렌더되지 않음. */
  homePreview?: ReactNode;
  className?: string;
  /** i18n key fallback (영문). */
  i18n?: Partial<Record<GalleryI18nKey, string>>;
  /** 호스트 customization 지점. slots 가 같은 키의 ReactNode prop 보다 우선. */
  ui?: {
    classNames?: Partial<Record<GallerySlotName, string>>;
    slots?: Partial<Record<GallerySlotName, ReactNode>>;
  };
}

const DEFAULT_TEXT: Partial<Record<GalleryI18nKey, string>> = {
  "admin.emptyState": "Select an item to edit, or create a new one.",
};

function t(
  i18n: Partial<Record<GalleryI18nKey, string>> | undefined,
  key: GalleryI18nKey,
): string {
  return i18n?.[key] ?? DEFAULT_TEXT[key] ?? key;
}

/** Gallery admin 의 3-페인 레이아웃. AdminManagerBase 의존 없는 self-contained.
 *
 *  - 좌측: toolbar + filterControls + listRoot
 *  - 중앙: editForm (없으면 emptyState / i18n fallback)
 *  - 우측: homePreview (미주입 시 영역 자체 없음 → grid 2-cols)
 *
 *  slot 우선순위:
 *    ui.slots[name] > 같은 의미의 props (toolbar/filterControls/listRoot 등) > fallback
 *  className 병합:
 *    ui.classNames[name] 이 해당 slot wrapper 의 className 에 추가됨.
 */
export function GalleryManagerLayout(props: GalleryManagerLayoutProps): JSX.Element {
  const {
    listRoot,
    filterControls,
    toolbar,
    editForm,
    emptyState,
    homePreview,
    className,
    i18n,
    ui,
  } = props;

  const slots = ui?.slots ?? {};
  const classes = ui?.classNames ?? {};

  const toolbarContent = slots.managerToolbar ?? toolbar;
  const listContent = slots.listRoot ?? listRoot;
  const editContent = slots.editFormRoot ?? editForm;
  const previewContent = slots.homePreviewRoot ?? homePreview;
  const emptyContent =
    slots.emptyState ?? emptyState ?? <span>{t(i18n, "admin.emptyState")}</span>;

  const hasPreview = previewContent !== undefined && previewContent !== null;

  return (
    <div
      className={cn(
        "gallery-manager",
        hasPreview ? "gallery-manager--with-preview" : "gallery-manager--no-preview",
        classes.managerRoot,
        className,
      )}
    >
      <aside className={cn("gallery-manager__list", classes.listRoot)}>
        {toolbarContent ? (
          <div className={cn("gallery-manager__toolbar", classes.managerToolbar)}>
            {toolbarContent}
          </div>
        ) : null}
        {filterControls ? (
          <div className="gallery-manager__filter">{filterControls}</div>
        ) : null}
        <div className="gallery-manager__list-body">{listContent}</div>
      </aside>

      <section className={cn("gallery-manager__form", classes.editFormRoot)}>
        {editContent !== null && editContent !== undefined ? (
          editContent
        ) : (
          <div className={cn("gallery-manager__empty", classes.emptyState)}>{emptyContent}</div>
        )}
      </section>

      {hasPreview ? (
        <aside className={cn("gallery-manager__preview", classes.homePreviewRoot)}>
          {previewContent}
        </aside>
      ) : null}
    </div>
  );
}
