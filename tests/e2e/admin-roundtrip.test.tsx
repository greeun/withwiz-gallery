/**
 * TC-E-001: 관리자 화면 ↔ 실제 라우트 핸들러 왕복 여정.
 *
 * 화면 조작 → fetch → `createGalleryRoutes` 핸들러 → 서비스 → 메모리 기반 Prisma 가짜 객체 → 재조회 → 화면 반영까지
 * 한 흐름으로 확인한다. 실제 브라우저·DB 를 쓰는 E2E 는 호스트 책임이므로 jsdom 범위로 제한한다.
 */
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoryAdminManager } from "../../src/components/CategoryAdminManager";
import { GalleryAdminManager } from "../../src/components/GalleryAdminManager";
import { resetGalleryConfig, setGalleryConfig } from "../../src/config";
import type { GalleryConfig } from "../../src/types";
import { createInMemoryPrisma } from "../helpers/in-memory-prisma";
import { createRouteFetch, makeTestApiWrapper } from "../helpers/route-fetch";

// 스키마가 categoryId 에 cuid 형식을 요구하므로 저장 요청이 검증을 통과하는 id 를 사용한다.
const CATEGORY_ID = "cperformance0001";

function setup() {
  const db = createInMemoryPrisma({
    categories: [{ id: CATEGORY_ID, slug: "PERFORMANCE", labelKo: "공연" }],
    galleries: [
      { id: "g1", categoryId: CATEGORY_ID, caption: "A", sortOrder: 1, featured: true, published: true },
      { id: "g2", categoryId: CATEGORY_ID, caption: "B", sortOrder: 2, featured: true, published: true },
      { id: "g3", categoryId: CATEGORY_ID, caption: "C", sortOrder: 3, featured: false, published: false },
    ],
  });
  const config: GalleryConfig = {
    prisma: db.prisma,
    apiWrapper: makeTestApiWrapper(),
    authorIdFromContext: (ctx) => ctx.user?.id ?? "",
    limits: { maxFeatured: 7, mosaicCount: 7, batchMax: 20, captionMaxLength: 200 },
  };
  setGalleryConfig(config);
  const routeFetch = createRouteFetch(config);
  vi.stubGlobal("fetch", routeFetch.fetch);
  return { db, ...routeFetch };
}

function row(db: ReturnType<typeof setup>["db"], id: string) {
  const found = db.galleries.find((g) => g.id === id);
  if (!found) throw new Error(`gallery ${id} not found`);
  return found;
}

function previewTiles(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll(".gallery-home-preview__tile:not(.gallery-home-preview__tile--empty)"),
  ) as HTMLElement[];
}

function listItemByCaption(container: HTMLElement, caption: string): HTMLElement {
  const items = Array.from(container.querySelectorAll(".gallery-list-item")) as HTMLElement[];
  const found = items.find((li) => li.querySelector(".gallery-list-item__caption")?.textContent === caption);
  if (!found) throw new Error(`list item "${caption}" not found`);
  return found;
}

const dataTransfer = { effectAllowed: "", dropEffect: "", setData: () => {}, getData: () => "" };

describe("TC-E-001 관리자 화면 ↔ 실제 라우트 핸들러 왕복 여정", () => {
  afterEach(() => {
    resetGalleryConfig();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("마운트하면 목록 3개와 홈 프리뷰 타일 2개를 표시한다", async () => {
    setup();
    const { container } = render(<GalleryAdminManager />);

    await waitFor(() => {
      expect(container.querySelectorAll(".gallery-list-item")).toHaveLength(3);
    });
    const tiles = previewTiles(container);
    expect(tiles).toHaveLength(2);
    expect(tiles.map((t) => t.querySelector("img")?.getAttribute("alt"))).toEqual(["A", "B"]);
  });

  it("목록 항목을 선택해 caption 을 바꾸고 저장하면 재조회된 목록에 반영된다", async () => {
    const env = setup();
    const { container } = render(<GalleryAdminManager />);
    await waitFor(() => {
      expect(container.querySelectorAll(".gallery-list-item")).toHaveLength(3);
    });

    fireEvent.click(listItemByCaption(container, "C"));
    const captionInput = await waitFor(() => {
      const input = container.querySelector('input[name="caption"]') as HTMLInputElement | null;
      expect(input?.value).toBe("C");
      return input!;
    });
    fireEvent.change(captionInput, { target: { value: "C 수정" } });
    fireEvent.click(container.querySelector(".gallery-edit-form__btn--primary") as HTMLButtonElement);

    await waitFor(() => {
      expect(listItemByCaption(container, "C 수정")).toBeTruthy();
    });
    const put = env.calls.find((c) => c.method === "PUT" && c.path === "/api/admin/galleries/g3");
    expect(put?.status).toBe(200);
    expect(row(env.db, "g3")).toMatchObject({ caption: "C 수정", featured: false, published: false });
  });

  it("홈 프리뷰 타일 0 과 1 을 재정렬하면 sortOrder 가 새 순서로 갱신되고 published·featured 는 유지된다", async () => {
    const env = setup();
    const { container } = render(<GalleryAdminManager />);
    await waitFor(() => expect(previewTiles(container)).toHaveLength(2));

    const [first, second] = previewTiles(container);
    fireEvent.dragStart(first, { dataTransfer });
    fireEvent.dragOver(second, { dataTransfer });
    fireEvent.drop(second, { dataTransfer });
    fireEvent.dragEnd(first, { dataTransfer });

    await waitFor(() => {
      expect(previewTiles(container).map((t) => t.querySelector("img")?.getAttribute("alt"))).toEqual(["B", "A"]);
    });
    expect(row(env.db, "g2")).toMatchObject({ sortOrder: 1, featured: true, published: true });
    expect(row(env.db, "g1")).toMatchObject({ sortOrder: 2, featured: true, published: true });
    const puts = env.calls.filter((c) => c.method === "PUT");
    expect(puts.map((c) => c.status)).toEqual([200, 200]);
  });

  it("홈 프리뷰 별 버튼으로 featured 를 해제하면 published 는 유지되고 프리뷰에서 빠진다", async () => {
    const env = setup();
    const { container } = render(<GalleryAdminManager />);
    await waitFor(() => expect(previewTiles(container)).toHaveLength(2));

    const [first] = previewTiles(container);
    fireEvent.click(within(first).getByRole("button", { name: "unfeature" }));

    await waitFor(() => expect(previewTiles(container)).toHaveLength(1));
    expect(row(env.db, "g1")).toMatchObject({ featured: false, published: true, sortOrder: 1 });
    expect(container.querySelectorAll(".gallery-list-item")).toHaveLength(3);
  });

  it("CategoryAdminManager 에서 사용 중인 카테고리를 삭제하면 409 와 사용 중 안내가 표시된다", async () => {
    const env = setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container, findByRole } = render(<CategoryAdminManager />);
    await waitFor(() => {
      expect(container.querySelectorAll(".gallery-category-admin__item")).toHaveLength(1);
    });

    fireEvent.click(container.querySelector(".gallery-category-admin__delete") as HTMLButtonElement);

    const alert = await findByRole("alert");
    expect(alert.textContent).toBe("This category has galleries — remove or move them first");
    expect(env.calls.find((c) => c.method === "DELETE")?.status).toBe(409);
    expect(env.db.categories).toHaveLength(1);
  });
});
