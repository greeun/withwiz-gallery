/**
 * TC-I-005: 관리자 컴포넌트 ↔ 라우트 핸들러 응답 형식 계약.
 *
 * fetch 를 `createGalleryRoutes(config)` 의 실제 핸들러에 연결하고, Prisma 는 메모리 기반 가짜 객체를 사용한다.
 * 모의 응답을 손으로 만들지 않으므로, 라우트 응답 형식이 바뀌면 이 테스트가 먼저 깨진다.
 */
import { fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoryAdminManager } from "../../src/components/CategoryAdminManager";
import { GalleryAdminManager } from "../../src/components/GalleryAdminManager";
import { resetGalleryConfig, setGalleryConfig } from "../../src/config";
import type { GalleryConfig } from "../../src/types";
import { createInMemoryPrisma, type CategorySeed, type GallerySeed } from "../helpers/in-memory-prisma";
import { createRouteFetch, makeTestApiWrapper } from "../helpers/route-fetch";

// 스키마가 categoryId 에 cuid 형식을 요구하므로 검증을 통과하는 id 를 사용한다.
const CATEGORY_ID = "cperformance0001";
const IN_USE_TEXT = "This category has galleries — remove or move them first";

function mount(opts: {
  categories?: CategorySeed[];
  galleries?: GallerySeed[];
  config?: Partial<GalleryConfig>;
  authenticated?: () => boolean;
}) {
  const db = createInMemoryPrisma({ categories: opts.categories, galleries: opts.galleries });
  const authenticated = opts.authenticated ?? (() => true);
  const config: GalleryConfig = {
    prisma: db.prisma,
    apiWrapper: makeTestApiWrapper(() => (authenticated() ? { id: "user-1" } : null)),
    authorIdFromContext: (ctx) => ctx.user?.id ?? "",
    limits: { maxFeatured: 7, mosaicCount: 7, batchMax: 20, captionMaxLength: 200 },
    ...opts.config,
  };
  setGalleryConfig(config);
  const routeFetch = createRouteFetch(config);
  vi.stubGlobal("fetch", routeFetch.fetch);
  return { db, ...routeFetch };
}

describe("TC-I-005 관리자 컴포넌트 ↔ 라우트 핸들러 응답 형식 계약", () => {
  afterEach(() => {
    resetGalleryConfig();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("GalleryAdminManager 가 collection.GET 의 data.items 형식 목록을 표시한다", async () => {
    mount({
      categories: [{ id: CATEGORY_ID, slug: "PERFORMANCE" }],
      galleries: [{ id: "g1", categoryId: CATEGORY_ID, caption: "첫 공연", published: true }],
    });
    const { container, getByText } = render(<GalleryAdminManager />);

    await waitFor(() => {
      expect(container.querySelectorAll(".gallery-list-item")).toHaveLength(1);
    });
    expect(container.querySelector(".gallery-manager__count")?.textContent).toBe("1");
    expect(getByText("첫 공연")).toBeTruthy();
  });

  it("collection.GET 응답 본문은 data 가 items·meta 객체인 형식을 유지한다", async () => {
    const env = mount({
      categories: [{ id: CATEGORY_ID, slug: "PERFORMANCE" }],
      galleries: [{ id: "g1", categoryId: CATEGORY_ID }],
    });
    render(<GalleryAdminManager />);
    await waitFor(() => {
      expect(env.calls.some((c) => c.method === "GET" && c.path === "/api/admin/galleries")).toBe(true);
    });
    const listCall = env.calls.find((c) => c.method === "GET" && c.path === "/api/admin/galleries");
    expect(listCall?.status).toBe(200);
    expect(listCall?.body).toMatchObject({
      success: true,
      data: { items: [expect.objectContaining({ id: "g1" })], meta: expect.objectContaining({ total: 1 }) },
    });
  });

  it("CategoryAdminManager 가 409 CategoryInUse 응답에 사용 중 안내를 표시한다", async () => {
    const env = mount({
      categories: [{ id: CATEGORY_ID, slug: "PERFORMANCE" }],
      galleries: [{ id: "g1", categoryId: CATEGORY_ID }],
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container, findByRole } = render(<CategoryAdminManager />);
    await waitFor(() => {
      expect(container.querySelectorAll(".gallery-category-admin__item")).toHaveLength(1);
    });

    fireEvent.click(container.querySelector(".gallery-category-admin__delete") as HTMLButtonElement);

    const alert = await findByRole("alert");
    expect(alert.textContent).toBe(IN_USE_TEXT);
    const deleteCall = env.calls.find((c) => c.method === "DELETE");
    expect(deleteCall?.status).toBe(409);
    expect(deleteCall?.body).toMatchObject({ success: false, error: "CategoryInUse" });
  });

  it("CategoryAdminManager 가 라우트 오류 본문의 최상위 message 를 표시한다 (403 Forbidden)", async () => {
    const env = mount({
      categories: [],
      config: { permissions: { canManageCategories: () => false } },
    });
    const { container, findByRole } = render(<CategoryAdminManager />);
    await waitFor(() => {
      expect(env.calls.some((c) => c.method === "GET")).toBe(true);
    });

    fireEvent.change(container.querySelector('input[name="slug"]') as HTMLInputElement, {
      target: { value: "NEW_SLUG" },
    });
    fireEvent.change(container.querySelector('input[name="labelKo"]') as HTMLInputElement, {
      target: { value: "새 카테고리" },
    });
    fireEvent.click(container.querySelector(".gallery-category-admin__save") as HTMLButtonElement);

    const alert = await findByRole("alert");
    expect(alert.textContent).toBe("forbidden");
    const postCall = env.calls.find((c) => c.method === "POST");
    expect(postCall?.status).toBe(403);
    expect(postCall?.body).toEqual({ success: false, error: "Forbidden", message: "forbidden" });
  });

  it("CategoryAdminManager 가 호스트 미들웨어 오류 본문의 error.message 도 계속 표시한다 (401)", async () => {
    let authenticated = true;
    const env = mount({ categories: [], authenticated: () => authenticated });
    const { container, findByRole } = render(<CategoryAdminManager />);
    await waitFor(() => {
      expect(env.calls.some((c) => c.method === "GET")).toBe(true);
    });

    authenticated = false;
    fireEvent.change(container.querySelector('input[name="slug"]') as HTMLInputElement, {
      target: { value: "NEW_SLUG" },
    });
    fireEvent.change(container.querySelector('input[name="labelKo"]') as HTMLInputElement, {
      target: { value: "새 카테고리" },
    });
    fireEvent.click(container.querySelector(".gallery-category-admin__save") as HTMLButtonElement);

    const alert = await findByRole("alert");
    expect(alert.textContent).toBe("login required");
  });
});
