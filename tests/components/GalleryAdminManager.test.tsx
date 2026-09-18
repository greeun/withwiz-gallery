import { fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GalleryAdminManager } from "../../src/components/GalleryAdminManager";
import { resetGalleryConfig, setGalleryConfig } from "../../src/config";
import type { GalleryListItem } from "../../src/types";

function makeItem(id: string, overrides: Partial<GalleryListItem> = {}): GalleryListItem {
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
    ...overrides,
  };
}

function makeFile(name: string, type: string): File {
  return new File(["x"], name, { type });
}

function makeDataTransfer(files: File[]): DataTransfer {
  return {
    files: files as unknown as FileList,
    types: ["Files"],
    items: [] as unknown as DataTransferItemList,
    getData: () => "",
    setData: () => {},
    clearData: () => {},
    dropEffect: "copy" as const,
    effectAllowed: "all" as const,
    setDragImage: () => {},
  } as unknown as DataTransfer;
}

const CATEGORY = { id: "cat-1", slug: "C1", labelKo: "카1", labelEn: null, sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() };

interface FetchCall {
  url: string;
  init?: RequestInit;
}

function setupConfig() {
  setGalleryConfig({
    prisma: {} as any,
    apiWrapper: ((handler: any) => handler) as any,
    limits: { maxFeatured: 7, mosaicCount: 7, batchMax: 20, captionMaxLength: 200 },
  });
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
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return { fetch: fn, calls };
}

