import { act, render } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import {
  useGalleryLightbox,
  type LightboxImage,
  type UseGalleryLightboxReturn,
} from "../../src/hooks/useGalleryLightbox";

type State = UseGalleryLightboxReturn;

function Harness(props: { images: LightboxImage[]; onState: (s: State) => void }) {
  const state = useGalleryLightbox(props.images);
  useEffect(() => {
    props.onState(state);
  });
  return null;
}

function makeImages(n: number): LightboxImage[] {
  return Array.from({ length: n }, (_, i) => ({ src: `/img${i}.jpg`, alt: `img${i}` }));
}

describe("useGalleryLightbox", () => {
  it("초기 상태 isOpen=false, current=null", () => {
    let latest: State | null = null;
    render(<Harness images={makeImages(3)} onState={(s) => (latest = s)} />);
    expect(latest!.isOpen).toBe(false);
    expect(latest!.current).toBeNull();
    expect(latest!.currentIndex).toBe(-1);
  });

  it("open(i) 후 isOpen=true, current=images[i]", () => {
    let latest: State | null = null;
    render(<Harness images={makeImages(3)} onState={(s) => (latest = s)} />);
    act(() => {
      latest!.open(1);
    });
    expect(latest!.isOpen).toBe(true);
    expect(latest!.currentIndex).toBe(1);
    expect(latest!.current?.src).toBe("/img1.jpg");
  });

  it("close() 시 isOpen=false 로 복귀", () => {
    let latest: State | null = null;
    render(<Harness images={makeImages(3)} onState={(s) => (latest = s)} />);
    act(() => {
      latest!.open(0);
    });
    act(() => {
      latest!.close();
    });
    expect(latest!.isOpen).toBe(false);
    expect(latest!.current).toBeNull();
  });

  it("next() wrap-around: 마지막 다음은 0", () => {
    let latest: State | null = null;
    render(<Harness images={makeImages(3)} onState={(s) => (latest = s)} />);
    act(() => {
      latest!.open(2);
    });
    act(() => {
      latest!.next();
    });
    expect(latest!.currentIndex).toBe(0);
  });

  it("prev() wrap-around: 0 의 이전은 마지막", () => {
    let latest: State | null = null;
    render(<Harness images={makeImages(3)} onState={(s) => (latest = s)} />);
    act(() => {
      latest!.open(0);
    });
    act(() => {
      latest!.prev();
    });
    expect(latest!.currentIndex).toBe(2);
  });

  it("빈 images 일 때 open(0) 은 no-op", () => {
    let latest: State | null = null;
    render(<Harness images={[]} onState={(s) => (latest = s)} />);
    act(() => {
      latest!.open(0);
    });
    expect(latest!.isOpen).toBe(false);
  });

  it("ESC 키 → close", () => {
    let latest: State | null = null;
    render(<Harness images={makeImages(3)} onState={(s) => (latest = s)} />);
    act(() => {
      latest!.open(1);
    });
    expect(latest!.isOpen).toBe(true);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(latest!.isOpen).toBe(false);
  });

  it("ArrowLeft / ArrowRight 키 동작", () => {
    let latest: State | null = null;
    render(<Harness images={makeImages(3)} onState={(s) => (latest = s)} />);
    act(() => {
      latest!.open(1);
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    });
    expect(latest!.currentIndex).toBe(2);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    });
    expect(latest!.currentIndex).toBe(1);
  });

  it("close 후 keydown listener 해제 (close 상태에서 ArrowRight 가 next 호출하지 않음)", () => {
    let latest: State | null = null;
    render(<Harness images={makeImages(3)} onState={(s) => (latest = s)} />);
    act(() => {
      latest!.open(1);
    });
    act(() => {
      latest!.close();
    });
    // close 상태에서 ArrowRight → currentIndex 가 변하지 않음 (-1 유지)
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    });
    expect(latest!.currentIndex).toBe(-1);
    expect(latest!.isOpen).toBe(false);
  });
});
