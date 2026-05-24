import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GalleryHomePreview } from "../../src/components/GalleryHomePreview";
import type { GalleryListItem } from "../../src/types";

function makeItem(id: string, sortOrder = 0, featured = true): GalleryListItem {
  return {
    id,
    imageUrl: `https://cdn.test/${id}.jpg`,
    imageKey: null,
    caption: `cap-${id}`,
    categoryId: "cat-1",
    sortOrder,
    featured,
    published: true,
    authorId: "user-1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

describe("GalleryHomePreview", () => {
  it("items 0 일 때 emptyState 노출 + mosaic 없음", () => {
    const { container, queryByText } = render(
      <GalleryHomePreview
        items={[]}
        maxCount={7}
        onReorder={() => {}}
        onToggleFeatured={() => {}}
      />,
    );
    expect(container.querySelector(".gallery-home-preview__mosaic")).toBeNull();
    expect(queryByText(/select/i) ?? container.querySelector(".gallery-home-preview__empty")).toBeTruthy();
  });

  it("mosaic 의 data-count 가 maxCount 와 일치", () => {
    const items = [makeItem("a", 0), makeItem("b", 1), makeItem("c", 2)];
    const { container } = render(
      <GalleryHomePreview
        items={items}
        maxCount={7}
        onReorder={() => {}}
        onToggleFeatured={() => {}}
      />,
    );
    const mosaic = container.querySelector(".gallery-home-preview__mosaic");
    expect(mosaic).toBeTruthy();
    expect(mosaic?.getAttribute("data-count")).toBe("7");
  });

  it("featured ★ 버튼 클릭 시 onToggleFeatured(id, !current) 호출", () => {
    const items = [makeItem("a", 0, true)];
    const onToggleFeatured = vi.fn();
    const { container } = render(
      <GalleryHomePreview
        items={items}
        maxCount={7}
        onReorder={() => {}}
        onToggleFeatured={onToggleFeatured}
      />,
    );
    const star = container.querySelector(".gallery-home-preview__star") as HTMLButtonElement;
    fireEvent.click(star);
    expect(onToggleFeatured).toHaveBeenCalledWith("a", false);
  });

  it("드래그 swap 후 onReorder(orderedIds) 호출", () => {
    const items = [makeItem("a", 0), makeItem("b", 1), makeItem("c", 2)];
    const onReorder = vi.fn();
    const { container } = render(
      <GalleryHomePreview
        items={items}
        maxCount={3}
        onReorder={onReorder}
        onToggleFeatured={() => {}}
      />,
    );
    const tiles = Array.from(
      container.querySelectorAll(".gallery-home-preview__tile"),
    ) as HTMLElement[];
    expect(tiles.length).toBeGreaterThanOrEqual(3);

    // drag tile 0 onto tile 2
    const dataTransfer = { effectAllowed: "", dropEffect: "", setData: () => {}, getData: () => "" };
    fireEvent.dragStart(tiles[0], { dataTransfer });
    fireEvent.dragOver(tiles[2], { dataTransfer });
    fireEvent.drop(tiles[2], { dataTransfer });
    fireEvent.dragEnd(tiles[0], { dataTransfer });

    expect(onReorder).toHaveBeenCalledTimes(1);
    const orderedIds = onReorder.mock.calls[0][0];
    // a 와 c 가 swap 되어 [c, b, a] 순.
    expect(orderedIds).toEqual(["c", "b", "a"]);
  });

  it("같은 위치에 drop 하면 onReorder 호출 안 됨", () => {
    const items = [makeItem("a", 0), makeItem("b", 1)];
    const onReorder = vi.fn();
    const { container } = render(
      <GalleryHomePreview
        items={items}
        maxCount={2}
        onReorder={onReorder}
        onToggleFeatured={() => {}}
      />,
    );
    const tiles = Array.from(
      container.querySelectorAll(".gallery-home-preview__tile"),
    ) as HTMLElement[];
    const dt = { effectAllowed: "", dropEffect: "", setData: () => {}, getData: () => "" };
    fireEvent.dragStart(tiles[0], { dataTransfer: dt });
    fireEvent.dragOver(tiles[0], { dataTransfer: dt });
    fireEvent.drop(tiles[0], { dataTransfer: dt });
    fireEvent.dragEnd(tiles[0], { dataTransfer: dt });
    expect(onReorder).not.toHaveBeenCalled();
  });
});
