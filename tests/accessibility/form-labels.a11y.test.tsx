/**
 * TC-AC-006: 폼 컨트롤 접근 가능한 이름·키보드 도달성.
 * 기준: WCAG 2.1 SC 1.3.1 (Info and Relationships), 4.1.2 (Name, Role, Value), 2.1.1 (Keyboard)
 */
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryAdminManager } from "../../src/components/CategoryAdminManager";
import { GalleryAdminManager } from "../../src/components/GalleryAdminManager";
import { GalleryEditForm } from "../../src/components/GalleryEditForm";
import { resetGalleryConfig, setGalleryConfig } from "../../src/config";
import type { GalleryCategoryItem, GalleryConfig, GalleryListItem } from "../../src/types";

const categories: GalleryCategoryItem[] = [
  {
    id: "cat-1",
    slug: "PERFORMANCE",
    labelKo: "공연",
    labelEn: "Performance",
    sortOrder: 0,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  },
];

function makeItem(id: string): GalleryListItem {
  return {
    id,
    imageUrl: `https://cdn.test/${id}.jpg`,
    imageKey: null,
    caption: `cap-${id}`,
    categoryId: "cat-1",
    sortOrder: 0,
    featured: false,
    published: true,
    authorId: "user-1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

function setupConfig(overrides: Partial<GalleryConfig> = {}) {
  setGalleryConfig({
    prisma: {} as any,
    apiWrapper: ((handler: any) => handler) as any,
    limits: { maxFeatured: 7, mosaicCount: 7, batchMax: 20, captionMaxLength: 200 },
    ...overrides,
  });
}

function stubFetch(items: GalleryListItem[] = []) {
  vi.stubGlobal("fetch", (async (input: any) => {
    const url = typeof input === "string" ? input : input.url;
    const data = url.includes("/api/admin/gallery-categories") ? categories : items;
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch);
}

/** 이름을 가져야 하는 역할의 컨트롤이 모두 비어 있지 않은 접근 가능한 이름을 갖는지 확인한다. */
function expectAllControlsNamed(container: HTMLElement) {
  const view = within(container);
  for (const role of ["textbox", "searchbox", "combobox", "spinbutton", "switch"] as const) {
    const all = view.queryAllByRole(role);
    const named = view.queryAllByRole(role, { name: /\S/ });
    expect(named, `role=${role}`).toHaveLength(all.length);
  }
}

describe("TC-AC-006 폼 컨트롤 접근 가능한 이름·키보드 도달성", () => {
  beforeEach(() => {
    setupConfig();
  });
  afterEach(() => {
    resetGalleryConfig();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("CategoryAdminManager 의 입력 필드를 label 텍스트로 찾을 수 있다", async () => {
    stubFetch();
    const { container, getByLabelText } = render(<CategoryAdminManager />);
    await waitFor(() => expect(container.querySelector(".gallery-category-admin__form")).toBeTruthy());

    expect(getByLabelText("Slug (uppercase)")).toBe(container.querySelector('input[name="slug"]'));
    expect(getByLabelText("Label (Ko)")).toBe(container.querySelector('input[name="labelKo"]'));
    expect(getByLabelText("Label (En)")).toBe(container.querySelector('input[name="labelEn"]'));
    expect(getByLabelText("Sort order")).toBe(container.querySelector('input[name="sortOrder"]'));
    expectAllControlsNamed(container);
  });

  it("CategoryAdminManager 는 host i18n 으로 바꾼 label 텍스트로도 찾을 수 있다", async () => {
    setupConfig({ i18n: { "category.slug": "식별자", "category.labelKo": "한글 라벨" } });
    stubFetch();
    const { container, getByLabelText } = render(<CategoryAdminManager />);
    await waitFor(() => expect(container.querySelector(".gallery-category-admin__form")).toBeTruthy());

    expect(getByLabelText("식별자")).toBe(container.querySelector('input[name="slug"]'));
    expect(getByLabelText("한글 라벨")).toBe(container.querySelector('input[name="labelKo"]'));
  });

  it("GalleryEditForm 의 Caption·Category·Sort order 컨트롤을 label 텍스트로 찾을 수 있다", () => {
    const { container, getByLabelText } = render(
      <GalleryEditForm value={makeItem("a")} categories={categories} onSubmit={() => {}} />,
    );

    expect(getByLabelText("Caption")).toBe(container.querySelector('input[name="caption"]'));
    expect(getByLabelText("Category")).toBe(container.querySelector('select[name="categoryId"]'));
    expect(getByLabelText("Sort order")).toBe(container.querySelector('input[name="sortOrder"]'));
    expectAllControlsNamed(container);
  });

  it("같은 컴포넌트를 여러 번 렌더링해도 id 가 겹치지 않고 각 label 이 자기 컨트롤을 가리킨다", async () => {
    stubFetch();
    const { container } = render(
      <div>
        <section data-testid="form-1">
          <GalleryEditForm value={makeItem("a")} categories={categories} onSubmit={() => {}} />
        </section>
        <section data-testid="form-2">
          <GalleryEditForm value={makeItem("b")} categories={categories} onSubmit={() => {}} />
        </section>
        <section data-testid="cat-1">
          <CategoryAdminManager />
        </section>
        <section data-testid="cat-2">
          <CategoryAdminManager />
        </section>
      </div>,
    );
    await waitFor(() => expect(container.querySelectorAll(".gallery-category-admin__form")).toHaveLength(2));

    const ids = Array.from(container.querySelectorAll("[id]")).map((el) => el.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);

    for (const testId of ["form-1", "form-2"]) {
      const section = container.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
      expect(within(section).getByLabelText("Caption")).toBe(section.querySelector('input[name="caption"]'));
    }
    for (const testId of ["cat-1", "cat-2"]) {
      const section = container.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
      expect(within(section).getByLabelText("Slug (uppercase)")).toBe(section.querySelector('input[name="slug"]'));
    }
  });

  it("GalleryAdminManager 의 검색 입력을 searchbox 역할과 이름으로 찾을 수 있다", async () => {
    stubFetch([makeItem("a")]);
    const { container, getByRole } = render(<GalleryAdminManager />);
    await waitFor(() => expect(container.querySelectorAll(".gallery-list-item")).toHaveLength(1));

    expect(getByRole("searchbox", { name: /search/i })).toBe(container.querySelector(".gallery-manager__search"));
    expectAllControlsNamed(container);
  });

  it("GalleryAdminManager 목록 항목은 키보드로 도달할 수 있는 버튼이며 누르면 항목을 선택한다", async () => {
    stubFetch([makeItem("a"), makeItem("b")]);
    const { container } = render(<GalleryAdminManager />);
    await waitFor(() => expect(container.querySelectorAll(".gallery-list-item")).toHaveLength(2));

    const listItem = container.querySelectorAll(".gallery-list-item")[1] as HTMLElement;
    const button = within(listItem).getByRole("button", { name: /cap-b/ });
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.hasAttribute("disabled")).toBe(false);
    expect(button.tabIndex).toBe(0);
    button.focus();
    expect(document.activeElement).toBe(button);

    // 네이티브 button 은 브라우저가 Enter·Space 를 click 으로 바꾼다. jsdom 은 이 동작을 구현하지 않으므로 click 으로 확인한다.
    fireEvent.click(button);
    await waitFor(() => {
      expect((container.querySelector('input[name="caption"]') as HTMLInputElement | null)?.value).toBe("cap-b");
    });
    expect(listItem.className).toMatch(/gallery-list-item--active/);
  });
});
