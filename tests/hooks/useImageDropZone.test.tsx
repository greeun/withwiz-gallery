import { act, fireEvent, render } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { useImageDropZone, type UseImageDropZoneOptions } from "../../src/hooks/useImageDropZone";

type State = ReturnType<typeof useImageDropZone>;

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

function Harness(props: { opts: UseImageDropZoneOptions; onState: (s: State) => void }) {
  const state = useImageDropZone(props.opts);
  useEffect(() => {
    props.onState(state);
  });
  return (
    <div>
      <div data-testid="drop" {...state.dropProps}>
        zone
      </div>
      <input data-testid="picker" {...state.inputProps} />
    </div>
  );
}

describe("useImageDropZone", () => {
  it("drop happy: 허용 MIME 파일을 onFiles 로 전달", () => {
    const onFiles = vi.fn();
    let latest: State | null = null;
    const { getByTestId } = render(
      <Harness opts={{ onFiles }} onState={(s) => (latest = s)} />,
    );
    const file = makeFile("a.png", "image/png");
    fireEvent.drop(getByTestId("drop"), { dataTransfer: makeDataTransfer([file]) });
    expect(onFiles).toHaveBeenCalledWith([file]);
    expect(latest!.rejectedReasons).toEqual([]);
  });

  it("accept 외 MIME 거부 → rejectedReasons 에 기록, onFiles 미호출", () => {
    const onFiles = vi.fn();
    let latest: State | null = null;
    const { getByTestId } = render(
      <Harness
        opts={{ onFiles, accept: ["image/png"] }}
        onState={(s) => (latest = s)}
      />,
    );
    const file = makeFile("a.gif", "image/gif");
    fireEvent.drop(getByTestId("drop"), { dataTransfer: makeDataTransfer([file]) });
    expect(onFiles).not.toHaveBeenCalled();
    expect(latest!.rejectedReasons.length).toBeGreaterThan(0);
    expect(latest!.rejectedReasons[0]).toMatch(/a\.gif/);
  });

  it("maxSize 초과 거부", () => {
    const onFiles = vi.fn();
    let latest: State | null = null;
    const { getByTestId } = render(
      <Harness opts={{ onFiles, maxSize: 1024 }} onState={(s) => (latest = s)} />,
    );
    const file = makeFile("big.png", "image/png", 2048);
    fireEvent.drop(getByTestId("drop"), { dataTransfer: makeDataTransfer([file]) });
    expect(onFiles).not.toHaveBeenCalled();
    expect(latest!.rejectedReasons[0]).toMatch(/big\.png/);
  });

  it("multiple=false 일 때 첫 파일만 통과", () => {
    const onFiles = vi.fn();
    const { getByTestId } = render(
      <Harness opts={{ onFiles, multiple: false }} onState={() => {}} />,
    );
    const f1 = makeFile("a.png", "image/png");
    const f2 = makeFile("b.png", "image/png");
    fireEvent.drop(getByTestId("drop"), { dataTransfer: makeDataTransfer([f1, f2]) });
    expect(onFiles).toHaveBeenCalledWith([f1]);
  });

  it("disabled 시 onFiles 미호출", () => {
    const onFiles = vi.fn();
    const { getByTestId } = render(
      <Harness opts={{ onFiles, disabled: true }} onState={() => {}} />,
    );
    const f = makeFile("a.png", "image/png");
    fireEvent.drop(getByTestId("drop"), { dataTransfer: makeDataTransfer([f]) });
    expect(onFiles).not.toHaveBeenCalled();
  });

  it("validate 콜백 false 시 reject 처리", () => {
    const onFiles = vi.fn();
    let latest: State | null = null;
    const validate = vi.fn(() => ({ ok: false as const, reason: "너무 작아요" }));
    const { getByTestId } = render(
      <Harness opts={{ onFiles, validate }} onState={(s) => (latest = s)} />,
    );
    const f = makeFile("a.png", "image/png");
    fireEvent.drop(getByTestId("drop"), { dataTransfer: makeDataTransfer([f]) });
    expect(validate).toHaveBeenCalledWith(f);
    expect(onFiles).not.toHaveBeenCalled();
    expect(latest!.rejectedReasons[0]).toMatch(/너무 작아요/);
  });

  it("dragEnter 시 isDragging=true, dragLeave 카운터 0 도달 시 false", () => {
    let latest: State | null = null;
    const { getByTestId } = render(
      <Harness opts={{ onFiles: () => {} }} onState={(s) => (latest = s)} />,
    );
    const zone = getByTestId("drop");
    act(() => {
      fireEvent.dragEnter(zone, { dataTransfer: makeDataTransfer([]) });
    });
    expect(latest!.isDragging).toBe(true);
    act(() => {
      fireEvent.dragLeave(zone, { dataTransfer: makeDataTransfer([]) });
    });
    expect(latest!.isDragging).toBe(false);
  });

  it("inputProps.accept 가 MIME 배열을 콤마 결합", () => {
    let latest: State | null = null;
    render(
      <Harness
        opts={{ onFiles: () => {}, accept: ["image/png", "image/webp"] }}
        onState={(s) => (latest = s)}
      />,
    );
    expect(latest!.inputProps.accept).toBe("image/png,image/webp");
  });

  it("새 drop 시 이전 rejectedReasons 초기화", () => {
    const onFiles = vi.fn();
    let latest: State | null = null;
    const { getByTestId } = render(
      <Harness
        opts={{ onFiles, accept: ["image/png"] }}
        onState={(s) => (latest = s)}
      />,
    );
    fireEvent.drop(getByTestId("drop"), {
      dataTransfer: makeDataTransfer([makeFile("bad.gif", "image/gif")]),
    });
    expect(latest!.rejectedReasons.length).toBe(1);
    fireEvent.drop(getByTestId("drop"), {
      dataTransfer: makeDataTransfer([makeFile("ok.png", "image/png")]),
    });
    expect(latest!.rejectedReasons).toEqual([]);
    expect(onFiles).toHaveBeenCalledTimes(1);
  });
});
