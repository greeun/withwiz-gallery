import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImageDropZone } from "../../src/components/ImageDropZone";

function makeFile(name: string, type: string, size = 1024): File {
  const f = new File(["x".repeat(size)], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
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

describe("ImageDropZone", () => {
  it("빈 상태 — dropPrompt 텍스트 노출", () => {
    const { getByText } = render(<ImageDropZone onFiles={() => {}} />);
    expect(getByText(/Drop image here/i)).toBeTruthy();
  });

  it("i18n.dropPrompt 가 fallback 을 override", () => {
    const { getByText } = render(
      <ImageDropZone onFiles={() => {}} i18n={{ dropPrompt: "여기에 이미지를 놓으세요" }} />,
    );
    expect(getByText("여기에 이미지를 놓으세요")).toBeTruthy();
  });

  it("previewUrl 지정 시 <img> 표시", () => {
    const { container } = render(
      <ImageDropZone onFiles={() => {}} previewUrl="/preview.jpg" />,
    );
    const img = container.querySelector(".gallery-dropzone__preview") as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe("/preview.jpg");
  });

  it("드래그 over 시 gallery-dropzone--dragging 클래스 토글", () => {
    const { container } = render(<ImageDropZone onFiles={() => {}} />);
    const zone = container.querySelector(".gallery-dropzone") as HTMLElement;
    expect(zone.className).not.toMatch(/gallery-dropzone--dragging/);
    fireEvent.dragEnter(zone, { dataTransfer: makeDataTransfer([]) });
    expect(zone.className).toMatch(/gallery-dropzone--dragging/);
    fireEvent.dragLeave(zone, { dataTransfer: makeDataTransfer([]) });
    expect(zone.className).not.toMatch(/gallery-dropzone--dragging/);
  });

  it("drop 시 허용 파일이 onFiles 콜백으로 전달", () => {
    const onFiles = vi.fn();
    const { container } = render(<ImageDropZone onFiles={onFiles} />);
    const zone = container.querySelector(".gallery-dropzone") as HTMLElement;
    const file = makeFile("a.png", "image/png");
    fireEvent.drop(zone, { dataTransfer: makeDataTransfer([file]) });
    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it("rejected 파일 시 reject 영역 노출", () => {
    const { container, getByRole } = render(
      <ImageDropZone onFiles={() => {}} accept={["image/png"]} />,
    );
    const zone = container.querySelector(".gallery-dropzone") as HTMLElement;
    fireEvent.drop(zone, { dataTransfer: makeDataTransfer([makeFile("a.gif", "image/gif")]) });
    expect(getByRole("alert")).toBeTruthy();
  });

  it("disabled 시 클릭이 picker 안 열리고 onFiles 미호출", () => {
    const onFiles = vi.fn();
    const { container } = render(<ImageDropZone onFiles={onFiles} disabled />);
    const zone = container.querySelector(".gallery-dropzone") as HTMLElement;
    expect(zone.getAttribute("aria-disabled")).toBe("true");
    fireEvent.drop(zone, { dataTransfer: makeDataTransfer([makeFile("a.png", "image/png")]) });
    expect(onFiles).not.toHaveBeenCalled();
  });
});
