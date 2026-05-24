import type { NextRequest } from "next/server";

/** gallery-kit 이 PrismaClient 에서 사용하는 메서드만 명시 (structural typing).
 *  host 는 자기 PrismaClient 를 그대로 주입. modelName 가변성을 위해 delegate 는 index 로 접근. */
export interface PrismaLike {
  $transaction<T>(operations: Promise<T>[]): Promise<T[]>;
  $transaction<T>(fn: (tx: PrismaLike) => Promise<T>): Promise<T>;
  readonly [delegate: string]: any;
}

/** gallery-kit route handler 가 사용하는 컨텍스트.
 *  host 의 미들웨어가 IApiContext 호환 객체를 만들어 handler 에 전달한다고 가정. */
export interface ApiContext {
  request: NextRequest;
  user?: { id: string; [key: string]: unknown };
  /** Next 16 dynamic route 의 params (이미 await 된 형태) */
  params?: Record<string, string>;
}

/** Next.js route handler 시그니처 (Next 16) */
export type RouteHandler = (
  req: NextRequest,
  routeCtx?: { params: Promise<Record<string, string>> },
) => Promise<Response>;

/** host 가 제공하는 API 미들웨어 래퍼 형태 (ballet 의 withAdminApi 와 동일 패턴) */
export type ApiWrapper = (
  handler: (ctx: ApiContext) => Promise<Response>,
) => RouteHandler;
