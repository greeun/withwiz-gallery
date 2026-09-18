/**
 * 관리자 컴포넌트가 함께 쓰는 fetch·오류 해석 헬퍼.
 *
 * `CategoryAdminManager` 와 `GalleryAdminManager` 가 같은 구현을 따로 두고 있었다.
 * 응답 상태 해석 규칙이 두 화면에서 어긋나지 않도록 한곳에 모았다.
 */

// host 가 더 정교한 인증 fetcher 가 필요하면 config.clientFetch 추가 검토.
export async function clientFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    credentials: "include",
    headers: init?.body
      ? { "Content-Type": "application/json", ...(init?.headers as any) }
      : init?.headers,
    ...init,
  });
}

export async function jsonOrNull(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** 오류 응답 본문에서 표시할 메시지를 꺼낸다.
 *  - `createGalleryRoutes` 핸들러: `{ success: false, error: "Forbidden", message: "forbidden" }` (error 는 코드 문자열)
 *  - 호스트 미들웨어(예: @withwiz/toolkit error-handler): `{ success: false, error: { code, message } }`
 *  두 형식 모두에서 message 를 찾고, 없으면 null 을 반환한다. */
export function errorMessageOf(json: any): string | null {
  const nested = json?.error?.message;
  if (typeof nested === "string" && nested.length > 0) return nested;
  const topLevel = json?.message;
  if (typeof topLevel === "string" && topLevel.length > 0) return topLevel;
  return null;
}

/** 실패 응답에서 사용자에게 보일 문구를 만든다. 본문에 메시지가 없으면 상태 코드를 덧붙인다. */
export async function failureMessage(res: Response, fallback: string): Promise<string> {
  const json = await jsonOrNull(res);
  return errorMessageOf(json) ?? `${fallback} (${res.status})`;
}
