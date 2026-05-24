import { fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryAdminManager } from "../../src/components/CategoryAdminManager";
import { resetGalleryConfig, setGalleryConfig } from "../../src/config";
import type { GalleryCategoryItem } from "../../src/types";

function makeCat(id: string, slug: string, overrides: Partial<GalleryCategoryItem> = {}): GalleryCategoryItem {
  return {
    id,
    slug,
    labelKo: `${slug}-ko`,
    labelEn: `${slug}-en`,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function setupConfig() {
  setGalleryConfig({
    prisma: {} as any,
    apiWrapper: ((handler: any) => handler) as any,
    limits: { maxFeatured: 7, mosaicCount: 7, batchMax: 20, captionMaxLength: 200 },
  });
}

interface FetchCall {
  url: string;
  init?: RequestInit;
}

function makeFetch(handler: (url: string, init?: RequestInit) => any): {
  fetch: typeof fetch;
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];
  const fn = (async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input.url;
    calls.push({ url, init });
    const result = handler(url, init);
    if (result instanceof Response) return result;
    const status = result?._status ?? 200;
    return new Response(JSON.stringify(result), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return { fetch: fn, calls };
}

describe("CategoryAdminManager", () => {
  beforeEach(() => {
    setupConfig();
  });
  afterEach(() => {
    resetGalleryConfig();
    vi.restoreAllMocks();
  });

  it("마운트 시 /api/admin/gallery-categories 호출 + 목록 노출", async () => {
    const cats = [makeCat("c1", "PERFORMANCE"), makeCat("c2", "REHEARSAL")];
    const { fetch } = makeFetch(() => ({ success: true, data: cats }));
    vi.stubGlobal("fetch", fetch);
    const { container } = render(<CategoryAdminManager />);
    await waitFor(() => {
      expect(container.querySelectorAll(".gallery-category-admin__item").length).toBe(2);
    });
  });

  it("새로 생성 — POST 호출", async () => {
    let postCalled = false;
    const { fetch } = makeFetch((url, init) => {
      if (init?.method === "POST") {
        postCalled = true;
        return { success: true, data: makeCat("c-new", "NEW") };
      }
      return { success: true, data: [] };
    });
    vi.stubGlobal("fetch", fetch);
    const { container } = render(<CategoryAdminManager />);
    await waitFor(() => {
      expect(container.querySelector(".gallery-category-admin")).toBeTruthy();
    });
    const slugInput = container.querySelector('input[name="slug"]') as HTMLInputElement;
    fireEvent.change(slugInput, { target: { value: "NEW_SLUG" } });
    const labelKoInput = container.querySelector('input[name="labelKo"]') as HTMLInputElement;
    fireEvent.change(labelKoInput, { target: { value: "한글" } });
    const saveBtn = container.querySelector(".gallery-category-admin__save") as HTMLButtonElement;
    fireEvent.click(saveBtn);
    await waitFor(() => expect(postCalled).toBe(true));
  });

  it("DELETE 시 409 응답이면 사용 중 안내 표시", async () => {
    const cats = [makeCat("c1", "PERFORMANCE")];
    const { fetch } = makeFetch((url, init) => {
      if (init?.method === "DELETE") {
        return { success: false, error: { message: "in use" }, _status: 409 };
      }
      return { success: true, data: cats };
    });
    vi.stubGlobal("fetch", fetch);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container } = render(<CategoryAdminManager />);
    await waitFor(() => {
      expect(container.querySelectorAll(".gallery-category-admin__item").length).toBe(1);
    });
    const delBtn = container.querySelector(".gallery-category-admin__delete") as HTMLButtonElement;
    fireEvent.click(delBtn);
    await waitFor(() => {
      const errEl = container.querySelector(".gallery-category-admin__error");
      expect(errEl).toBeTruthy();
      expect(errEl?.textContent).toMatch(/galleries|use|사용/i);
    });
  });
});
