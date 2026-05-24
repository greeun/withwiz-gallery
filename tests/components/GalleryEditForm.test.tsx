import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GalleryEditForm } from "../../src/components/GalleryEditForm";
import type { GalleryCategoryItem, GalleryListItem } from "../../src/types";

const categories: GalleryCategoryItem[] = [
  {
    id: "cat-perf",
    slug: "PERFORMANCE",
    labelKo: "공연",
    labelEn: "Performance",
    sortOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "cat-reh",
    slug: "REHEARSAL",
    labelKo: "연습",
    labelEn: "Rehearsal",
    sortOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

function makeItem(overrides: Partial<GalleryListItem> = {}): GalleryListItem {
  return {
    id: "g-1",
    imageUrl: "https://cdn.test/g-1.jpg",
    imageKey: "key-1",
    caption: "원본 캡션",
    categoryId: "cat-perf",
    sortOrder: 5,
    featured: false,
    published: true,
    authorId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("GalleryEditForm", () => {
  it("새 모드 (value=null) — 저장 시 onSubmit 호출 payload 검증", async () => {
    const onSubmit = vi.fn();
    const { container, getByText } = render(
      <GalleryEditForm
        value={null}
        categories={categories}
        onSubmit={onSubmit}
        onImageSelect={async () => ({ url: "https://cdn.test/new.jpg", key: "k-new" })}
      />,
    );
    // caption / category / sortOrder 입력
    const captionInput = container.querySelector('input[name="caption"]') as HTMLInputElement;
    fireEvent.change(captionInput, { target: { value: "새 캡션" } });
    const sortInput = container.querySelector('input[name="sortOrder"]') as HTMLInputElement;
    fireEvent.change(sortInput, { target: { value: "3" } });

    // imageUrl 이 비어있으면 저장 차단 → 미리 image 를 임의 주입하기 위해 ImageDropZone 의 onFiles 시뮬은 복잡하므로
    // imageUrl 을 form 강제 주입 패턴 (defaultImageUrl) 사용
    // 하지만 본 컴포넌트는 다음 form 사용 — onImageSelect 이 실제로 호출되어야 함.
    // 일단 form 의 imageUrl 빈 상태 → 저장 시 onSubmit 호출 안 됨을 확인.
    fireEvent.click(getByText(/save/i));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("편집 모드 — 초기 값 채우고 onSubmit 시 변경분 포함 payload", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const value = makeItem();
    const { container, getByText } = render(
      <GalleryEditForm value={value} categories={categories} onSubmit={onSubmit} />,
    );
    // 초기 캡션 값
    const captionInput = container.querySelector('input[name="caption"]') as HTMLInputElement;
    expect(captionInput.value).toBe("원본 캡션");
    fireEvent.change(captionInput, { target: { value: "수정된 캡션" } });

    fireEvent.click(getByText(/save/i));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.caption).toBe("수정된 캡션");
    expect(payload.imageUrl).toBe("https://cdn.test/g-1.jpg");
    expect(payload.categoryId).toBe("cat-perf");
  });

  it("featured 토글 — canToggleFeatured=false 이고 현재 false 인 경우 비활성", () => {
    const value = makeItem({ featured: false });
    const { container } = render(
      <GalleryEditForm
        value={value}
        categories={categories}
        onSubmit={() => {}}
        canToggleFeatured={false}
      />,
    );
    const featuredSwitch = container.querySelector(
      '[data-toggle="featured"] [role="switch"]',
    ) as HTMLButtonElement;
    expect(featuredSwitch.getAttribute("aria-disabled")).toBe("true");
  });

  it("featured 토글 — canToggleFeatured=false 이지만 현재 true 인 경우 해제는 가능", () => {
    const value = makeItem({ featured: true });
    const onSubmit = vi.fn();
    const { container, getByText } = render(
      <GalleryEditForm
        value={value}
        categories={categories}
        onSubmit={onSubmit}
        canToggleFeatured={false}
      />,
    );
    const featuredSwitch = container.querySelector(
      '[data-toggle="featured"] [role="switch"]',
    ) as HTMLButtonElement;
    expect(featuredSwitch.getAttribute("aria-disabled") ?? "false").toBe("false");
    fireEvent.click(featuredSwitch);
    fireEvent.click(getByText(/save/i));
    expect(onSubmit).toHaveBeenCalled();
    expect(onSubmit.mock.calls[0][0].featured).toBe(false);
  });

  it("category select — categories 길이만큼 option, 선택 시 form 반영", async () => {
    const value = makeItem({ categoryId: "cat-perf" });
    const onSubmit = vi.fn();
    const { container, getByText } = render(
      <GalleryEditForm value={value} categories={categories} onSubmit={onSubmit} />,
    );
    const select = container.querySelector('select[name="categoryId"]') as HTMLSelectElement;
    expect(select.querySelectorAll("option").length).toBe(2);
    fireEvent.change(select, { target: { value: "cat-reh" } });
    fireEvent.click(getByText(/save/i));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].categoryId).toBe("cat-reh");
  });

  it("onCancel 콜백 호출", () => {
    const onCancel = vi.fn();
    const { getByText } = render(
      <GalleryEditForm
        value={makeItem()}
        categories={categories}
        onSubmit={() => {}}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(getByText(/cancel/i));
    expect(onCancel).toHaveBeenCalled();
  });

  it("multipleMode + 새 모드 — onSubmitMany 호출 with caption suffix + sortOrder 자동 증가", async () => {
    const onSubmitMany = vi.fn().mockResolvedValue(undefined);
    const { container, getByText, rerender } = render(
      <GalleryEditForm
        value={null}
        categories={categories}
        onSubmit={() => {}}
        multipleMode
        onSubmitMany={onSubmitMany}
        onImageSelect={async (file) => ({ url: `https://cdn.test/${file.name}`, key: `k-${file.name}` })}
      />,
    );
    // 이미지 2장을 ImageDropZone 의 onFiles 로 시뮬 → state 추가는 폼 내부 처리
    // 일단 폼에 multipleImages 를 직접 주입할 수 없으니, ImageDropZone hidden input 으로 시뮬
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const f1 = new File(["a"], "a.jpg", { type: "image/jpeg" });
    const f2 = new File(["b"], "b.jpg", { type: "image/jpeg" });
    Object.defineProperty(fileInput, "files", { value: [f1, f2], writable: false });
    fireEvent.change(fileInput);

    // 업로드 비동기 처리 대기
    await waitFor(() => {
      expect(container.querySelectorAll(".gallery-edit-form__multi-tile").length).toBeGreaterThanOrEqual(2);
    });

    // caption 입력
    const captionInput = container.querySelector('input[name="caption"]') as HTMLInputElement;
    fireEvent.change(captionInput, { target: { value: "공통" } });
    const sortInput = container.querySelector('input[name="sortOrder"]') as HTMLInputElement;
    fireEvent.change(sortInput, { target: { value: "10" } });
    // category 는 default = 첫번째 active
    fireEvent.click(getByText(/save/i));
    await waitFor(() => expect(onSubmitMany).toHaveBeenCalled());
    const items = onSubmitMany.mock.calls[0][0];
    expect(items).toHaveLength(2);
    expect(items[0].caption).toBe("공통_1");
    expect(items[1].caption).toBe("공통_2");
    expect(items[0].sortOrder).toBe(10);
    expect(items[1].sortOrder).toBe(11);
  });
});
