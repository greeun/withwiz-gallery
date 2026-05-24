import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollReveal } from "../../src/hooks/useScrollReveal";

type ObserverCallback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  observed: Element[] = [];
  unobserved: Element[] = [];
  disconnected = false;
  cb: ObserverCallback;
  constructor(cb: ObserverCallback) {
    this.cb = cb;
    MockIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve(el: Element) {
    this.unobserved.push(el);
  }
  disconnect() {
    this.disconnected = true;
  }
  trigger(entries: Array<{ isIntersecting: boolean; target: Element }>) {
    this.cb(entries);
  }
}

function Harness(props: { onState: (s: { isVisible: boolean }) => void; opts?: Parameters<typeof useScrollReveal>[0] }) {
  const { ref, isVisible } = useScrollReveal(props.opts);
  props.onState({ isVisible });
  return <div ref={ref as React.RefObject<HTMLDivElement>} data-testid="target" />;
}

describe("useScrollReveal", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    (globalThis as { IntersectionObserver: typeof MockIntersectionObserver }).IntersectionObserver =
      MockIntersectionObserver as unknown as typeof MockIntersectionObserver;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("초기 상태 isVisible=false 이고 element 를 observe 한다", () => {
    let latest: { isVisible: boolean } = { isVisible: true };
    render(<Harness onState={(s) => (latest = s)} />);
    expect(latest.isVisible).toBe(false);
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(MockIntersectionObserver.instances[0].observed).toHaveLength(1);
  });

  it("entry.isIntersecting=true 시 isVisible=true 로 전환", () => {
    let latest: { isVisible: boolean } = { isVisible: false };
    render(<Harness onState={(s) => (latest = s)} />);
    const obs = MockIntersectionObserver.instances[0];
    act(() => {
      obs.trigger([{ isIntersecting: true, target: obs.observed[0] }]);
    });
    expect(latest.isVisible).toBe(true);
  });

  it("once=true (default) 시 visible 1회 후 unobserve 호출", () => {
    let latest: { isVisible: boolean } = { isVisible: false };
    render(<Harness onState={(s) => (latest = s)} />);
    const obs = MockIntersectionObserver.instances[0];
    act(() => {
      obs.trigger([{ isIntersecting: true, target: obs.observed[0] }]);
    });
    expect(obs.unobserved).toContain(obs.observed[0]);
    expect(latest.isVisible).toBe(true);
  });

  it("once=false 시 unobserve 호출 안 함, isIntersecting 토글 따라감", () => {
    let latest: { isVisible: boolean } = { isVisible: false };
    render(<Harness onState={(s) => (latest = s)} opts={{ once: false }} />);
    const obs = MockIntersectionObserver.instances[0];
    act(() => {
      obs.trigger([{ isIntersecting: true, target: obs.observed[0] }]);
    });
    expect(latest.isVisible).toBe(true);
    expect(obs.unobserved).toHaveLength(0);
    act(() => {
      obs.trigger([{ isIntersecting: false, target: obs.observed[0] }]);
    });
    expect(latest.isVisible).toBe(false);
  });

  it("threshold 옵션을 IntersectionObserver 에 전달", () => {
    const spy = vi.fn();
    class CapturingObserver extends MockIntersectionObserver {
      constructor(cb: ObserverCallback, init?: { threshold?: number }) {
        super(cb);
        spy(init);
      }
    }
    (globalThis as { IntersectionObserver: typeof CapturingObserver }).IntersectionObserver =
      CapturingObserver as unknown as typeof CapturingObserver;
    render(<Harness onState={() => {}} opts={{ threshold: 0.5 }} />);
    expect(spy).toHaveBeenCalledWith({ threshold: 0.5 });
  });

  it("unmount 시 observer.disconnect 호출", () => {
    const { unmount } = render(<Harness onState={() => {}} />);
    const obs = MockIntersectionObserver.instances[0];
    expect(obs.disconnected).toBe(false);
    unmount();
    expect(obs.disconnected).toBe(true);
  });
});
