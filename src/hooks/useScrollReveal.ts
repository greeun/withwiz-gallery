import { useEffect, useRef, useState } from "react";

/** IntersectionObserver 기반 스크롤 reveal hook.
 *
 *  - SSR safe: `typeof window === "undefined"` 이면 effect 가 nothing.
 *  - jsdom 등 `IntersectionObserver` 미정의 환경에서도 effect 가 nothing (가드).
 *  - `once: true` (default) — 한번 visible 후 unobserve, 이후 다시 false 로 돌아가지 않음.
 *  - `once: false` — visible 진입/이탈에 따라 toggle.
 *
 *  반환되는 ref 는 React 19 의 `RefObject<HTMLElement | null>` 시그니처 — host 가 어떤
 *  구체 element 타입에든 마운트 가능하도록 광폭 타입을 둔다.
 */
export function useScrollReveal(opts?: { threshold?: number; once?: boolean }): {
  ref: React.RefObject<HTMLElement | null>;
  isVisible: boolean;
} {
  const threshold = opts?.threshold ?? 0.1;
  const once = opts?.once ?? true;
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver === "undefined") {
      return;
    }
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setIsVisible(false);
          }
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  return { ref, isVisible };
}
