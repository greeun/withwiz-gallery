/**
 * 테스트 전용 fetch 어댑터.
 *
 * 관리자 컴포넌트가 보내는 요청을 URL·method 로 `createGalleryRoutes(config)` 핸들러에 연결한다.
 * 핸들러가 반환한 Response 를 그대로 컴포넌트에 돌려주므로, 응답 형식은 실제 라우트와 같다.
 */
import { createGalleryRoutes, type GalleryRoutes } from "../../src/server/route-handlers";
import type { ApiContext, ApiWrapper, GalleryConfig, RouteHandler } from "../../src/types";

export interface RouteCall {
  method: string;
  path: string;
  status: number;
  body: unknown;
}

export interface RouteFetch {
  fetch: typeof fetch;
  routes: GalleryRoutes;
  calls: RouteCall[];
}

/**
 * 호스트 어댑터와 같은 방식으로 `routeCtx.params` 를 await 해서 `ctx.params` 로 전달하는 apiWrapper.
 * `resolveUser` 가 null 을 반환하면 호스트 미들웨어처럼 핸들러를 실행하지 않고 401 을 반환한다.
 * 이때 본문은 호스트 미들웨어(@withwiz/toolkit error-handler)의 `error: { code, message }` 형식을 따른다.
 */
export function makeTestApiWrapper(
  resolveUser: () => ApiContext["user"] | null = () => ({ id: "user-1" }),
): ApiWrapper {
  return (handler) =>
    (async (req, routeCtx) => {
      const user = resolveUser();
      if (!user) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "UNAUTHORIZED", message: "login required" },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
      const params = routeCtx ? await routeCtx.params : undefined;
      return handler({ request: req, user, params });
    }) as RouteHandler;
}

type Resolved = { handler: RouteHandler; params?: Record<string, string> };

function resolveRoute(routes: GalleryRoutes, method: string, path: string): Resolved | null {
  const segments = path.split("/").filter(Boolean);
  // ["api", "admin", resource, ...rest]
  if (segments[0] !== "api" || segments[1] !== "admin") return null;
  const [, , resource, id, sub] = segments;
  const pick = (group: Record<string, RouteHandler>, params?: Record<string, string>): Resolved | null =>
    group[method] ? { handler: group[method], params } : null;

  if (resource === "galleries") {
    if (id === undefined) return pick(routes.collection);
    if (id === "bulk" && sub === undefined) return pick(routes.bulk);
    if (sub === "publish") return pick(routes.publishToggle, { id });
    if (sub === undefined) return pick(routes.item, { id });
  }
  if (resource === "gallery-categories") {
    if (id === undefined) return pick(routes.categoryCollection);
    if (sub === undefined) return pick(routes.categoryItem, { id });
  }
  return null;
}

export function createRouteFetch(config: GalleryConfig): RouteFetch {
  const routes = createGalleryRoutes(config);
  const calls: RouteCall[] = [];

  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(rawUrl, "http://localhost");
    const method = (init?.method ?? "GET").toUpperCase();
    const resolved = resolveRoute(routes, method, url.pathname);
    if (!resolved) {
      calls.push({ method, path: url.pathname, status: 404, body: null });
      return new Response(JSON.stringify({ success: false, error: "NoRoute" }), { status: 404 });
    }

    const request = new Request(url.href, {
      method,
      headers: init?.headers,
      body: init?.body ?? undefined,
    });
    const routeCtx = resolved.params ? { params: Promise.resolve(resolved.params) } : undefined;
    const response = await resolved.handler(request as any, routeCtx);

    let body: unknown = null;
    try {
      body = await response.clone().json();
    } catch {
      body = null;
    }
    calls.push({ method, path: url.pathname, status: response.status, body });
    return response;
  }) as typeof fetch;

  return { fetch: fn, routes, calls };
}
