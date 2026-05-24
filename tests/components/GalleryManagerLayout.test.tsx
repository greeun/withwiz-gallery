import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GalleryManagerLayout } from "../../src/components/GalleryManagerLayout";

describe("GalleryManagerLayout", () => {
  it("listRoot / filterControls / editForm / homePreview 모두 렌더", () => {
    const { getByTestId } = render(
      <GalleryManagerLayout
        listRoot={<div data-testid="list">LIST</div>}
        filterControls={<div data-testid="filter">FILTER</div>}
        toolbar={<div data-testid="toolbar">TOOLBAR</div>}
        editForm={<div data-testid="edit">EDIT</div>}
        homePreview={<div data-testid="preview">PREVIEW</div>}
      />,
    );
    expect(getByTestId("list").textContent).toBe("LIST");
    expect(getByTestId("filter").textContent).toBe("FILTER");
    expect(getByTestId("toolbar").textContent).toBe("TOOLBAR");
    expect(getByTestId("edit").textContent).toBe("EDIT");
    expect(getByTestId("preview").textContent).toBe("PREVIEW");
  });

  it("editForm 이 null 이면 emptyState 렌더", () => {
    const { getByTestId, queryByTestId } = render(
      <GalleryManagerLayout
        listRoot={<div>L</div>}
        editForm={null}
        emptyState={<div data-testid="empty">EMPTY</div>}
      />,
    );
    expect(getByTestId("empty").textContent).toBe("EMPTY");
    expect(queryByTestId("edit")).toBeNull();
  });

  it("editForm null + emptyState 미주입 시 기본 텍스트 노출 (i18n fallback)", () => {
    const { container } = render(
      <GalleryManagerLayout listRoot={<div>L</div>} editForm={null} />,
    );
    expect(container.querySelector(".gallery-manager__empty")).toBeTruthy();
  });

  it("ui.classNames.managerRoot 가 루트에 병합", () => {
    const { container } = render(
      <GalleryManagerLayout
        listRoot={<div>L</div>}
        editForm={null}
        ui={{ classNames: { managerRoot: "host-root-override" } }}
      />,
    );
    expect(container.querySelector(".gallery-manager")?.className).toMatch(/host-root-override/);
  });

  it("ui.slots.managerToolbar 가 toolbar prop 보다 우선", () => {
    const { getByTestId, queryByTestId } = render(
      <GalleryManagerLayout
        listRoot={<div>L</div>}
        editForm={null}
        toolbar={<div data-testid="toolbar-prop">PROP</div>}
        ui={{ slots: { managerToolbar: <div data-testid="toolbar-slot">SLOT</div> } }}
      />,
    );
    expect(getByTestId("toolbar-slot").textContent).toBe("SLOT");
    expect(queryByTestId("toolbar-prop")).toBeNull();
  });

  it("homePreview 미주입 시 .gallery-manager__preview 영역은 렌더되지 않음", () => {
    const { container } = render(
      <GalleryManagerLayout listRoot={<div>L</div>} editForm={null} />,
    );
    expect(container.querySelector(".gallery-manager__preview")).toBeNull();
  });

  it("i18n fallback — emptyState 미주입 + i18n 의 admin.emptyState 주입 시 그 텍스트 사용", () => {
    const { container } = render(
      <GalleryManagerLayout
        listRoot={<div>L</div>}
        editForm={null}
        i18n={{ "admin.emptyState": "항목을 선택하세요" }}
      />,
    );
    expect(container.querySelector(".gallery-manager__empty")?.textContent).toBe("항목을 선택하세요");
  });
});