describe("GalleryAdminManager", () => {
  beforeEach(() => {
    setupConfig();
  });
  afterEach(() => {
    resetGalleryConfig();
    vi.restoreAllMocks();
  });

  it("마운트 시 /api/admin/galleries 와 /api/admin/gallery-categories 호출", async () => {
    const items = [makeItem("a"), makeItem("b")];
    const { fetch, calls } = makeFetch((url) => {
      if (url.includes("/api/admin/gallery-categories")) {
        return { success: true, data: [{ id: "cat-1", slug: "C1", labelKo: "카1", labelEn: null, sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() }] };
      }
      if (url.includes("/api/admin/galleries")) {
        return { success: true, data: items };
      }
      return { success: true, data: null };
    });
    vi.stubGlobal("fetch", fetch);
    const { container } = render(<GalleryAdminManager />);
    await waitFor(() => {
      const urls = calls.map((c) => c.url);
      expect(urls.some((u) => u.includes("/api/admin/galleries"))).toBe(true);
      expect(urls.some((u) => u.includes("/api/admin/gallery-categories"))).toBe(true);
    });
    // 목록 항목 두 개가 DOM 에 노출
    await waitFor(() => {
      expect(container.querySelectorAll(".gallery-list-item").length).toBe(2);
    });
  });

  it("새로 만들기 버튼 클릭 시 form 모드 진입 (editForm 슬롯 등장)", async () => {
    const { fetch, calls } = makeFetch((url) => {
      if (url.includes("/api/admin/gallery-categories")) {
        return { success: true, data: [{ id: "cat-1", slug: "C1", labelKo: "카1", labelEn: null, sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() }] };
      }
      return { success: true, data: [] };
    });
    vi.stubGlobal("fetch", fetch);
    const { container } = render(<GalleryAdminManager />);
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    const newBtn = container.querySelector(".gallery-manager__new-btn") as HTMLButtonElement;
    fireEvent.click(newBtn);
    await waitFor(() => {
      expect(container.querySelector(".gallery-edit-form")).toBeTruthy();
    });
  });

  it("편집 → onSubmit 시 PUT 호출", async () => {
    const items = [makeItem("a", { caption: "원본" })];
    let putCalled = false;
    const { fetch } = makeFetch((url, init) => {
      if (url.includes("/api/admin/gallery-categories")) {
        return { success: true, data: [{ id: "cat-1", slug: "C1", labelKo: "카1", labelEn: null, sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() }] };
      }
      if (url.endsWith("/api/admin/galleries") && (!init || init.method === undefined || init.method === "GET")) {
        return { success: true, data: items };
      }
      if (url.includes("/api/admin/galleries/a") && init?.method === "PUT") {
        putCalled = true;
        return { success: true, data: items[0] };
      }
      if (url.includes("/api/admin/galleries/a")) {
        return { success: true, data: items[0] };
      }
      return { success: true, data: [] };
    });
    vi.stubGlobal("fetch", fetch);
    const { container } = render(<GalleryAdminManager initialSelectedId="a" />);
    // 항목 로드 → form 에 caption 반영까지 대기
    await waitFor(() => {
      const captionInput = container.querySelector('input[name="caption"]') as HTMLInputElement | null;
      expect(captionInput?.value).toBe("원본");
    });
    const saveBtn = container.querySelector(
      ".gallery-edit-form__btn.gallery-edit-form__btn--primary",
    ) as HTMLButtonElement;
    fireEvent.click(saveBtn);
    await waitFor(() => expect(putCalled).toBe(true));
  });

  it("새로 생성 — 업로드 함수가 없으면 저장을 막고 POST 를 호출하지 않는다", async () => {
    const { fetch, calls } = makeFetch((url) => {
      if (url.includes("/api/admin/gallery-categories")) {
        return { success: true, data: [{ id: "cat-1", slug: "C1", labelKo: "카1", labelEn: null, sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() }] };
      }
      return { success: true, data: [] };
    });
    vi.stubGlobal("fetch", fetch);
    const { container, findByRole } = render(<GalleryAdminManager initialMode="new" />);
    await waitFor(() => {
      expect(container.querySelector(".gallery-edit-form")).toBeTruthy();
    });

    fireEvent.drop(container.querySelector(".gallery-dropzone") as HTMLElement, {
      dataTransfer: makeDataTransfer([makeFile("a.png", "image/png")]),
    });
    expect((await findByRole("alert")).textContent).toBe(
      "onImageSelect prop missing — host must provide upload handler",
    );

    fireEvent.click(
      container.querySelector(".gallery-edit-form__btn.gallery-edit-form__btn--primary") as HTMLButtonElement,
    );
    await waitFor(() => {
      expect(container.querySelector('[role="alert"]')?.textContent).toBe("Image is required");
    });
    expect(calls.filter((c) => c.init?.method === "POST")).toHaveLength(0);
  });

  it("저장 실패 — 폼을 닫지 않고 오류를 표시한다", async () => {
    const items = [makeItem("a", { caption: "원본" })];
    const { fetch } = makeFetch((url, init) => {
      if (url.includes("/api/admin/gallery-categories")) {
        return { success: true, data: [CATEGORY] };
      }
      if (url.endsWith("/api/admin/galleries") && (!init || init.method === undefined || init.method === "GET")) {
        return { success: true, data: items };
      }
      if (url.includes("/api/admin/galleries/a") && init?.method === "PUT") {
        return new Response(JSON.stringify({ success: false, message: "저장할 수 없습니다" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      return { success: true, data: items[0] };
    });
    vi.stubGlobal("fetch", fetch);
    const { container } = render(<GalleryAdminManager initialSelectedId="a" />);
    await waitFor(() => {
      const captionInput = container.querySelector('input[name="caption"]') as HTMLInputElement | null;
      expect(captionInput?.value).toBe("원본");
    });
    fireEvent.click(
      container.querySelector(".gallery-edit-form__btn.gallery-edit-form__btn--primary") as HTMLButtonElement,
    );
    await waitFor(() => {
      expect(container.querySelector(".gallery-manager__error")?.textContent).toBe("저장할 수 없습니다");
    });
    // 편집 폼이 그대로 남아 입력값을 잃지 않는다
    expect(container.querySelector(".gallery-edit-form")).toBeTruthy();
  });

  it("삭제 실패 — 목록으로 돌아가지 않고 오류를 표시한다", async () => {
    const items = [makeItem("a", { caption: "원본" })];
    const { fetch } = makeFetch((url, init) => {
      if (url.includes("/api/admin/gallery-categories")) {
        return { success: true, data: [CATEGORY] };
      }
      if (url.endsWith("/api/admin/galleries") && (!init || init.method === undefined || init.method === "GET")) {
        return { success: true, data: items };
      }
      if (url.includes("/api/admin/galleries/a") && init?.method === "DELETE") {
        return new Response(JSON.stringify({ success: false, message: "삭제할 수 없습니다" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }
      return { success: true, data: items[0] };
    });
    vi.stubGlobal("fetch", fetch);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container } = render(<GalleryAdminManager initialSelectedId="a" />);
    await waitFor(() => {
      expect(container.querySelector(".gallery-edit-form")).toBeTruthy();
    });
    const deleteBtn = container.querySelector(
      ".gallery-edit-form__btn--danger",
    ) as HTMLButtonElement;
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(container.querySelector(".gallery-manager__error")?.textContent).toBe("삭제할 수 없습니다");
    });
    expect(container.querySelector(".gallery-edit-form")).toBeTruthy();
  });

  it("목록 — 여러 페이지면 남은 페이지까지 이어서 불러온다", async () => {
    const page1 = [makeItem("a"), makeItem("b")];
    const page2 = [makeItem("c")];
    const { fetch, calls } = makeFetch((url, init) => {
      if (url.includes("/api/admin/gallery-categories")) {
        return { success: true, data: [CATEGORY] };
      }
      if (url.includes("/api/admin/galleries") && (!init || init.method === undefined || init.method === "GET")) {
        const page = Number(new URL(url, "http://t").searchParams.get("page") ?? "1");
        return {
          success: true,
          data: {
            items: page === 1 ? page1 : page2,
            meta: { page, limit: 2, total: 3, totalPages: 2 },
          },
        };
      }
      return { success: true, data: [] };
    });
    vi.stubGlobal("fetch", fetch);
    const { container } = render(<GalleryAdminManager />);
    await waitFor(() => {
      expect(container.querySelectorAll(".gallery-list-item").length).toBe(3);
    });
    const listCalls = calls.filter((c) => c.url.includes("/api/admin/galleries") && !c.url.includes("categories"));
    expect(listCalls.some((c) => c.url.includes("page=2"))).toBe(true);
  });

  it("일괄 생성 — featured 여유보다 많으면 요청하지 않고 오류를 표시한다", async () => {
    // maxFeatured 7, 이미 공개 featured 6건 → 남은 자리 1
    const items = Array.from({ length: 6 }, (_, i) =>
      makeItem(`f${i}`, { featured: true, published: true }),
    );
    const { fetch, calls } = makeFetch((url, init) => {
      if (url.includes("/api/admin/gallery-categories")) {
        return { success: true, data: [CATEGORY] };
      }
      if (url.includes("/api/admin/galleries") && (!init || init.method === undefined || init.method === "GET")) {
        return { success: true, data: items };
      }
      return { success: true, data: { count: 2 } };
    });
    vi.stubGlobal("fetch", fetch);
    const { container } = render(
      <GalleryAdminManager
        initialMode="new"
        onImageSelect={async (file) => ({ url: `https://cdn.test/${file.name}`, key: `k-${file.name}` })}
      />,
    );
    await waitFor(() => {
      expect(container.querySelectorAll(".gallery-list-item").length).toBe(6);
    });

    // 이미지 2장을 올려 다중 모드로 만든다
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, "files", {
      value: [makeFile("a.jpg", "image/jpeg"), makeFile("b.jpg", "image/jpeg")],
      writable: false,
    });
    fireEvent.change(fileInput);
    await waitFor(() => {
      expect(container.querySelectorAll(".gallery-edit-form__multi-tile").length).toBeGreaterThanOrEqual(2);
    });

    // featured·published 를 켜고 저장한다
    fireEvent.click(
      container.querySelector('[data-toggle="featured"] [role="switch"]') as HTMLElement,
    );
    fireEvent.click(
      container.querySelector('[data-toggle="published"] [role="switch"]') as HTMLElement,
    );
    fireEvent.click(
      container.querySelector(".gallery-edit-form__btn.gallery-edit-form__btn--primary") as HTMLButtonElement,
    );

    await waitFor(() => {
      expect(container.querySelector(".gallery-manager__error")).toBeTruthy();
    });
    expect(calls.some((c) => c.url.includes("/bulk"))).toBe(false);
  });

  it("삭제 — DELETE 호출", async () => {
    const items = [makeItem("a")];
    let deleteCalled = false;
    const { fetch } = makeFetch((url, init) => {
      if (url.includes("/api/admin/gallery-categories")) {
        return { success: true, data: [{ id: "cat-1", slug: "C1", labelKo: "카1", labelEn: null, sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() }] };
      }
      if (url.endsWith("/api/admin/galleries") && (!init || init.method === undefined || init.method === "GET")) {
        return { success: true, data: items };
      }
      if (url.includes("/api/admin/galleries/a") && init?.method === "DELETE") {
        deleteCalled = true;
        return { success: true };
      }
      if (url.includes("/api/admin/galleries/a")) {
        return { success: true, data: items[0] };
      }
      return { success: true, data: [] };
    });
    vi.stubGlobal("fetch", fetch);

    // window.confirm mock
    vi.spyOn(window, "confirm").mockImplementation(() => true);

    const { container } = render(<GalleryAdminManager initialSelectedId="a" />);
    await waitFor(() => {
      const captionInput = container.querySelector('input[name="caption"]') as HTMLInputElement | null;
      expect(captionInput?.value).toBe("cap-a");
    });
    const deleteBtn = container.querySelector(
      ".gallery-edit-form__btn.gallery-edit-form__btn--danger",
    ) as HTMLButtonElement;
    fireEvent.click(deleteBtn);
    await waitFor(() => expect(deleteCalled).toBe(true));
  });
});

describe("GalleryAdminManager — TC-I-006 새 항목 생성·featured 상한", () => {
  beforeEach(() => {
    setupConfig();
  });
  afterEach(() => {
    resetGalleryConfig();
    vi.restoreAllMocks();
  });

  function newItemFetch() {
    return makeFetch((url, init) => {
      if (url.includes("/api/admin/gallery-categories")) return { success: true, data: [CATEGORY] };
      if (url.endsWith("/api/admin/galleries") && init?.method === "POST") {
        return { success: true, data: { id: "new-1" } };
      }
      return { success: true, data: [] };
    });
  }

  it("onImageSelect 를 전달하면 새 모드에서 drop 한 이미지의 업로드 결과가 드롭존 미리보기에 표시된다", async () => {
    const { fetch } = newItemFetch();
    vi.stubGlobal("fetch", fetch);
    const onImageSelect = vi.fn(async (file: File) => ({
      url: `https://cdn.test/uploaded/${file.name}`,
      key: `gallery/${file.name}`,
    }));
    const { container } = render(<GalleryAdminManager initialMode="new" onImageSelect={onImageSelect} />);
    await waitFor(() => expect(container.querySelector(".gallery-dropzone")).toBeTruthy());

    const file = makeFile("a.png", "image/png");
    fireEvent.drop(container.querySelector(".gallery-dropzone") as HTMLElement, {
      dataTransfer: makeDataTransfer([file]),
    });

    await waitFor(() => {
      const preview = container.querySelector(".gallery-dropzone__preview") as HTMLImageElement | null;
      expect(preview?.getAttribute("src")).toBe("https://cdn.test/uploaded/a.png");
    });
    expect(onImageSelect).toHaveBeenCalledTimes(1);
    expect(onImageSelect).toHaveBeenCalledWith(file);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("업로드 후 저장하면 /api/admin/galleries 에 POST 를 1회 보내고 본문에 업로드 결과가 담긴다", async () => {
    const { fetch, calls } = newItemFetch();
    vi.stubGlobal("fetch", fetch);
    const onImageSelect = async (file: File) => ({
      url: `https://cdn.test/uploaded/${file.name}`,
      key: `gallery/${file.name}`,
    });
    const { container } = render(<GalleryAdminManager initialMode="new" onImageSelect={onImageSelect} />);
    await waitFor(() => {
      expect((container.querySelector('select[name="categoryId"]') as HTMLSelectElement | null)?.value).toBe("cat-1");
    });

    fireEvent.drop(container.querySelector(".gallery-dropzone") as HTMLElement, {
      dataTransfer: makeDataTransfer([makeFile("a.png", "image/png")]),
    });
    await waitFor(() => expect(container.querySelector(".gallery-dropzone__preview")).toBeTruthy());
    fireEvent.click(
      container.querySelector(".gallery-edit-form__btn.gallery-edit-form__btn--primary") as HTMLButtonElement,
    );

    await waitFor(() => {
      expect(calls.filter((c) => c.init?.method === "POST")).toHaveLength(1);
    });
    const post = calls.find((c) => c.init?.method === "POST")!;
    expect(post.url).toBe("/api/admin/galleries");
    expect(JSON.parse(post.init!.body as string)).toMatchObject({
      imageUrl: "https://cdn.test/uploaded/a.png",
      imageKey: "gallery/a.png",
      categoryId: "cat-1",
    });
  });

  function capFetch(xFeatured: boolean) {
    const featured = Array.from({ length: 7 }, (_, i) =>
      makeItem(`f${i + 1}`, { featured: true, published: true, sortOrder: i + 1 }),
    );
    const items = [...featured, makeItem("x", { featured: xFeatured, published: true, sortOrder: 8 })];
    return makeFetch((url) => {
      if (url.includes("/api/admin/gallery-categories")) return { success: true, data: [CATEGORY] };
      if (url.endsWith("/api/admin/galleries")) return { success: true, data: items };
      return { success: true, data: null };
    });
  }

  it("featured 가 상한(7)에 도달한 상태에서 featured 가 아닌 항목을 선택하면 featured 스위치가 비활성화되고 안내가 표시된다", async () => {
    const { fetch } = capFetch(false);
    vi.stubGlobal("fetch", fetch);
    const { container, getByText } = render(<GalleryAdminManager initialSelectedId="x" />);
    await waitFor(() => {
      expect((container.querySelector('input[name="caption"]') as HTMLInputElement | null)?.value).toBe("cap-x");
    });

    const featuredSwitch = container.querySelector('[data-toggle="featured"] [role="switch"]') as HTMLButtonElement;
    expect(featuredSwitch.getAttribute("aria-disabled")).toBe("true");
    expect(getByText("Featured cap reached — uncheck others first")).toBeTruthy();
  });

  it("같은 조건에서 선택한 항목이 이미 featured 이면 featured 스위치가 비활성화되지 않는다", async () => {
    const { fetch } = capFetch(true);
    vi.stubGlobal("fetch", fetch);
    const { container, queryByText } = render(<GalleryAdminManager initialSelectedId="x" />);
    await waitFor(() => {
      expect((container.querySelector('input[name="caption"]') as HTMLInputElement | null)?.value).toBe("cap-x");
    });

    const featuredSwitch = container.querySelector('[data-toggle="featured"] [role="switch"]') as HTMLButtonElement;
    expect(featuredSwitch.hasAttribute("aria-disabled")).toBe(false);
    expect(queryByText("Featured cap reached — uncheck others first")).toBeNull();
  });
});
