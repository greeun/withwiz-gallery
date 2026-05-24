import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// vitest globals=false 환경에서 testing-library 의 자동 cleanup 이 등록되지 않으므로
// 명시적으로 등록한다. 각 테스트 종료 시 React 컴포넌트 DOM 을 정리.
afterEach(() => {
  cleanup();
});
