# @withwiz/gallery 테스트 분류 체계

## 개요

| 항목 | 내용 |
|------|------|
| 대상 | `@withwiz/gallery` 0.2.1 headless 갤러리 모듈 (서버 계층, React 컴포넌트·훅, ballet 프리셋). 2026-09-16 판은 0.2.1 에 결함 수정 3건을 더한 브랜치 `fix/residual-defects` 기준이며 버전은 올리지 않았다 |
| 범위 | `src/` 전체 (errors, config, utils, validators, services, server, hooks, components, presets). `prisma/` 스키마와 SQL 마이그레이션은 테스트 대상에서 제외 |
| 환경 | Vitest 4.1.7 (설치본, `package.json` 범위 `^4.1.5`) + jsdom 29.1.1 + @testing-library/react 16.3.2 + @vitejs/plugin-react 6.0.2, React 19.2.6, zod 4.4.3, Node v22.22.0. `vitest.config.ts`: `environment: "jsdom"`, `globals: false`, `include: tests/**/*.test.{ts,tsx}`, `setupFiles: tests/setup.ts` (테스트마다 `cleanup()`) |
| 목표 커버리지 | 미설정 (`vitest.config.ts` 에 coverage 설정이 없고, coverage provider 패키지도 devDependencies 에 없음) |
| 실측 기준 | 2026-09-16, 브랜치 `fix/residual-defects` (develop `7d439ed` 에서 분기, 결함 수정 커밋 `bf72aa8`·`e9cbd7a`·`addd6b7` 이후), `package-lock.json` 기준 `npm ci` 후 `npm test` (`vitest run`) |
| 실행 결과 | 테스트 파일 26개 통과 / 테스트 273건: 통과 273, 실패 0, 스킵 0 (소요 2.24s) |
| ID 체계 | 2026-09-13 판에서 SC/TC ID 를 처음 부여. 갱신할 때는 기존 번호를 유지하고, 새 항목은 도메인별 번호를 이어서 부여 |
| 문서 이력 | 2026-09-13 0.2.0 (`29fd94c`) 기준 최초 작성: 테스트 파일 23개, 244건, SC/TC 50개 (✅ 34 / 🔲 16). 2026-09-15 0.2.1 기준 갱신: 부분 수정 스키마 결함 수정(`d4c3134`)과 회귀 테스트 4건을 반영하고 TC-A-006 을 🔲 계획에서 ✅ 완료로 전환 (248건, ✅ 35 / 🔲 15). 2026-09-16 결함 수정 반영: 관리자 컴포넌트의 응답 형식 해석(`bf72aa8`), 업로드 함수 전달(`e9cbd7a`), 폼 컨트롤 이름과 목록 항목 키보드 선택(`addd6b7`)을 수정하고, TC-I-005·TC-I-006·TC-AC-006 을 ✅ 완료로 전환하고 TC-U-019·TC-E-001 을 구현 (파일 26개, 273건, ✅ 40 / 🔲 10) |

### 분류 원칙

- 테스트 케이스(`it`) 하나는 TC 하나에만 배정한다. 따라서 도메인별 테스트 수를 더하면 실측 합계 273건과 같다.
- `tests/helpers/` 의 `in-memory-prisma.ts`(메모리 기반 Prisma 가짜 객체)와 `route-fetch.ts`(fetch → 실제 라우트 핸들러 어댑터)는 2026-09-16 에 추가한 테스트 도우미이며 테스트 파일이 아니다.
- 테스트 파일은 이동하지 않는다. 한 파일에 여러 도메인이 섞인 `tests/validators/index.test.ts` 와 `tests/server/route-handlers.test.ts` 는 테스트 이름 필터(`-t`)로 도메인을 구분한다.
- 보안 강화 커밋 `82f081f` 에서 추가된 검증(프로토콜·호스트 allowlist, imageKey 형식, 권한 훅, 입력 크기 제한)과 인증 누락 401 검증은 Security 로 재분류한다.
- 도메인 경계는 다음 기준을 따른다.
  - Unit: 모듈 하나를 Prisma delegate·fetch 모의 객체로 격리한 검증
  - Integration: 두 개 이상 모듈을 실제 구현으로 결합한 흐름
  - API: `createGalleryRoutes` 가 반환하는 라우트 핸들러의 HTTP 상태·응답 계약
  - E2E: 관리자 컴포넌트를 fetch 어댑터로 실제 라우트 핸들러·서비스·메모리 기반 Prisma 가짜 객체에 연결한 화면 왕복 흐름 (jsdom 범위)
  - Security: 입력 검증, 인가, 자원 사용 제한
  - Accessibility: ARIA 역할·상태·이름, 키보드 조작
  - Smoke: 공개 진입점 export 와 빌드 산출물
- 🔲 계획 TC 가운데 "결함 확인용"으로 표시한 항목은 2026-09-13 에 워크트리 밖 임시 테스트로 실제 소스를 실행해 현재 동작을 확인했다. 이 항목들은 계획 당시 예상 결과(목표 동작)와 코드 동작이 달라서 두 가지를 모두 기재했다.
- 결함이 수정되어 회귀 테스트가 추가된 결함 확인용 TC 는 ✅ 완료로 전환하고, 단계와 예상 결과를 실제 테스트 기준으로 다시 쓴다. 결함 당시의 동작은 해당 TC 의 "결함 이력"에 남긴다. 전환 대상은 2026-09-15 의 TC-A-006 과 2026-09-16 의 TC-I-005·TC-I-006·TC-AC-006 으로 모두 네 건이며, 남은 결함 확인용 TC 는 없다.

---

## 시나리오 목록

| ID | 시나리오 | 유형 | 우선순위 | 상태 |
|----|---------|------|---------|------|
| SC-U-001 | typed error 클래스 계층 검증 (오류 처리) | Unit | High | ✅ 완료 |
| SC-U-002 | 설정 DI 등록·조회·초기화 검증 | Unit | Medium | ✅ 완료 |
| SC-U-003 | 클래스 병합·이미지 variant URL 유틸 검증 | Unit | Low | ✅ 완료 |
| SC-U-004 | 페이지네이션 메타 계산 검증 | Unit | High | ✅ 완료 |
| SC-U-005 | API 요청 파싱·검증 헬퍼 검증 | Unit | High | ✅ 완료 |
| SC-U-006 | 갤러리 입력 스키마 검증 | Unit | Critical | ✅ 완료 |
| SC-U-007 | 카테고리 입력 스키마 검증 | Unit | High | ✅ 완료 |
| SC-U-008 | 갤러리 서비스 조회·변경 검증 | Unit | Critical | ✅ 완료 |
| SC-U-009 | 카테고리 서비스 조회·변경·재정렬 검증 | Unit | High | ✅ 완료 |
| SC-U-010 | 서비스 계층 typed error 발생 검증 (오류 처리) | Unit | High | ✅ 완료 |
| SC-U-011 | 라이트박스 훅 상태·키 처리 검증 | Unit | High | ✅ 완료 |
| SC-U-012 | 이미지 드롭존 훅 파일 검증 | Unit | High | ✅ 완료 |
| SC-U-013 | 스크롤 reveal 훅 검증 | Unit | Low | ✅ 완료 |
| SC-U-014 | ToggleSwitch 동작 검증 | Unit | High | ✅ 완료 |
| SC-U-015 | ImageDropZone 동작 검증 | Unit | High | ✅ 완료 |
| SC-U-016 | GalleryManagerLayout 슬롯·클래스 병합 검증 | Unit | Medium | ✅ 완료 |
| SC-U-017 | GalleryEditForm 단일·다중 저장 검증 | Unit | High | ✅ 완료 |
| SC-U-018 | GalleryHomePreview 재정렬·별 토글 검증 | Unit | Medium | ✅ 완료 |
| SC-U-019 | GalleryEditForm 이미지 선택·업로드 오류 경로 검증 | Unit | Medium | ✅ 완료 |
| SC-I-001 | RSC 로더 → 서비스 위임 | Integration | Medium | ✅ 완료 |
| SC-I-002 | 공개 모자이크 ↔ 라이트박스·스크롤 훅 결합 | Integration | High | ✅ 완료 |
| SC-I-003 | GalleryAdminManager ↔ 설정 DI·fetch 흐름 | Integration | High | ✅ 완료 |
| SC-I-004 | CategoryAdminManager ↔ fetch·409 안내 | Integration | Medium | ✅ 완료 |
| SC-I-005 | 관리자 컴포넌트 ↔ 라우트 핸들러 응답 형식 계약 | Integration | Critical | ✅ 완료 |
| SC-I-006 | GalleryAdminManager 새 항목 생성·featured 상한 | Integration | High | ✅ 완료 |
| SC-A-001 | 갤러리 컬렉션 라우트 (GET·POST·DELETE) | API | Critical | ✅ 완료 |
| SC-A-002 | 갤러리 단건·공개 토글 라우트 | API | Critical | ✅ 완료 |
| SC-A-003 | bulk 생성·일괄 수정 라우트 | API | High | ✅ 완료 |
| SC-A-004 | 카테고리 라우트 | API | High | ✅ 완료 |
| SC-A-005 | typed error → HTTP 상태 매핑 (오류 처리) | API | High | ✅ 완료 |
| SC-A-006 | 부분 수정 PUT 의 미지정 필드 보존 | API | Critical | ✅ 완료 |
| SC-A-007 | 오류 응답 본문 계약·비매핑 예외 전파 | API | Medium | 🔲 계획 |
| SC-E-001 | 관리자 화면 ↔ 실제 라우트 핸들러 왕복 여정 | E2E | High | ✅ 완료 |
| SC-S-001 | imageUrl 프로토콜·호스트 allowlist (`javascript:`·`data:` 차단) | Security | Critical | ✅ 완료 |
| SC-S-002 | imageKey 형식 검증 (경로 순회 차단) | Security | Critical | ✅ 완료 |
| SC-S-003 | bulk 대상 전원 권한 검사 (403, 부분 성공 없음) | Security | Critical | ✅ 완료 |
| SC-S-004 | 단건 권한 훅·인증 누락 차단 | Security | Critical | ✅ 완료 |
| SC-S-005 | 카테고리 관리 권한 게이트 | Security | High | ✅ 완료 |
| SC-S-006 | 입력 크기 제한 (batchMax·search 길이) | Security | High | ✅ 완료 |
| SC-S-007 | 라우트 경유 URL·키 검증 적용 | Security | High | 🔲 계획 |
| SC-S-008 | 인증 식별자 추출·권한 검사 경계값 | Security | Medium | 🔲 계획 |
| SC-AC-001 | ToggleSwitch 스위치 역할·상태·키보드 | Accessibility | High | 🔲 계획 |
| SC-AC-002 | ImageDropZone 버튼 역할·키보드·거부 알림 | Accessibility | High | 🔲 계획 |
| SC-AC-003 | 공개 모자이크 타일·라이트박스 대화상자 | Accessibility | High | 🔲 계획 |
| SC-AC-004 | GalleryHomePreview 별 토글 상태 | Accessibility | Medium | 🔲 계획 |
| SC-AC-005 | 관리자 오류 알림·보조 버튼 이름 | Accessibility | Medium | 🔲 계획 |
| SC-AC-006 | 폼 컨트롤 접근 가능한 이름·키보드 도달성 | Accessibility | High | ✅ 완료 |
| SC-AC-007 | axe 규칙 기반 자동 검사 | Accessibility | Medium | 🔲 계획 |
| SC-SM-001 | 소스 공개 진입점 export | Smoke | Medium | ✅ 완료 |
| SC-SM-002 | 서브패스 exports·dist 산출물 | Smoke | Medium | 🔲 계획 |

SC 와 TC 는 같은 번호로 1:1 대응한다. 예를 들어 SC-U-006 의 상세 케이스는 TC-U-006 이다.

---

## 1. Unit Tests (단위 테스트)

**목적:** 오류 클래스, 설정, 유틸, 입력 스키마, 서비스, 훅, 컴포넌트를 모듈 단위로 격리해 검증한다. Prisma delegate 와 브라우저 API 는 모의 객체로 대체한다.

**실행 명령:** 도메인별 npm 스크립트가 없으므로 파일과 이름 필터를 지정해 실행한다. 아래 명령은 2026-09-16 에 파일 17개, 테스트 163건을 실행했다.

```bash
npx vitest run tests/errors.test.ts tests/config.test.ts tests/utils tests/services tests/hooks tests/validators \
  tests/components/ToggleSwitch tests/components/ImageDropZone tests/components/GalleryManagerLayout \
  tests/components/GalleryEditForm tests/components/GalleryHomePreview \
  -t '^(?!.*hardening)'
```

---

### TC-U-001: typed error 클래스 계층 (오류 처리)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/errors.test.ts` |
| **대상** | `src/errors.ts`: `GalleryError`, `GalleryNotFoundError`, `CategoryNotFoundError`, `CategoryInUseError`, `PermissionDeniedError` |
| **우선순위** | High |
| **전제조건** | 없음 (순수 클래스) |
| **테스트 데이터** | id `"g-1"`, `"c-1"`, `"c-9"`, galleryCount `3`, action `"edit"`, `"delete"` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `new GalleryError("boom")` 생성 | `Error`·`GalleryError` 인스턴스, `name === "GalleryError"`, `message === "boom"` |
| 2 | `new GalleryNotFoundError("g-1")` 생성 | `GalleryError` 상속, `id === "g-1"`, `message === "Gallery not found: g-1"` |
| 3 | 2번 객체를 `CategoryNotFoundError` 로 판별 | `instanceof` 결과 `false` (교차 클래스 음성 확인) |
| 4 | `new CategoryInUseError("c-1", 3)` 생성 | `categoryId === "c-1"`, `galleryCount === 3`, `message === "Category c-1 is in use by 3 galleries"` |
| 5 | `new PermissionDeniedError("delete", "c-9")` 생성 | `action === "delete"`, `message === "Permission denied: cannot delete c-9"` |

- **자동화:** 가능 ✅ | **테스트 수:** 7개 (2026-09-16 실측)
- **비고:** 서비스가 이 클래스를 던지는 동작은 TC-U-010, 라우트가 HTTP 상태로 변환하는 동작은 TC-A-005 에서 다룬다. `PermissionDeniedError` 는 export 만 되어 있고 라우트 핸들러에서는 사용되지 않는다. 라우트는 403 을 `jsonError(..., 403, "Forbidden")` 로 직접 반환한다.

---

### TC-U-002: 설정 DI (setGalleryConfig, getGalleryConfig, resetGalleryConfig)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/config.test.ts` |
| **대상** | `src/config.ts`: `setGalleryConfig()`, `getGalleryConfig()`, `resetGalleryConfig()` |
| **우선순위** | Medium |
| **전제조건** | `beforeEach` 에서 `resetGalleryConfig()` 호출 |
| **테스트 데이터** | `prisma: {}`, `limits: { maxFeatured: 7, mosaicCount: 7, batchMax: 20 }` 최소 설정 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 설정 전에 `getGalleryConfig()` 호출 | `/setGalleryConfig/` 를 포함한 메시지로 throw |
| 2 | `setGalleryConfig(cfg)` 후 `getGalleryConfig()` 호출 | 같은 인스턴스(`toBe`) 반환 |
| 3 | 설정 후 `resetGalleryConfig()` 를 호출하고 다시 조회 | throw |

- **자동화:** 가능 ✅ | **테스트 수:** 3개 (2026-09-16 실측)

---

### TC-U-003: 유틸 함수 (cn, getVariantUrl)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/utils/cn.test.ts`, `tests/utils/image-variants.test.ts` |
| **대상** | `src/utils/cn.ts`: `cn()`, `src/utils/image-variants.ts`: `getVariantUrl()` |
| **우선순위** | Low |
| **전제조건** | 없음 (순수 함수) |
| **테스트 데이터** | `"p-2"`, `"p-4"`, `https://cdn.example.com/abc.webp`, `/uploads/x.jpg` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `cn("p-2", "p-4")` 호출 | `"p-4"` (tailwind-merge 가 충돌 클래스를 정리) |
| 2 | `cn("base", false && "hidden", true && "shown")` 호출 | 결과에 `"shown"` 포함 |
| 3 | `getVariantUrl("https://cdn.example.com/abc.webp", "md")` 호출 | `"https://cdn.example.com/abc_md.webp"` |
| 4 | 같은 URL 에 variant `"lg"` 지정 | 원본 URL 그대로 반환 |
| 5 | 확장자 없는 `"https://cdn.example.com/abc"` 에 `"sm"` 지정 | 원본 URL 그대로 반환 |
| 6 | `getVariantUrl("/uploads/x.jpg", "thumb")` 호출 | `"/uploads/x_thumb.jpg"` |

- **자동화:** 가능 ✅ | **테스트 수:** 6개 (cn 2 + image-variants 4, 2026-09-16 실측)

---

### TC-U-004: 페이지네이션 메타 계산 (buildPaginatedResult)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/services/helpers.test.ts` |
| **대상** | `src/services/helpers.ts`: `buildPaginatedResult()` |
| **우선순위** | High |
| **전제조건** | 없음 (순수 함수) |
| **테스트 데이터** | `(items, page, limit, total)` 조합 5종 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `([1,2,3], 1, 3, 9)` 계산 | `totalPages 3`, `hasNext true`, `hasPrev false` |
| 2 | 마지막 부분 페이지 `([7], 3, 3, 7)` 계산 | `totalPages 3`, `hasNext false`, `hasPrev true` |
| 3 | 빈 결과 `([], 1, 10, 0)` 계산 | `totalPages 0`, `hasNext false`, `hasPrev false` |
| 4 | `([1], 2, 1, 3)` 계산 | `hasPrev true`, `hasNext true` |
| 5 | 나누어떨어지는 `([1,2], 5, 2, 10)` 계산 | `totalPages 5`, `hasNext false` |

- **자동화:** 가능 ✅ | **테스트 수:** 5개 (2026-09-16 실측)

---

### TC-U-005: API 요청 헬퍼 (parsePagination, getSearchParam, validateAndParse, validateIds, parseSortKey)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/utils/api-helpers.test.ts` |
| **대상** | `src/utils/api-helpers.ts`: `parsePagination()`, `getSearchParam()`, `validateAndParse()`, `validateIds()`, `parseSortKey()` |
| **우선순위** | High |
| **전제조건** | `{ url }` 형태의 요청 모의 객체, zod 스키마 `z.object({ name: z.string() })` |
| **테스트 데이터** | `https://x.com/api?page=-1&limit=9999`, cuid `clxxxxxxxxxxxxxxxxxxxxxxx`, `sortBy=evil` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 쿼리 없는 URL 로 `parsePagination` 호출 | `{ page: 1, limit: 20 }` |
| 2 | `?page=-1&limit=9999` 로 호출 | `{ page: 1, limit: 100 }` (음수 보정, 상한 100) |
| 3 | `getSearchParam(req, "q")` 를 쿼리 없는 URL 로 호출 | `undefined` |
| 4 | `validateAndParse(schema, { name: 1 })` 호출 | `success false`, `response.status === 400` |
| 5 | `validateIds("nope")`, `validateIds([])` 호출 | 둘 다 `valid false` |
| 6 | `parseSortKey(sortBy=evil, ["createdAt","sortOrder"], "sortOrder")` 호출 | 허용 목록 밖이므로 `"sortOrder"` |

- **자동화:** 가능 ✅ | **테스트 수:** 12개 (2026-09-16 실측)

---

### TC-U-006: 갤러리 입력 스키마 (CreateGallerySchema, UpdateGallerySchema, BatchCreateGallerySchema, BulkUpdateSchema)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/validators/index.test.ts` (이름에 `hardening` 이 들어간 describe 블록 제외) |
| **대상** | `src/validators/index.ts`: `createGallerySchemas()` 가 반환하는 갤러리 스키마 4종 |
| **우선순위** | Critical |
| **전제조건** | `batchMax 20`, `captionMaxLength 200` 기본 옵션 (케이스별로 변경) |
| **테스트 데이터** | 25자 cuid `clxxxxxxxxxxxxxxxxxxxxxxx`, `https://cdn.example.com/a.webp` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `createGallerySchemas()` 반환값의 키 확인 | 스키마 7개 모두 정의됨 |
| 2 | 최소 페이로드(imageUrl + categoryId) 파싱 | 성공, 기본값 `sortOrder 0`, `featured false`, `published false` |
| 3 | `captionMaxLength: 10` 에서 11자 caption, `categoryId: "not-cuid"`, `sortOrder: -1` 을 각각 파싱 | 모두 실패 |
| 4 | `UpdateGallerySchema` 에 `{}` 와 `{ imageUrl: "nope" }` 파싱 | 빈 객체는 성공, 형식 오류는 실패 |
| 5 | `UpdateGallerySchema` 에 `{ caption: "new caption" }` 파싱 | 성공, 결과가 `{ caption: "new caption" }` 와 정확히 일치 (`toStrictEqual`, Create 기본값 `sortOrder`·`featured`·`published` 미적용) |
| 6 | `batchMax: 2` 에서 items 3개, 그리고 빈 items 파싱 | 둘 다 실패 |
| 7 | `BulkUpdateSchema` 에 `ids: ["xxx"]`, 그리고 `batchMax: 1` 에서 ids 2개 파싱 | 둘 다 실패 |

- **자동화:** 가능 ✅ | **테스트 수:** 18개 (2026-09-16 실측)
- **비고:** 0.2.1 부터 `UpdateGallerySchema` 는 기본값이 없는 공통 필드 정의(`galleryFields`)에 `.partial()` 을 적용해 만들고, 기본값은 `CreateGallerySchema` 에만 지정한다 (`src/validators/index.ts:72-92`). 5번은 이 수정과 함께 추가된 회귀 테스트이다 (`UpdateGallerySchema > does not fill create defaults for omitted fields`). 같은 결함을 라우트 경유로 확인하는 테스트는 TC-A-006 에 배정했다.

---

### TC-U-007: 카테고리 입력 스키마 (CreateCategorySchema, UpdateCategorySchema, ReorderCategorySchema)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/validators/index.test.ts` |
| **대상** | `src/validators/index.ts`: `CreateCategorySchema`, `UpdateCategorySchema`, `ReorderCategorySchema` |
| **우선순위** | High |
| **전제조건** | 없음 (순수 스키마) |
| **테스트 데이터** | slug `"PERFORMANCE"`, `"A1_B2"`, `"performance"`, `"1ABC"`, `"A".repeat(65)` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `{ slug: "PERFORMANCE", labelKo: "공연" }` 파싱 | 성공, 기본값 `sortOrder 0`, `isActive true` |
| 2 | `slug: "A1_B2"` 파싱 | 성공 |
| 3 | `slug` 를 `"performance"`, `"1ABC"`, 65자로 각각 파싱 | 모두 실패 (정규식 `^[A-Z][A-Z0-9_]*$`, 최대 64자) |
| 4 | `labelKo: ""` 파싱 | 실패 |
| 5 | `UpdateCategorySchema` 에 `{ slug: "lower" }` 파싱 | 실패 (부분 스키마에서도 형식 검증 유지) |
| 6 | `UpdateCategorySchema` 에 `{ labelKo: "수정" }` 파싱 | 성공, 결과가 `{ labelKo: "수정" }` 와 정확히 일치 (`toStrictEqual`, Create 기본값 `sortOrder`·`isActive` 미적용) |
| 7 | `ReorderCategorySchema` 에 `ids: []`, `ids: ["x"]` 파싱 | 둘 다 실패 |

- **자동화:** 가능 ✅ | **테스트 수:** 13개 (2026-09-16 실측)
- **비고:** 0.2.1 부터 `UpdateCategorySchema` 는 기본값이 없는 공통 필드 정의(`categoryFields`)에 `.partial()` 을 적용해 만들고, 기본값은 `CreateCategorySchema` 에만 지정한다 (`src/validators/index.ts:104-122`). 6번은 이 수정과 함께 추가된 회귀 테스트이다 (`UpdateCategorySchema > does not fill create defaults for omitted fields`).

---

### TC-U-008: 갤러리 서비스 조회·변경 (createGalleryService)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/services/gallery-service.test.ts` (togglePublish 오류 케이스 2건 제외) |
| **대상** | `src/services/index.ts`: `createGalleryService()` 의 `listFeatured`, `listPublished`, `listPublishedByCategory`, `listAll`, `getById`, `create`, `createMany`, `update`, `remove`, `removeMany`, `bulkUpdatePublished`, `bulkUpdateFeatured`, `togglePublish`(정상), `count`, `listRecent` |
| **우선순위** | Critical |
| **전제조건** | gallery delegate 모의 객체(`findMany` 등 `vi.fn` 9개), `$transaction` 은 `Promise.all`, `storage` 모의 객체(`isEnabled`, `collectKeys`, `deleteKeys`) |
| **테스트 데이터** | `listAll({ page: 2, limit: 2, categoryId: "catX", published: true, search: "tour" })`, count `7`, imageKey `"abc.webp"` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `listFeatured(5)` 호출 | `where { published: true, featured: true }`, `include { category: true }`, `take 5` |
| 2 | 테스트 데이터로 `listAll` 호출 (count 7) | `skip 2`, `take 2`, caption 조건 `{ contains: "tour", mode: "insensitive" }`, `meta.totalPages 4`, `hasNext`·`hasPrev` 모두 true |
| 3 | `listAll({})` 호출 | `orderBy [{ sortOrder: "asc" }, { createdAt: "desc" }]`, `include` 에 `author` 없음 |
| 4 | `create({ imageUrl, categoryId }, "user-1")` 호출 | `authorId "user-1"`, 기본값 `sortOrder 0`·`featured false`·`published false` |
| 5 | storage 활성 상태에서 `remove("g1")` 호출 | `delete({ where: { id: "g1" } })` 후 `collectKeys("abc.webp")`, `deleteKeys` 호출 |
| 6 | `modelName: "photo"` 설정 후 `listPublished()` 호출 | `prisma.photo.findMany` 호출 |

- **자동화:** 가능 ✅ | **테스트 수:** 23개 (2026-09-16 실측)

---

### TC-U-009: 카테고리 서비스 조회·변경·재정렬 (createCategoryService)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/services/category-service.test.ts` (CategoryInUseError 케이스 2건 제외) |
| **대상** | `src/services/category-service.ts`: `list`, `getBySlug`, `getById`, `create`, `update`, `remove`(미사용 카테고리), `reorder` |
| **우선순위** | High |
| **전제조건** | galleryCategory delegate 모의 객체, `gallery.count` 모의 함수, `$transaction` 은 `Promise.all` |
| **테스트 데이터** | slug `"PERFORMANCE"`, id `"c1"`~`"c3"` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `list({ isActive: true })` 호출 | `findMany` 인자에 `where { isActive: true }` |
| 2 | `getBySlug("PERFORMANCE")` 호출 | `findUnique({ where: { slug: "PERFORMANCE" } })` |
| 3 | `update("c1", { labelKo: "갱신" })` 호출 | `update({ where: { id: "c1" }, data: { labelKo: "갱신" } })` |
| 4 | gallery count 0 에서 `remove("c1")` 호출 | `delete({ where: { id: "c1" } })` 호출 |
| 5 | `reorder(["c1","c2","c3"])` 호출 | `update` 3회, 첫 호출 `sortOrder 0`, 세 번째 호출 `sortOrder 2` |
| 6 | `categoryModelName: "customCategory"` 설정 후 `list()` 호출 | `prisma.customCategory.findMany` 호출 |

- **자동화:** 가능 ✅ | **테스트 수:** 9개 (2026-09-16 실측)

---

### TC-U-010: 서비스 계층 typed error 발생 (오류 처리)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/services/gallery-service.test.ts`, `tests/services/category-service.test.ts` |
| **대상** | `createGalleryService().togglePublish()` 의 `GalleryNotFoundError`, `createCategoryService().remove()` 의 `CategoryInUseError` |
| **우선순위** | High |
| **전제조건** | `findUnique` 가 `null` 반환, 또는 `gallery.count` 가 `3` 반환 |
| **테스트 데이터** | id `"missing"`, `"missing-id-xyz"`, `"c1"` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `findUnique → null` 에서 `togglePublish("missing")` 호출 | `GalleryNotFoundError` 인스턴스로 reject |
| 2 | `togglePublish("missing-id-xyz")` 가 던진 오류 확인 | `id === "missing-id-xyz"` |
| 3 | count 3 에서 `remove("c1")` 호출 | `CategoryInUseError` 로 reject, `delete` 미호출 |
| 4 | 3번 오류 객체의 필드 확인 | `categoryId === "c1"`, `galleryCount === 3` |

- **자동화:** 가능 ✅ | **테스트 수:** 4개 (gallery-service 2 + category-service 2, 2026-09-16 실측)
- **비고:** 이 테스트는 오류 메시지 문구가 아니라 `toBeInstanceOf` 와 데이터 필드로 판별한다. 따라서 메시지 문구가 바뀌어도 판별 결과가 유지된다.

---

### TC-U-011: 라이트박스 훅 (useGalleryLightbox)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/hooks/useGalleryLightbox.test.tsx` |
| **대상** | `src/hooks/useGalleryLightbox.ts` |
| **우선순위** | High |
| **전제조건** | 훅 상태를 `useEffect` 로 외부 변수에 기록하는 Harness 컴포넌트 |
| **테스트 데이터** | 이미지 3개 `/img0.jpg`~`/img2.jpg` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 초기 렌더 | `isOpen false`, `current null`, `currentIndex -1` |
| 2 | `open(1)` 호출 | `isOpen true`, `currentIndex 1`, `current.src "/img1.jpg"` |
| 3 | `open(2)` 후 `next()`, `open(0)` 후 `prev()` | 각각 `currentIndex 0`, `2` (순환) |
| 4 | 빈 images 에서 `open(0)` 호출 | `isOpen false` 유지 |
| 5 | 열린 상태에서 window 에 `ArrowRight`, `ArrowLeft`, `Escape` keydown 발생 | 인덱스 1 → 2 → 1 이동, `Escape` 에서 닫힘 |
| 6 | `close()` 후 `ArrowRight` keydown 발생 | `currentIndex -1` 유지 (리스너 해제) |

- **자동화:** 가능 ✅ | **테스트 수:** 9개 (2026-09-16 실측)

---

### TC-U-012: 이미지 드롭존 훅 (useImageDropZone)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/hooks/useImageDropZone.test.tsx` |
| **대상** | `src/hooks/useImageDropZone.ts` |
| **우선순위** | High |
| **전제조건** | `dropProps`·`inputProps` 를 DOM 에 전개한 Harness, `DataTransfer` 모의 객체 |
| **테스트 데이터** | `a.png`(image/png, 1024B), `a.gif`(image/gif), `big.png`(2048B) |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 허용 MIME 파일 drop | `onFiles([file])`, `rejectedReasons []` |
| 2 | `accept: ["image/png"]` 에 gif drop | `onFiles` 미호출, 첫 사유에 `a.gif` 포함 |
| 3 | `maxSize: 1024` 에 2048B 파일 drop | 거부, 사유에 `big.png` 포함 |
| 4 | `multiple: false` 에 파일 2개 drop | 첫 파일만 `onFiles` 로 전달 |
| 5 | `validate` 가 `{ ok: false, reason: "너무 작아요" }` 반환 | `onFiles` 미호출, 사유에 `너무 작아요` 포함 |
| 6 | 거부된 drop 이후 허용 파일 drop | `rejectedReasons` 초기화, `onFiles` 1회 |

- **자동화:** 가능 ✅ | **테스트 수:** 9개 (2026-09-16 실측)

---

### TC-U-013: 스크롤 reveal 훅 (useScrollReveal)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/hooks/useScrollReveal.test.tsx` |
| **대상** | `src/hooks/useScrollReveal.ts` |
| **우선순위** | Low |
| **전제조건** | `globalThis.IntersectionObserver` 를 `MockIntersectionObserver` 로 교체 |
| **테스트 데이터** | `threshold: 0.5`, `once: false` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 마운트 | `isVisible false`, observer 1개가 요소 1개를 observe |
| 2 | 기본 옵션에서 `isIntersecting: true` 통지 | `isVisible true`, 해당 요소 `unobserve` |
| 3 | `once: false` 에서 true 통지 후 false 통지 | `isVisible` 이 true 에서 false 로 변경, `unobserve` 0회 |
| 4 | `threshold: 0.5` 지정 | 생성자 옵션이 `{ threshold: 0.5 }` |
| 5 | unmount | `disconnect()` 호출 |

- **자동화:** 가능 ✅ | **테스트 수:** 6개 (2026-09-16 실측)

---

### TC-U-014: ToggleSwitch 동작

| 항목 | 내용 |
|------|------|
| **파일** | `tests/components/ToggleSwitch.test.tsx` |
| **대상** | `src/components/ToggleSwitch.tsx` |
| **우선순위** | High |
| **전제조건** | 없음 (props 만 사용) |
| **테스트 데이터** | `label="Published"`, `size="lg"` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `checked={false}` 에서 클릭 | `onChange(true)` |
| 2 | `checked={true}` 렌더 후 클릭 | `aria-checked="true"`, `onChange(false)` |
| 3 | `disabled` 에서 클릭 | `onChange` 미호출 |
| 4 | keyDown `" "`, `"Enter"` 발생 | 각각 `onChange(true)` |
| 5 | `label="Published"` 지정 | `aria-label="Published"`, 화면에 텍스트 노출 |
| 6 | `size="lg"`, `checked={true}` 지정 | 루트에 `gallery-toggle--lg`, 트랙에 `gallery-toggle--checked` 클래스 |

- **자동화:** 가능 ✅ | **테스트 수:** 8개 (2026-09-16 실측)
- **비고:** 기능 테스트 안에 `aria-checked`, `aria-label` 단언이 일부 포함되어 있지만 접근성 전용 검증은 아니다. 검증되지 않은 속성과 조건은 TC-AC-001 에 정리한다.

---

### TC-U-015: ImageDropZone 동작

| 항목 | 내용 |
|------|------|
| **파일** | `tests/components/ImageDropZone.test.tsx` |
| **대상** | `src/components/ImageDropZone.tsx` |
| **우선순위** | High |
| **전제조건** | `DataTransfer` 모의 객체 |
| **테스트 데이터** | `a.png`, `a.gif`, `previewUrl="/preview.jpg"`, `i18n.dropPrompt="여기에 이미지를 놓으세요"` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 기본 렌더 | `/Drop image here/i` 텍스트 노출 |
| 2 | `i18n.dropPrompt` 지정 | 지정한 문구로 대체 |
| 3 | `previewUrl` 지정 | `.gallery-dropzone__preview` 이미지 `src="/preview.jpg"` |
| 4 | dragEnter 후 dragLeave 발생 | `gallery-dropzone--dragging` 클래스가 추가된 뒤 제거 |
| 5 | `accept={["image/png"]}` 에 gif drop | `role="alert"` 영역 노출 |
| 6 | `disabled` 에서 png drop | `aria-disabled="true"`, `onFiles` 미호출 |

- **자동화:** 가능 ✅ | **테스트 수:** 7개 (2026-09-16 실측)

---

### TC-U-016: GalleryManagerLayout 슬롯·클래스 병합

| 항목 | 내용 |
|------|------|
| **파일** | `tests/components/GalleryManagerLayout.test.tsx` |
| **대상** | `src/components/GalleryManagerLayout.tsx` |
| **우선순위** | Medium |
| **전제조건** | 없음 (props 로 ReactNode 전달) |
| **테스트 데이터** | `data-testid` 가 지정된 영역별 div, `ui.classNames.managerRoot="host-root-override"` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | listRoot·filterControls·toolbar·editForm·homePreview 전달 | 5개 영역 모두 렌더 |
| 2 | `editForm={null}` 과 `emptyState` 전달 | emptyState 렌더, edit 영역 없음 |
| 3 | `editForm={null}` 과 `i18n["admin.emptyState"]` 전달 | `.gallery-manager__empty` 텍스트가 i18n 값 |
| 4 | `ui.classNames.managerRoot` 전달 | 루트 className 에 병합 |
| 5 | `ui.slots.managerToolbar` 와 `toolbar` prop 동시 전달 | slot 이 우선, prop 은 렌더되지 않음 |
| 6 | homePreview 미전달 | `.gallery-manager__preview` 미렌더 |

- **자동화:** 가능 ✅ | **테스트 수:** 7개 (2026-09-16 실측)

---

### TC-U-017: GalleryEditForm 단일·다중 저장

| 항목 | 내용 |
|------|------|
| **파일** | `tests/components/GalleryEditForm.test.tsx` |
| **대상** | `src/components/GalleryEditForm.tsx` |
| **우선순위** | High |
| **전제조건** | 카테고리 2개(`cat-perf`, `cat-reh`) |
| **테스트 데이터** | 편집 대상 `g-1` (caption `원본 캡션`), 다중 모드 파일 `a.jpg`, `b.jpg` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 새 모드(`value={null}`)에서 이미지 없이 Save 클릭 | `onSubmit` 미호출 |
| 2 | 편집 모드에서 caption 변경 후 Save | payload `caption "수정된 캡션"`, 기존 `imageUrl`·`categoryId` 유지 |
| 3 | `canToggleFeatured={false}`, featured false 로 렌더 | featured 스위치 `aria-disabled="true"` |
| 4 | `canToggleFeatured={false}`, featured true 에서 스위치 클릭 후 Save | payload `featured false` (해제는 허용) |
| 5 | category select 에서 `cat-reh` 선택 후 Save | option 2개, payload `categoryId "cat-reh"` |
| 6 | `multipleMode` 에서 파일 2개 선택, caption `공통`, sortOrder `10` 입력 후 Save | `onSubmitMany` 항목 caption `공통_1`·`공통_2`, sortOrder `10`·`11` |

- **자동화:** 가능 ✅ | **테스트 수:** 7개 (2026-09-16 실측)
- **비고:** 1번 테스트 이름은 "저장 시 onSubmit 호출 payload 검증"이지만 실제 단언은 `onSubmit` 미호출이다. 이름과 단언이 일치하지 않으므로 리뷰 체크리스트에 정리 항목으로 남긴다. 같은 조건에서 표시되는 오류 문구는 2026-09-16 에 구현한 TC-U-019 2번이 단언한다.

---

### TC-U-018: GalleryHomePreview 재정렬·별 토글

| 항목 | 내용 |
|------|------|
| **파일** | `tests/components/GalleryHomePreview.test.tsx` |
| **대상** | `src/components/GalleryHomePreview.tsx` |
| **우선순위** | Medium |
| **전제조건** | drag 이벤트용 `dataTransfer` 모의 객체 |
| **테스트 데이터** | 항목 `a`, `b`, `c` (sortOrder 0~2) |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | items 0개 렌더 | `.gallery-home-preview__mosaic` 없음, 빈 상태 안내 표시 |
| 2 | items 3개, `maxCount 7` 렌더 | 모자이크 `data-count="7"` |
| 3 | featured 항목의 별 버튼 클릭 | `onToggleFeatured("a", false)` |
| 4 | 타일 0 을 타일 2 로 dragStart → dragOver → drop → dragEnd | `onReorder(["c","b","a"])` 1회 |
| 5 | 같은 위치에 drop | `onReorder` 미호출 |

- **자동화:** 가능 ✅ | **테스트 수:** 5개 (2026-09-16 실측)

---

### TC-U-019: GalleryEditForm 이미지 선택·업로드 오류 경로

| 항목 | 내용 |
|------|------|
| **파일** | `tests/components/GalleryEditForm.test.tsx` (`GalleryEditForm — TC-U-019 이미지 선택·업로드 오류 경로` 블록) |
| **대상** | `src/components/GalleryEditForm.tsx:171-236` (`handleFiles`, `handleSubmit`), `:326-344` (다중 이미지 제거 버튼) |
| **우선순위** | Medium |
| **전제조건** | 카테고리 2개(`cat-perf`, `cat-reh`), 드롭존에 `DataTransfer` 모의 객체로 drop |
| **테스트 데이터** | `a.png`, `up.png`, `1.png`~`3.png`. `onImageSelect` 는 `{ url, key }` 를 반환하거나 `Error("upload failed")` 로 reject |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 새 모드, `onImageSelect` 미전달 상태에서 `a.png` drop | `role="alert"` 텍스트가 `onImageSelect prop missing — host must provide upload handler` |
| 2 | 새 모드에서 이미지 없이 Save 클릭 | `role="alert"` 텍스트가 `Image is required`, `onSubmit` 미호출 |
| 3 | `onImageSelect` 가 `Error("upload failed")` 로 reject | `role="alert"` 텍스트가 `upload failed`, 드롭존 미리보기 없음 |
| 4 | 단일 모드에서 `onImageSelect` 가 `{ url: "https://cdn.test/up.png", key: "gallery/up.png" }` 반환 후 Save | 미리보기 `src` 가 반환 URL, `onSubmit` 1회, payload 의 `imageUrl`·`imageKey` 가 반환값과 같음 |
| 5 | 다중 모드에서 이미지 3개 drop 후 첫 제거 버튼(`aria-label="remove"`) 클릭 | 타일이 3개에서 2개로 줄고, 드롭존 미리보기 `src` 가 `https://cdn.test/2.png` |

- **자동화:** 가능 ✅ | **테스트 수:** 5개 (2026-09-16 실측)
- **비고:** 2026-09-16 에 `GalleryAdminManager` 의 업로드 함수 전달 결함(TC-I-006)을 수정하면서, 편집 폼 쪽 업로드 경로를 함께 고정하려고 구현했다. 5건 모두 결함이 없던 기존 `GalleryEditForm` 동작을 확인하므로 수정 전 코드에서도 통과한다. 1번 오류 문구는 편집 폼을 단독으로 쓰거나 `GalleryAdminManager` 에 `onImageSelect` 를 전달하지 않았을 때 표시된다.

---

## 2. Integration Tests (통합 테스트)

**목적:** 실제 구현끼리 결합한 흐름을 검증한다. 대상은 로더와 서비스, 공개 프리셋과 훅, 관리자 컴포넌트와 설정 DI·fetch, 관리자 컴포넌트와 실제 라우트 핸들러이다. TC-I-005 를 제외하면 Prisma delegate 와 fetch 응답은 모의 객체를 사용한다. TC-I-005 는 fetch 를 `createGalleryRoutes` 핸들러에 연결하고 메모리 기반 Prisma 가짜 객체를 사용한다.

**실행 명령:** 아래 명령은 2026-09-16 에 파일 5개, 테스트 34건을 실행했다.

```bash
npx vitest run tests/server/loaders tests/presets/ballet tests/components/GalleryAdminManager tests/components/CategoryAdminManager \
  tests/integration
```

---

### TC-I-001: RSC 로더 → 서비스 위임

| 항목 | 내용 |
|------|------|
| **파일** | `tests/server/loaders.test.ts` |
| **대상** | `src/server/loaders.ts`: `getGalleryItems`, `getFeaturedGalleries`, `getRecentGalleries`, `getGalleryCount` 와 실제 `createGalleryService` |
| **우선순위** | Medium |
| **전제조건** | gallery delegate 의 `findMany`·`count` 만 모의, 서비스는 실제 구현 |
| **테스트 데이터** | `{ page: 2, limit: 2 }` + count 20, `{ categoryId: "cat-x", published: true, search: "blue" }` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `getGalleryItems(config, { page: 2, limit: 2 })` 호출 (count 20) | `meta.page 2`, `limit 2`, `total 20`, `totalPages 10` |
| 2 | `getGalleryItems` 에 categoryId·published·search 전달 | `findMany` 의 where 에 세 조건 반영 |
| 3 | `getFeaturedGalleries(config, 7)` 과 limit 생략 호출 | `take 7`, 생략 시 `take` 없음 |
| 4 | `getRecentGalleries(config, 5)` 호출 | `orderBy { createdAt: "desc" }`, `take 5` |
| 5 | `getGalleryCount(config, { published: true })` 호출 | `count({ where: { published: true } })`, 반환값 11 |

- **자동화:** 가능 ✅ | **테스트 수:** 7개 (2026-09-16 실측)

---

### TC-I-002: 공개 모자이크 ↔ 라이트박스·스크롤 훅 결합 (PublicGalleryMosaic)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/presets/ballet.test.tsx` |
| **대상** | `src/presets/ballet.tsx`: `PublicGalleryMosaic` 과 `useGalleryLightbox`, `useScrollReveal` |
| **우선순위** | High |
| **전제조건** | jsdom 에 `IntersectionObserver` 가 없으므로 `useScrollReveal` 은 관찰을 건너뛴다 |
| **테스트 데이터** | `/img0.jpg`~ 이미지, alt `이미지 N` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `images={[]}` 렌더 | `container.firstChild` 가 null |
| 2 | 이미지 10개, `count={4}` 렌더 | 타일 4개, 모자이크 `data-count="4"` |
| 3 | 첫 타일 클릭 | `.gallery-lightbox` 노출, 이미지 `src "/img0.jpg"` |
| 4 | 열린 상태에서 window 에 `ArrowRight`, `Escape` keydown 발생 | `/img1.jpg` 표시, 이후 오버레이 제거 |
| 5 | 닫기 버튼 클릭, next 후 prev 버튼 클릭 | 오버레이 제거, 이미지가 `/img1.jpg` 에서 `/img0.jpg` 로 변경 |
| 6 | alt 없는 이미지와 `i18n.expandAria="확대해서 보기"` 렌더 | 타일 `aria-label="확대해서 보기"` |

- **자동화:** 가능 ✅ | **테스트 수:** 10개 (2026-09-16 실측)

---

### TC-I-003: GalleryAdminManager ↔ 설정 DI·fetch 흐름

| 항목 | 내용 |
|------|------|
| **파일** | `tests/components/GalleryAdminManager.test.tsx` |
| **대상** | `src/components/GalleryAdminManager.tsx` 와 `getGalleryConfig`, `GalleryManagerLayout`, `GalleryEditForm`, `GalleryHomePreview` |
| **우선순위** | High |
| **전제조건** | `setGalleryConfig` 로 설정 주입, `vi.stubGlobal("fetch")` 모의 응답(목록 응답 `data` 를 배열로 반환), `window.confirm` 모의 |
| **테스트 데이터** | 항목 `a`, `b` (caption `cap-a` 등), 카테고리 `cat-1` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 마운트 | `/api/admin/galleries`, `/api/admin/gallery-categories` 호출, `.gallery-list-item` 2개 |
| 2 | `.gallery-manager__new-btn` 클릭 | `.gallery-edit-form` 노출 |
| 3 | `initialSelectedId="a"` 로 마운트 후 저장 버튼 클릭 | `/api/admin/galleries/a` 에 PUT 호출 |
| 4 | `initialSelectedId="a"` 로 마운트 후 삭제 버튼 클릭 (confirm true) | `/api/admin/galleries/a` 에 DELETE 호출 |
| 5 | `initialMode="new"`, 업로드 함수 없이 마운트 후 png drop, 이어서 저장 버튼 클릭 | alert 가 `onImageSelect prop missing — host must provide upload handler` 에서 `Image is required` 로 바뀌고 POST 0회 |

- **자동화:** 가능 ✅ | **테스트 수:** 5개 (2026-09-16 실측)
- **비고:** 모의 fetch 는 목록 응답 `data` 를 배열로 돌려준다. 2026-09-15 판까지 컴포넌트는 이 배열 형식만 목록으로 사용해서, 실제 `collection.GET` 형식(`data: { items, meta }`)을 받으면 목록이 비었다. 2026-09-16 수정 이후 컴포넌트는 두 형식을 모두 받으며, 실제 형식은 TC-I-005 가 검증한다. 이 파일의 1~4번은 호스트 자체 라우트처럼 배열을 반환하는 경우의 호환을 계속 확인한다.
- **테스트 변경 이력:** 5번 테스트는 2026-09-15 판까지 "새로 생성 — onSubmit 시 POST 호출" 이라는 이름으로 `typeof postCalled === "boolean"` 만 단언했다. 2026-09-16 에 업로드 함수가 없는 경로의 실제 동작을 단언하도록 바꾸고, 이름도 "새로 생성 — 업로드 함수가 없으면 저장을 막고 POST 를 호출하지 않는다" 로 맞췄다. TC 배정과 건수는 그대로이다.

---

### TC-I-004: CategoryAdminManager ↔ fetch·409 안내

| 항목 | 내용 |
|------|------|
| **파일** | `tests/components/CategoryAdminManager.test.tsx` |
| **대상** | `src/components/CategoryAdminManager.tsx` 와 `getGalleryConfig`, `ToggleSwitch` |
| **우선순위** | Medium |
| **전제조건** | `setGalleryConfig` 로 설정 주입, fetch 모의 (DELETE 는 status 409), `window.confirm` true |
| **테스트 데이터** | 카테고리 `PERFORMANCE`, `REHEARSAL`, 입력 slug `NEW_SLUG`, labelKo `한글` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 카테고리 2개 응답으로 마운트 | `.gallery-category-admin__item` 2개 |
| 2 | slug·labelKo 입력 후 저장 버튼 클릭 | POST 호출 |
| 3 | 삭제 버튼 클릭 후 409 응답 | `.gallery-category-admin__error` 노출, 문구가 `/galleries|use|사용/i` 와 일치 |

- **자동화:** 가능 ✅ | **테스트 수:** 3개 (2026-09-16 실측)

---

### TC-I-005: 관리자 컴포넌트 ↔ 라우트 핸들러 응답 형식 계약

| 항목 | 내용 |
|------|------|
| **파일** | `tests/integration/admin-route-contract.test.tsx` |
| **대상** | `GalleryAdminManager` 목록 로드 (`src/components/GalleryAdminManager.tsx:53-58` `extractListItems`, `:102-117`) ↔ `collection.GET` 응답 (`src/server/route-handlers.ts:166-175`), `CategoryAdminManager` 오류 표시 (`src/components/CategoryAdminManager.tsx:73-79` `errorMessageOf`, `:163`, `:188`) ↔ `jsonError` 본문 (`src/server/route-handlers.ts:60-65`) |
| **우선순위** | Critical |
| **전제조건** | `tests/helpers/route-fetch.ts` 의 fetch 어댑터가 URL·method 로 `createGalleryRoutes(config)` 의 실제 핸들러를 선택하고, Prisma 는 `tests/helpers/in-memory-prisma.ts` 의 메모리 기반 가짜 객체를 사용한다. 테스트용 apiWrapper 는 호스트 어댑터처럼 `routeCtx.params` 를 `ctx.params` 로 전달하고, 미인증이면 호스트 미들웨어 형식(`error: { code, message }`)의 401 을 반환한다 |
| **테스트 데이터** | 카테고리 id `cperformance0001` (스키마의 cuid 형식), 갤러리 `g1` (caption `첫 공연`), 권한 거부 설정 `permissions.canManageCategories: () => false`, 입력 slug `NEW_SLUG` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 실제 `collection.GET` 응답으로 `GalleryAdminManager` 마운트 | `.gallery-list-item` 1개, `.gallery-manager__count` 텍스트 `1`, caption `첫 공연` 표시 |
| 2 | 1번과 같은 조건에서 `GET /api/admin/galleries` 응답 본문 확인 | status 200, 본문 `{ success: true, data: { items: [g1], meta: { total: 1, ... } } }` (라우트 형식이 유지되는지 확인) |
| 3 | 사용 중인 카테고리 삭제 (실제 409) | `role="alert"` 텍스트가 `category.deleteConfirmInUse` 기본 문구, 응답 본문 `error: "CategoryInUse"` |
| 4 | 권한 거부 상태에서 카테고리 저장 (실제 403) | `role="alert"` 텍스트가 서버 `message` 값 `forbidden`, 응답 본문 `{ success: false, error: "Forbidden", message: "forbidden" }` |
| 5 | 목록 로드 후 미인증 상태로 카테고리 저장 (테스트 apiWrapper 의 401, `error: { code: "UNAUTHORIZED", message: "login required" }`) | `role="alert"` 텍스트가 `login required` (기존 `error.message` 해석 유지) |

- **자동화:** 가능 ✅ | **테스트 수:** 5개 (2026-09-16 실측)
- **결함 이력:** 2026-09-13 (0.2.0)·2026-09-15 (0.2.1) 판에서는 결함 확인용 🔲 계획 TC 였다. 당시 `GalleryAdminManager` 는 `json.data` 가 배열일 때만 목록으로 사용해서, 실제 `collection.GET` 응답을 받으면 `.gallery-list-item` 이 0개이고 `.gallery-manager__count` 는 `0` 이었다. `CategoryAdminManager` 는 `json.error.message` 만 읽었는데 라우트 본문의 `error` 는 코드 문자열이어서, 403 응답에 `Save failed (403)` 을 표시했다. 2026-09-16 커밋 `bf72aa8` 에서 라우트 응답 형식은 그대로 두고 컴포넌트 해석을 맞췄다. 목록은 `data.items` 를 읽고 기존 배열 형식도 계속 받는다. 오류 메시지는 `error.message`(호스트 미들웨어 형식)를 먼저 찾고, 없으면 최상위 `message`(라우트 형식)를 찾는다.
- **재현 확인 (2026-09-16):** 같은 브랜치에서 `src/` 변경만 되돌리고 이 파일과 TC-E-001 을 실행하면 이 TC 의 1·4번과 TC-E-001 의 1~4번, 모두 6건이 실패한다. 현재 코드에서는 모두 통과한다.
- **맞출 쪽 결정:** 라우트 응답 형식을 바꾸면 라우트를 직접 소비하는 호스트 코드에 영향을 줄 수 있으므로, 서버 형식을 기준으로 클라이언트 해석을 맞췄다. 호스트 dts-ballet-homepage 는 카테고리 라우트(`categoryCollection`, `categoryItem`)와 `CategoryAdminManager` 를 사용하고, 갤러리 목록 라우트와 관리 화면은 자체 구현을 사용한다.

---

### TC-I-006: GalleryAdminManager 새 항목 생성·featured 상한

| 항목 | 내용 |
|------|------|
| **파일** | `tests/components/GalleryAdminManager.test.tsx` (`GalleryAdminManager — TC-I-006 새 항목 생성·featured 상한` 블록) |
| **대상** | `GalleryAdminManagerProps.onImageSelect` (`src/components/GalleryAdminManager.tsx:29`) 와 `GalleryEditForm` 에 전달하는 props (`:266-284`), `canToggleFeatured` 계산 (`:276`) |
| **우선순위** | High |
| **전제조건** | `limits.maxFeatured 7`, fetch 모의 (기존 테스트와 같은 배열 형식) |
| **테스트 데이터** | png 파일 `a.png`, `onImageSelect` 반환값 `{ url: "https://cdn.test/uploaded/a.png", key: "gallery/a.png" }`, featured·published 항목 7개(`f1`~`f7`) + 항목 `x` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `initialMode="new"`, `onImageSelect` 전달 후 `a.png` drop | `onImageSelect` 가 해당 파일로 1회 호출, 드롭존 미리보기 `src` 가 업로드 URL, alert 없음 |
| 2 | 이어서 저장 버튼 클릭 | `/api/admin/galleries` 에 POST 1회, 본문 `imageUrl`·`imageKey` 가 업로드 결과, `categoryId` 가 첫 카테고리 |
| 3 | 항목 8개(`x` 는 featured false), `initialSelectedId="x"` 로 마운트 | featured 스위치 `aria-disabled="true"`, `Featured cap reached — uncheck others first` 안내 표시 |
| 4 | 3번과 같은 조건에서 `x` 가 featured true | featured 스위치에 `aria-disabled` 속성 없음, 안내 미표시 |

- **자동화:** 가능 ✅ | **테스트 수:** 4개 (2026-09-16 실측)
- **결함 이력:** 2026-09-13·2026-09-15 판에서는 결함 확인용 🔲 계획 TC 였다. `GalleryAdminManagerProps` 에 업로드 함수를 받는 prop 이 없고 `GalleryEditForm` 에 `onImageSelect` 를 전달하지 않았다. 그래서 관리자 화면에서 png 를 drop 하면 alert 에 `onImageSelect prop missing — host must provide upload handler` 가 표시되고, 저장은 `Image is required` 로 막혔으며 fetch 는 GET 2회만 발생했다. 2026-09-16 커밋 `e9cbd7a` 에서 선택 prop `onImageSelect` 를 추가하고 편집 폼에 그대로 전달했다. 수정 전 코드에서는 1·2번이 실패하고 3·4번은 통과했으며, 3·4번의 상한 계산에는 결함이 없었다.
- **주입 방식 결정:** `GalleryConfig` 를 확장하지 않고 컴포넌트 prop 을 택했다. `GalleryEditForm` 의 기존 prop 과 이름·시그니처가 같고, 공개 API 에는 선택 항목만 추가되기 때문이다. Server Component 페이지에서는 함수를 전달할 수 없으므로 호스트는 Client Component 로 감싸야 하며, README 에 예시를 추가했다. 전달하지 않았을 때의 동작은 수정 전과 같고 TC-I-003 5번이 이 경로를 확인한다.
- **비고:** `handleToggleFeatured` 의 상한 분기(`window.alert`, `src/components/GalleryAdminManager.tsx:233-248`)는 `next === true` 일 때만 실행된다. 그런데 `GalleryHomePreview` 에는 featured 항목만 전달되므로 별 버튼 클릭은 항상 `next === false` 가 되어, 현재 UI 에서는 이 분기에 도달하지 않는다. 사용자에게 드러나는 결함이 아니므로 수정하지 않았다. 새 항목 일괄 생성으로 상한을 넘을 수 있는 문제는 우선순위 갭의 확인 필요 사항에 적었다.

---

## 3. API Tests (라우트 핸들러 테스트)

**목적:** 호스트가 Next.js 라우트 파일에서 그대로 export 하는 `createGalleryRoutes(config)` 핸들러의 HTTP 상태 코드와 응답 계약을 검증한다. 대상은 6개 경로 그룹에 속한 핸들러 14개이다.

```
createGalleryRoutes(config)
  collection         GET · POST · DELETE     /api/admin/galleries
  item               GET · PUT  · DELETE     /api/admin/galleries/[id]
  publishToggle      PATCH                   /api/admin/galleries/[id]/publish
  bulk               POST · PATCH            /api/admin/galleries/bulk
  categoryCollection GET · POST              /api/admin/gallery-categories
  categoryItem       GET · PUT  · DELETE     /api/admin/gallery-categories/[id]

요청 흐름: host apiWrapper → ApiContext{ request, user, params } → 스키마 검증 → 권한 훅 → service → revalidate(paths)
```

**테스트 전략:** `apiWrapper` 모의 구현이 `globalThis.__GK_TEST_CTX` 에 담긴 `ApiContext` 를 핸들러에 전달한다. NextRequest 는 `{ url, json() }` 객체로 대체하고, 서비스는 실제 구현을 사용하며 Prisma delegate 만 모의한다.

**실행 명령:** 아래 명령은 2026-09-16 에 파일 1개, 테스트 35건을 실행했다. 같은 파일에서 Security 로 재분류한 17건은 이름 필터로 제외된다.

```bash
npx vitest run tests/server/route-handlers \
  -t '^(?!.*(401|exceed batchMax|canDelete|canEdit|canManageCategories|search length cap))'
```

---

### TC-A-001: 갤러리 컬렉션 라우트 (collection GET·POST·DELETE)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/server/route-handlers.test.ts` |
| **대상** | `createGalleryRoutes(config).collection` (`src/server/route-handlers.ts:146-214`) |
| **우선순위** | Critical |
| **전제조건** | route-handlers 하네스, `revalidatePaths ["/", "/home/v1"]`, 기본 사용자 `user-1` |
| **테스트 데이터** | `imageUrl "https://cdn.example.com/a.jpg"`, `categoryId "ckaaaaaaaaaaaaaaaaaaaaaaa"` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 쿼리 없는 GET (findMany 2건, count 2) | 200, `success true`, `data.items` 2건, `data.meta.total 2` |
| 2 | `?categoryId=cat-1&published=true&search=foo&sortBy=createdAt` GET | where 에 세 조건 반영, `orderBy { createdAt: "desc" }` |
| 3 | 유효 본문 POST | 201, `data.id "new-1"`, revalidate 가 `/`, `/home/v1` 로 2회 |
| 4 | `imageUrl: "not-a-url"` POST | 400, `create`·revalidate 미호출 |
| 5 | DELETE `ids ["a","b","c"]`, 그리고 `ids []` | 200·`data.count 3`, 빈 배열은 400·revalidate 미호출 |
| 6 | `revalidate`·`revalidatePaths` 미설정 상태에서 POST | 201, revalidate 미호출 |

- **자동화:** 가능 ✅ | **테스트 수:** 7개 (2026-09-16 실측)

---

### TC-A-002: 갤러리 단건·공개 토글 라우트 (item GET·PUT·DELETE, publishToggle PATCH)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/server/route-handlers.test.ts` |
| **대상** | `item`, `publishToggle` (`src/server/route-handlers.ts:218-293`) |
| **우선순위** | Critical |
| **전제조건** | route-handlers 하네스, permissions 미설정 |
| **테스트 데이터** | `params.id` `"g1"`, `"missing"`, 본문 `{ caption: "updated" }`, `{ sortOrder: -1 }` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | item.GET 대상 존재, 부재, `params` 없음 | 각각 200, 404, 400 |
| 2 | item.PUT `{ caption: "updated" }` (대상 존재) | 200, revalidate 2회 |
| 3 | item.PUT 대상 없음, 그리고 `{ sortOrder: -1 }` | 404·revalidate 미호출, 400 |
| 4 | item.DELETE | 204, `delete` 호출, revalidate 2회 |
| 5 | publishToggle.PATCH (`published false` 항목) | 200, `data.published true`, revalidate 2회 |
| 6 | publishToggle.PATCH `params` 없음 | 400 |

- **자동화:** 가능 ✅ | **테스트 수:** 9개 (2026-09-16 실측)

---

### TC-A-003: bulk 생성·일괄 수정 라우트 (bulk POST·PATCH)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/server/route-handlers.test.ts` |
| **대상** | `bulk` (`src/server/route-handlers.ts:297-341`) |
| **우선순위** | High |
| **전제조건** | route-handlers 하네스, permissions 미설정 |
| **테스트 데이터** | 유효 items 3개, ids `ckaaaaaaaaaaaaaaaaaaaaaaa`, `ckbbbbbbbbbbbbbbbbbbbbbbb` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | bulk.POST 유효 items 3개 | 201, `data.count 3`, revalidate 2회 |
| 2 | bulk.POST `items: []` | 400 |
| 3 | bulk.PATCH ids 2개 + `published: true` | 200, `data.count 4` (updateMany 모의값), revalidate 2회 |
| 4 | bulk.PATCH `ids: []` | 400 |
| 5 | bulk.PATCH 에서 published·featured 모두 생략 | 200, `data.count 0` |

- **자동화:** 가능 ✅ | **테스트 수:** 5개 (2026-09-16 실측)

---

### TC-A-004: 카테고리 라우트 (categoryCollection, categoryItem)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/server/route-handlers.test.ts` |
| **대상** | `categoryCollection`, `categoryItem` (`src/server/route-handlers.ts:345-415`) |
| **우선순위** | High |
| **전제조건** | route-handlers 하네스, permissions 미설정 |
| **테스트 데이터** | `{ slug: "PERFORMANCE", labelKo: "공연" }`, `slug "lowercase"`, `{ labelKo: "수정" }` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | categoryCollection.GET 쿼리 없음, 그리고 `?isActive=true` | 200·where 없음, where `{ isActive: true }` |
| 2 | categoryCollection.POST 유효 본문, 그리고 `slug "lowercase"` | 201·revalidate 2회, 400 |
| 3 | categoryItem.GET 대상 존재, 부재 | 200, 404 |
| 4 | categoryItem.PUT `{ labelKo: "수정" }`, 그리고 대상 없음 | 200·revalidate 2회, 404 |
| 5 | categoryItem.DELETE gallery count 0, 그리고 `params` 없음 | 204·revalidate 2회, 400 |

- **자동화:** 가능 ✅ | **테스트 수:** 10개 (2026-09-16 실측)

---

### TC-A-005: typed error → HTTP 상태 매핑 (오류 처리)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/server/route-handlers.test.ts` |
| **대상** | `publishToggle.PATCH` 의 `err instanceof GalleryNotFoundError` → 404 (`src/server/route-handlers.ts:282-292`), `categoryItem.DELETE` 의 `err instanceof CategoryInUseError` → 409 (`:405-412`) |
| **우선순위** | High |
| **전제조건** | 서비스는 실제 구현, delegate 모의 값으로 예외 조건 구성 |
| **테스트 데이터** | `findUnique → null`, `gallery.count → 5` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `findUnique → null` 에서 publishToggle.PATCH | 서비스가 `GalleryNotFoundError` 를 던지고 라우트가 404 반환 |
| 2 | `gallery.count → 5` 에서 categoryItem.DELETE | 서비스가 `CategoryInUseError` 를 던지고 라우트가 409 반환 |
| 3 | 2번 요청 이후 delegate·revalidate 호출 확인 | `galleryCategory.delete`, revalidate 모두 미호출 |

- **자동화:** 가능 ✅ | **테스트 수:** 2개 (2026-09-16 실측)
- **비고:** git 미추적 로컬 문서 `docs/superpowers/plans/sprint-03-followup-typed-errors.md` 에는 이 매핑이 원래 `message.includes("not found")` 같은 문자열 매칭이었고, 2026-05-25 에 `instanceof` 분기로 바뀌었다고 기록되어 있다. 서비스 예외를 문자열에 의존하지 않고 HTTP 상태로 매핑한 사례로서, 사전 조사 문서는 blog-system 의 상태 코드 유실 결함과 같은 부류의 문제를 이 패키지가 먼저 해결했다고 평가한다. 현재 테스트는 상태 코드만 단언하고 응답 본문(`error: "NotFound"`, `error: "CategoryInUse"`)은 단언하지 않으며, 본문 계약은 TC-A-007 에서 다룬다.

---

### TC-A-006: 부분 수정 PUT 의 미지정 필드 보존

| 항목 | 내용 |
|------|------|
| **파일** | `tests/server/route-handlers.test.ts` (`createGalleryRoutes.item.PUT`, `createGalleryRoutes.categoryItem.PUT` 블록의 `updates only the provided fields ...` 2건) |
| **대상** | `item.PUT` (`src/server/route-handlers.ts:228-247`) → `UpdateGallerySchema` (`src/validators/index.ts:92`) → `service.update` 필드 전달 (`src/services/index.ts:175-194`), `categoryItem.PUT` (`src/server/route-handlers.ts:383-398`) → `UpdateCategorySchema` (`src/validators/index.ts:122`) → `categoryService.update` (`src/services/category-service.ts:48-52`, `data` 를 그대로 전달) |
| **우선순위** | Critical |
| **전제조건** | route-handlers 하네스, permissions 미설정, `findUnique` 가 대상(`{ id: "g1", authorId: "u1" }`, `{ id: "c1" }`)을 반환, `update` 호출 인자를 `mock.calls` 로 확인 |
| **테스트 데이터** | 갤러리 본문 `{ caption: "updated" }`, 카테고리 본문 `{ labelKo: "수정" }` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | item.PUT `params.id "g1"`, 본문 `{ caption: "updated" }` | `gallery.update` 1회, 호출 인자 `data` 가 `{ caption: "updated" }` 와 정확히 일치 (`toStrictEqual`, `sortOrder`·`featured`·`published` 키 없음) |
| 2 | categoryItem.PUT `params.id "c1"`, 본문 `{ labelKo: "수정" }` | `galleryCategory.update` 1회, 호출 인자 `data` 가 `{ labelKo: "수정" }` 와 정확히 일치 (`sortOrder`·`isActive` 키 없음) |

- **자동화:** 가능 ✅ | **테스트 수:** 2개 (2026-09-16 실측)
- **비고:** 스키마만 단독으로 파싱하는 회귀 테스트 2건은 Unit 도메인이므로 TC-U-006 5번, TC-U-007 6번에 배정했다. 이 TC 는 라우트가 파싱 결과를 서비스와 delegate 까지 그대로 전달하는지 확인한다.
- **결함 이력:** 2026-09-13 (0.2.0) 판에서는 결함 확인용 🔲 계획 TC 였다. 당시 `UpdateGallerySchema`·`UpdateCategorySchema` 는 `CreateGallerySchema.partial()`·`CreateCategorySchema.partial()` 이었고, zod 4.4.3 의 `.partial()` 은 필드에 붙은 `.default()` 를 그대로 적용했다. 그 결과 워크트리 밖 임시 테스트에서 `{ featured: true }` 본문의 `data` 는 `{ sortOrder: 0, featured: true, published: false }`, 카테고리 `{ labelKo: "x" }` 본문의 `data` 는 `{ labelKo: "x", sortOrder: 0, isActive: true }` 였다. 0.2.1 커밋 `d4c3134` 에서 기본값이 없는 필드 정의를 공통으로 두고 기본값은 Create 스키마에만 지정하도록 수정하면서, 이 TC 의 2건과 TC-U-006·TC-U-007 의 2건을 함께 추가했다.
- **재현 확인 (2026-09-15):** 워크트리 밖 임시 복사본에서 `src/validators/index.ts` 만 `29fd94c` 판으로 되돌려 실행하면 회귀 테스트 4건이 모두 실패한다 (갤러리는 `caption` 외 3개 키, 카테고리는 `sortOrder: 0`·`isActive: true` 가 추가됨). 현재 코드에서는 4건 모두 통과한다.
- **영향 해소:** 계획 단계에서 적었던 관리자 UI 요청 본문, 즉 별 토글의 `PUT { featured }` 와 홈 프리뷰 재정렬의 `PUT { sortOrder }` (`src/components/GalleryAdminManager.tsx:233-263`)는 2026-09-15 판까지 자동 테스트로 직접 검증하지 않았다. 대신 같은 날 임시 테스트로 `UpdateGallerySchema` 가 `{ featured: true }`, `{ sortOrder: 2 }` 를 각각 해당 키 하나만 남기고 파싱하는 것을 확인했다. 2026-09-16 에 TC-E-001 3·4번이 구현되어, 화면 조작으로 보낸 두 요청이 실제 라우트와 서비스를 거쳐 저장된 뒤에도 `published`·`featured` 가 유지되는 것을 자동 테스트로 확인한다.

---

### TC-A-007: 오류 응답 본문 계약·비매핑 예외 전파 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `tests/server/route-handlers.test.ts` (케이스 추가) |
| **대상** | `jsonError` 본문 (`src/server/route-handlers.ts:60-65`), `validateAndParse`·`validateIds` 본문 (`src/utils/api-helpers.ts:27-67`), catch 블록의 재throw (`src/server/route-handlers.ts:291`, `:411`) |
| **우선순위** | Medium |
| **전제조건** | route-handlers 하네스 |
| **테스트 데이터** | `ids: [1, 2]`, `findUnique` 가 `Error("db down")` 으로 reject |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | publishToggle.PATCH 대상 없음 | 404, 본문 `{ success: false, error: "NotFound", message: "Gallery item not found" }` |
| 2 | categoryItem.DELETE 사용 중 (count 3, id `c1`) | 409, 본문 `error: "CategoryInUse"`, `message: "Category c1 is in use by 3 galleries"` |
| 3 | collection.POST 사용자 없음, item.PUT `canEdit` 거부 | 401 `error: "Unauthorized"`, 403 `error: "Forbidden"` |
| 4 | collection.POST 스키마 위반 | 400 `error: "ValidationError"`, `details` 배열 |
| 5 | collection.DELETE `ids: [1, 2]` | 400 `error: "InvalidIds"`, `message: "ids array contains no valid strings"` |
| 6 | `findUnique` 가 `Error("db down")` 을 던지는 상태에서 publishToggle.PATCH | 404 로 변환하지 않고 같은 오류로 reject (처리는 호스트 `apiWrapper` 책임) |

- **자동화:** 가능 ✅
- **근거:** 2번 본문과 6번 재throw 동작은 2026-09-13 임시 테스트로 확인했다. 나머지는 위 소스 범위를 읽고 작성했다.
- **비고:** 2026-09-16 에 추가한 TC-I-005 는 컴포넌트를 거쳐 409 본문의 `error: "CategoryInUse"` 와 403 본문 `{ success: false, error: "Forbidden", message: "forbidden" }` 을 단언한다. 라우트 단위의 본문 계약(1·2번 메시지, 3번 401, 4~6번)은 여전히 이 TC 의 범위이다.

---

## 4. E2E Tests (엔드-투-엔드 테스트)

**목적:** 관리자 화면 조작이 실제 라우트 핸들러와 서비스를 거쳐 화면에 다시 반영되는 전체 흐름을 검증한다. 이 패키지는 페이지와 브라우저 실행 환경을 제공하지 않으므로, 실제 브라우저·DB 를 사용하는 E2E 는 호스트 책임으로 두고 jsdom 과 메모리 기반 delegate 로 범위를 제한한다.

**실행 명령:** 아래 명령은 2026-09-16 에 파일 1개, 테스트 5건을 실행했다. 파일은 `tests/e2e/` 아래에 두며 기존 `include` 패턴으로 실행된다. 실제 라우트 핸들러를 연결하는 도우미는 `tests/helpers/` 에 있다.

```bash
npx vitest run tests/e2e
```

---

### TC-E-001: 관리자 화면 ↔ 실제 라우트 핸들러 왕복 여정

| 항목 | 내용 |
|------|------|
| **파일** | `tests/e2e/admin-roundtrip.test.tsx` |
| **대상** | `GalleryAdminManager`, `CategoryAdminManager` + `createGalleryRoutes` + `createGalleryService`, `createCategoryService` |
| **우선순위** | High |
| **전제조건** | `tests/helpers/route-fetch.ts` fetch 어댑터(URL·method 로 핸들러 선택, `params.id` 추출), `tests/helpers/in-memory-prisma.ts` 메모리 배열 기반 Prisma 가짜 객체. 테스트마다 같은 초기 데이터로 새로 시작한다 |
| **테스트 데이터** | 카테고리 `cperformance0001` 1개, 갤러리 `g1`(caption `A`, sortOrder 1, featured·published), `g2`(`B`, 2, featured·published), `g3`(`C`, 3, featured·published 모두 false) |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | GalleryAdminManager 마운트 | 목록 항목 3개, 홈 프리뷰 타일 2개 (alt 순서 `A`, `B`) |
| 2 | 목록 항목 `C` 선택 → caption `C 수정` 입력 → 저장 | `PUT /api/admin/galleries/g3` 200, 재조회된 목록에 `C 수정` 표시, 저장된 행의 `featured`·`published` 는 false 유지 |
| 3 | 홈 프리뷰 타일 0 을 타일 1 로 drag·drop | 프리뷰 alt 순서가 `B`, `A` 로 바뀌고, `g2.sortOrder 1`·`g1.sortOrder 2`, 두 항목의 `featured`·`published` 는 true 유지, PUT 2회 모두 200 |
| 4 | 프리뷰 첫 타일의 별 버튼(`unfeature`) 클릭 | `g1` 이 `featured false`·`published true`·`sortOrder 1`, 프리뷰 타일 1개, 목록 항목 3개 유지 |
| 5 | CategoryAdminManager 에서 사용 중인 카테고리 삭제 | DELETE 409, alert 텍스트 `This category has galleries — remove or move them first`, 카테고리 1개 유지 |

- **자동화:** 가능 ✅ | **테스트 수:** 5개 (2026-09-16 실측)
- **결함 이력:** 계획 단계에서는 TC-I-005 결함 때문에 1·3·4번 예상 결과가 성립하지 않았다. 홈 프리뷰 타일도 같은 목록 응답에서 만들어지므로 목록과 프리뷰가 모두 비어 있었다. 2026-09-16 커밋 `bf72aa8` 에서 목록 응답 해석을 수정하면서 이 파일을 함께 추가했고, 수정 전 코드에서는 1~4번이 실패하고 5번만 통과했다. 3·4번의 `published`·`featured` 유지 조건을 막던 TC-A-006(부분 수정 기본값) 결함은 0.2.1 에서 해소되었다.
- **비고:** 스키마가 `categoryId` 에 cuid 형식을 요구하므로 테스트 데이터 id 를 `cperformance0001` 로 지정했다. 처음에 `cat-1` 로 작성했을 때 2번의 PUT 이 400 `ValidationError` 를 받았는데도 화면은 오류를 표시하지 않고 폼을 닫았다. 이 동작은 우선순위 갭의 확인 필요 사항에 적었다.

---

## 5. Security Tests (보안 테스트)

**목적:** 입력 검증(URL 스킴, 저장소 키), 인가(권한 훅), 자원 사용 제한을 검증한다. 보안 강화 커밋 `82f081f` 에서 추가된 검증과 기존 401 검증을 파일 이동 없이 이 도메인으로 재분류했다. 기준은 OWASP Top 10 2021 이다.

**실행 명령:** 아래 명령은 2026-09-16 에 파일 2개, 테스트 28건을 실행했다.

```bash
npx vitest run tests/validators tests/server/route-handlers \
  -t 'hardening|401|exceed batchMax|canDelete|canEdit|canManageCategories|search length cap'
```

---

### TC-S-001: imageUrl 프로토콜·호스트 allowlist (javascript:, data: 차단)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/validators/index.test.ts` (`CreateGallerySchema — imageUrl hardening` 블록) |
| **대상** | `src/validators/index.ts`: `buildImageUrlSchema()`, `DEFAULT_IMAGE_URL_PROTOCOLS = ["https:", "http:"]`, 옵션 `imageUrlProtocols`, `imageUrlHosts` |
| **우선순위** | Critical |
| **전제조건** | 없음 (순수 스키마), `categoryId` 는 유효한 cuid |
| **테스트 데이터** | `javascript:alert(1)`, `data:image/png;base64,AAAA`, `http://cdn.example.com/a.webp`, `https://evil.example.org/a.webp` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `imageUrl: "javascript:alert(1)"` 파싱 | 실패 |
| 2 | `imageUrl: "data:image/png;base64,AAAA"` 파싱 | 실패 |
| 3 | 기본 옵션에서 http, https URL 파싱 | 둘 다 성공 |
| 4 | `imageUrlProtocols: ["https"]` 에서 http URL 파싱 | 실패 |
| 5 | `imageUrlHosts: ["cdn.example.com"]` 에서 `cdn.example.com`, `evil.example.org` 파싱 | 성공, 실패 |

- **자동화:** 가능 ✅ | **테스트 수:** 5개 (2026-09-16 실측)
- **관련 요구사항:** OWASP A03:2021 Injection (URL 스킴을 이용한 스크립트 실행 차단)

---

### TC-S-002: imageKey 형식 검증 (경로 순회 차단)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/validators/index.test.ts` (`CreateGallerySchema — imageKey hardening` 블록) |
| **대상** | `src/validators/index.ts`: `DEFAULT_IMAGE_KEY_PATTERN`, `DEFAULT_IMAGE_KEY_MAX_LENGTH = 512`, 옵션 `imageKeyPattern` |
| **우선순위** | Critical |
| **전제조건** | 유효한 imageUrl·categoryId 에 imageKey 만 변경 |
| **테스트 데이터** | `gallery/2026/abc_123-def.webp`, `../other/key.webp`, `gallery//a.webp`, `"a".repeat(513)` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `gallery/2026/abc_123-def.webp` 파싱 | 성공 |
| 2 | `../other/key.webp`, `gallery/../secret.webp`, `gallery/..` 파싱 | 모두 실패 (경로 순회) |
| 3 | `/gallery/a.webp`, `gallery//a.webp` 파싱 | 둘 다 실패 (선행 슬래시, 이중 슬래시) |
| 4 | `gallery/a b.webp`, 줄바꿈 포함 키, 빈 문자열 파싱 | 모두 실패 (공백, 제어문자, 빈 값) |
| 5 | 513자, 512자 키 파싱 | 실패, 성공 |
| 6 | `imageKeyPattern: /^uploads\//` 에서 `gallery/a.webp`, `uploads/a.webp` 파싱 | 실패, 성공 |

- **자동화:** 가능 ✅ | **테스트 수:** 6개 (2026-09-16 실측)
- **관련 요구사항:** OWASP A01:2021 Broken Access Control (경로 순회). imageKey 는 `config.storage.collectKeys`·`deleteKeys` 로 전달되므로(`src/services/index.ts:196-232`), 이 검증이 저장소 객체 삭제 범위를 제한한다.

---

### TC-S-003: bulk 대상 전원 권한 검사 (403, 부분 성공 없음)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/server/route-handlers.test.ts` |
| **대상** | `checkBulkPermission()` (`src/server/route-handlers.ts:108-129`) 이 적용되는 `collection.DELETE`(canDelete), `bulk.PATCH`(canEdit) |
| **우선순위** | Critical |
| **전제조건** | `permissions.canDelete` 또는 `canEdit` 을 `authorId === "user-1"` 조건으로 설정, `findMany` 가 대상 row 반환 |
| **테스트 데이터** | ids `["a","b"]`, authorId `user-1`, `someone-else`, `other` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | collection.DELETE 에서 b 의 작성자가 다름 | 403, `deleteMany`·revalidate 미호출 |
| 2 | `canDelete: () => true`, ids 2개 중 1개만 존재 | 404, `deleteMany` 미호출 |
| 3 | collection.DELETE 에서 두 대상 모두 `user-1` | 200, `deleteMany` 1회 |
| 4 | bulk.PATCH 에서 두 대상 중 하나의 작성자가 다름 | 403, `updateMany`·revalidate 미호출 |
| 5 | `canEdit: () => true`, `featured: true` 로 bulk.PATCH | 200, `updateMany` 1회 |

- **자동화:** 가능 ✅ | **테스트 수:** 5개 (2026-09-16 실측)
- **관련 요구사항:** OWASP A01:2021 Broken Access Control

---

### TC-S-004: 단건 권한 훅·인증 누락 차단

| 항목 | 내용 |
|------|------|
| **파일** | `tests/server/route-handlers.test.ts` |
| **대상** | `getAuthorId()` (`src/server/route-handlers.ts:74-84`) 기반 401, `item.PUT`(canEdit)·`item.DELETE`(canDelete) 의 403·404 |
| **우선순위** | Critical |
| **전제조건** | 하네스 `authorIdFromContext: (ctx) => ctx.user?.id ?? ""` |
| **테스트 데이터** | `user: undefined`, 대상 authorId `other`, `user-1` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | collection.POST 에 `user: undefined` | 401 |
| 2 | item.PUT, `canEdit: () => false` | 403, `update`·revalidate 미호출 |
| 3 | item.PUT, `canEdit` 이 작성자 `user-1` 을 승인 | 200 |
| 4 | item.DELETE, `canDelete: () => false` | 403, `delete` 미호출 |
| 5 | item.DELETE, `canDelete: () => true`, 대상 없음 | 404 |

- **자동화:** 가능 ✅ | **테스트 수:** 5개 (2026-09-16 실측)
- **관련 요구사항:** OWASP A01:2021 Broken Access Control, A07:2021 Identification and Authentication Failures

---

### TC-S-005: 카테고리 관리 권한 게이트 (canManageCategories)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/server/route-handlers.test.ts` |
| **대상** | `canManageCategories()` (`src/server/route-handlers.ts:93-96`) 가 적용되는 categoryCollection.POST, categoryItem.PUT·DELETE |
| **우선순위** | High |
| **전제조건** | `permissions.canManageCategories: () => false` |
| **테스트 데이터** | `{ slug: "NEW", labelKo: "새" }`, `{ labelKo: "변경" }` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | categoryCollection.POST | 403, `create` 미호출 |
| 2 | categoryItem.PUT | 403, `update` 미호출 |
| 3 | categoryItem.DELETE | 403, `delete` 미호출 |
| 4 | categoryCollection.GET | 200 (조회는 게이트 대상이 아님) |

- **자동화:** 가능 ✅ | **테스트 수:** 4개 (2026-09-16 실측)

---

### TC-S-006: 입력 크기 제한 (batchMax, search 길이)

| 항목 | 내용 |
|------|------|
| **파일** | `tests/server/route-handlers.test.ts` |
| **대상** | `collection.DELETE` 의 `batchMax` 검사 (`src/server/route-handlers.ts:195-201`), `collection.GET` 의 search 절단 (`:151-152`, 기본 `DEFAULT_SEARCH_MAX_LENGTH = 100`) |
| **우선순위** | High |
| **전제조건** | `limits.batchMax 20` |
| **테스트 데이터** | ids 21개, search `"x".repeat(500)`, `"y".repeat(50)` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | collection.DELETE 에 ids 21개 | 400, `deleteMany` 미호출 |
| 2 | collection.GET 에 500자 search | `findMany` where 의 `caption.contains` 길이 100 |
| 3 | `validation.searchMaxLength: 10` 에서 50자 search | `caption.contains` 길이 10 |

- **자동화:** 가능 ✅ | **테스트 수:** 3개 (2026-09-16 실측)
- **관련 요구사항:** OWASP A04:2021 Insecure Design (자원 소비 제한)

---

### TC-S-007: 라우트 경유 URL·키 검증 적용 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `tests/server/route-handlers.test.ts` (케이스 추가) |
| **대상** | `createGalleryRoutes` 가 `config.validation` 을 `createGallerySchemas` 에 전달하는 경로 (`src/server/route-handlers.ts:134-140`), item.PUT 의 검증 순서 (`:232-237`) |
| **우선순위** | High |
| **전제조건** | route-handlers 하네스 |
| **테스트 데이터** | `javascript:alert(1)`, `data:image/png;base64,AAAA`, imageKey `../x.webp` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | collection.POST `imageUrl: "javascript:alert(1)"` | 400, `create` 미호출 |
| 2 | collection.POST `imageKey: "../x.webp"` | 400, `create` 미호출 |
| 3 | bulk.POST items 중 1개가 `data:` URL | 400, `createMany` 미호출 |
| 4 | item.PUT `{ imageUrl: "javascript:alert(1)" }` | 400, `getById`·`update` 미호출 |
| 5 | `config.validation.imageUrlHosts: ["cdn.example.com"]` 에서 다른 호스트로 POST | 400 |
| 6 | `config.validation.imageKeyPattern: /^uploads\//` 에서 `gallery/a.webp` 로 POST | 400 |

- **자동화:** 가능 ✅
- **근거:** 1·2번은 2026-09-13 임시 테스트로 400 응답을 확인했다. 현재는 스키마 단위 검증(TC-S-001, TC-S-002)만 있고, 라우트가 옵션을 실제로 전달하는지는 자동 검증되지 않는다.

---

### TC-S-008: 인증 식별자 추출·권한 검사 경계값 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `tests/server/route-handlers.test.ts` (케이스 추가) |
| **대상** | `getAuthorId()` 의 예외·빈 문자열 처리 (`src/server/route-handlers.ts:74-84`), `checkBulkPermission()` 의 id 중복 제거 (`:115-122`), `bulk.POST` 401 (`:297-299`), `canManageCategories` 의 `=== true` 비교 (`:93-96`) |
| **우선순위** | Medium |
| **전제조건** | route-handlers 하네스 |
| **테스트 데이터** | throw 하는 `authorIdFromContext`, ids `["a","a"]` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `authorIdFromContext` 가 throw 하는 상태에서 collection.POST | 401 |
| 2 | `authorIdFromContext` 가 `""` 반환 | collection.POST 401 |
| 3 | bulk.POST 에 `user: undefined` | 401, `createMany` 미호출 |
| 4 | `canDelete: () => true`, collection.DELETE `ids ["a","a"]`, findMany 1건 | 404 가 아니라 권한 검사를 통과해 200, `deleteMany` 호출 |
| 5 | `canManageCategories` 가 `true` 가 아닌 truthy 값(`1`)을 반환 | categoryCollection.POST 403 |

- **자동화:** 가능 ✅
- **근거:** 위 소스 범위를 읽고 작성했다. `canEdit`·`canDelete` 는 반환값을 `!ok` 로 판정하므로 truthy 값을 허용하지만, `canManageCategories` 는 `=== true` 로 판정한다.

---

## 6. Accessibility Tests (접근성 테스트)

**목적:** 공개 API 로 export 하는 컴포넌트 7개와 공개 프리셋 1개의 ARIA 역할·상태·이름, 키보드 조작을 WCAG 2.1 Level AA 기준으로 검증한다.

**실행 명령:** 아래 명령은 2026-09-16 에 파일 1개, 테스트 6건(TC-AC-006)을 실행했다. 파일은 `tests/accessibility/` 아래에 두며, 기존 `include` 패턴(`tests/**/*.test.{ts,tsx}`)으로 추가 설정 없이 실행된다.

```bash
npx vitest run tests/accessibility
```

### 기존 테스트에서 부수적으로 확인되는 ARIA 단언

| 컴포넌트 | 기존 단언 | 위치 |
|---------|----------|------|
| ToggleSwitch | `getByRole("switch")` 조회, checked true 일 때 `aria-checked="true"`, `aria-label`, Space·Enter 토글 | TC-U-014 |
| ImageDropZone | disabled 일 때 `aria-disabled="true"`, 거부 시 `role="alert"` 존재 | TC-U-015 |
| GalleryEditForm | featured 스위치 `aria-disabled="true"` | TC-U-017 |
| PublicGalleryMosaic | 타일 `aria-label` 의 i18n 대체값 | TC-I-002 |
| useGalleryLightbox | window `Escape`·`ArrowLeft`·`ArrowRight` 처리 | TC-U-011 |

이 단언들은 기능 테스트 안에 흩어져 있다. 2026-09-16 에 폼 컨트롤 이름과 목록 항목 버튼을 확인하는 접근성 전용 테스트(TC-AC-006)가 추가되었지만, axe 규칙 검사는 아직 없다. 속성의 반대 조건 검증은 TC-I-006 4번(featured 스위치의 `aria-disabled` 부재)에만 있다.

### ARIA·키보드 구현 전수 목록 (2026-09-13 소스 확인, 2026-09-16 수정분 반영)

| 컴포넌트 (소스 위치) | 구현 | 기존 자동 검증 |
|--------------------|------|--------------|
| `ToggleSwitch.tsx:43-64` | `role="switch"`, `aria-checked={checked}`, `aria-disabled={disabled \|\| undefined}`, `aria-label={label}`, 네이티브 `disabled`, Space·Enter keyDown(`preventDefault`), thumb `aria-hidden="true"` | 일부 |
| `ImageDropZone.tsx:76-129` | 숨김 input `aria-hidden="true"`·`tabIndex=-1`, 드롭존 `role="button"`·`tabIndex={disabled ? -1 : 0}`·`aria-disabled`, Enter·Space 로 `input.click()`, 미리보기 `alt=""`, 거부 목록 `role="alert"` | 일부 |
| `GalleryHomePreview.tsx:136-172` | 이미지 `alt={caption ?? ""}`, 별 버튼 `aria-label` (`"unfeature"`/`"feature"`, i18n 미적용)·`aria-pressed`. 타일 키보드 재정렬은 없음 (소스 주석 "키보드 접근성은 v0.2") | 없음 |
| `GalleryEditForm.tsx:257-403` | 스위치 이름 `Featured`·`Published`, 오류 `role="alert"`, 다중 이미지 제거 버튼 `aria-label="remove"`. caption·category·sortOrder 컨트롤은 섹션 제목 `div.gallery-edit-form__section-title` 에 `useId` 기반 id 를 두고 `aria-labelledby` 로 연결 (2026-09-16) | 일부, 이름은 TC-AC-006 |
| `CategoryAdminManager.tsx:209-294` | 오류 `role="alert"`, 삭제 버튼 `aria-label="delete"`, 스위치 이름 `Active`. `<label>` 4개와 input 을 `useId` 기반 `htmlFor`·`id` 로 연결 (2026-09-16) | label 연결은 TC-AC-006 |
| `GalleryAdminManager.tsx:286-338` | 검색 input 에 `aria-label`(`admin.searchPlaceholder`)과 placeholder, 목록 `li` 안에 네이티브 `button`(`.gallery-list-item__select`)을 두고 `li` 의 `onClick` 으로 선택, 썸네일 `alt=""` (2026-09-16) | TC-AC-006 |
| `presets/ballet.tsx:100-211` | section `aria-label`, 타일 `role="button"`·`tabIndex=0`·`aria-label={alt ?? expandAria}`·Enter·Space, 아이콘 `aria-hidden`, 라이트박스 `role="dialog"`·`aria-modal="true"`·`aria-label`, 닫기·이전·다음 버튼 `aria-label`, 열린 동안 body `overflow: hidden`. 포커스 이동·포커스 가두기·포커스 복귀 코드는 없음 | 일부 |
| `gallery.css` | `:focus-visible` 외곽선 5곳 (`.gallery-toggle__track`, `.gallery-dropzone`, `.gallery-list-item__select`, `.gallery-edit-form__input`, `.gallery-public-mosaic__item`) | jsdom 에서 검증 불가 |

---

### TC-AC-001: ToggleSwitch 스위치 역할·상태·키보드 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `tests/accessibility/ToggleSwitch.a11y.test.tsx` (신규) |
| **대상** | `src/components/ToggleSwitch.tsx:43-64` |
| **우선순위** | High |
| **전제조건** | @testing-library/react (설치됨), 추가 의존성 없음 |
| **기준** | WCAG 2.1 SC 4.1.2 (Name, Role, Value), 2.1.1 (Keyboard) |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `checked={false}` 렌더 | `role="switch"`, `aria-checked="false"`, `aria-disabled` 속성 없음, thumb `aria-hidden="true"` |
| 2 | `checked` 를 false 에서 true 로 rerender | `aria-checked` 가 `"false"` 에서 `"true"` 로 갱신 |
| 3 | `disabled`, `label="L"` 렌더 | `aria-disabled="true"`, `disabled` 속성 존재, `getByRole("switch", { name: "L" })` 조회 성공 |
| 4 | `disabled` 상태에서 Space keyDown | `onChange` 0회 |
| 5 | 활성 상태에서 cancelable Space keydown 이벤트 dispatch | `defaultPrevented === true` (페이지 스크롤 방지) |
| 6 | `label` 미지정 렌더 | `aria-label` 속성이 렌더되지 않음 (현재 동작 기록, label 필수 여부는 결정 필요) |

- **자동화:** 가능 ✅
- **근거:** 1·3·4·5·6번은 2026-09-13 jsdom 임시 테스트로 확인했다. 확인 결과는 `aria-checked="false"`, 비활성 시 `aria-disabled="true"` 와 `disabled=""`, keyDown 호출 0회, `defaultPrevented true`, label 미지정 시 `aria-label` 없음이었다.

---

### TC-AC-002: ImageDropZone 버튼 역할·키보드·거부 알림 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `tests/accessibility/ImageDropZone.a11y.test.tsx` (신규) |
| **대상** | `src/components/ImageDropZone.tsx:76-129` |
| **우선순위** | High |
| **전제조건** | `vi.spyOn(HTMLInputElement.prototype, "click")` |
| **기준** | WCAG 2.1 SC 2.1.1 (Keyboard), 4.1.2 (Name, Role, Value), 4.1.3 (Status Messages) |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 기본 렌더 | 드롭존 `role="button"`, `tabindex="0"`, `aria-disabled` 없음, `getByRole("button", { name: /Drop image here/ })` 조회 성공 |
| 2 | 숨김 file input 확인 | `aria-hidden="true"`, `tabindex="-1"` |
| 3 | 드롭존에서 Enter, Space keyDown | `input.click()` 총 2회 |
| 4 | `disabled` 렌더 후 Enter keyDown | `tabindex="-1"`, `aria-disabled="true"`, `click()` 0회 |
| 5 | `previewUrl` 지정 렌더 | 미리보기 이미지 `alt=""` (장식 이미지), 드롭존 이름에 `Drop a new image to replace` 포함 |
| 6 | 허용되지 않는 파일 drop | `role="alert"` 목록에 `Some files were rejected` 와 파일별 사유 포함 |

- **자동화:** 가능 ✅
- **근거:** 1번의 속성, 2~4번, 5번의 `alt=""` 는 2026-09-13 jsdom 임시 테스트로 확인했다. 1·5번의 접근 가능한 이름 계산과 6번 문구는 소스를 읽고 작성했다.

---

### TC-AC-003: 공개 모자이크 타일·라이트박스 대화상자 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `tests/accessibility/PublicGalleryMosaic.a11y.test.tsx` (신규) |
| **대상** | `src/presets/ballet.tsx:100-211` |
| **우선순위** | High |
| **전제조건** | jsdom (`IntersectionObserver` 없음), 기본 i18n (한글 대체 문구) |
| **테스트 데이터** | `[{ src: "/a.jpg", alt: "A" }, { src: "/b.jpg" }]`, 이미지 1개 배열 |
| **기준** | WCAG 2.1 SC 2.1.1 (Keyboard), 4.1.2 (Name, Role, Value), 2.4.3 (Focus Order) |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 이미지 2개 렌더 | section `aria-label="갤러리"`, 타일 `role="button"`·`tabindex="0"`, 타일 이름 `A`, `이미지 확대`, `+` 아이콘 `aria-hidden="true"` |
| 2 | 두 번째 타일에서 Enter keyDown | `role="dialog"`, `aria-modal="true"`, `aria-label="공연의 순간들"` 인 요소 노출 |
| 3 | 대화상자 버튼 이름 확인 | `닫기`, `이전 이미지`, `다음 이미지` |
| 4 | 열린 동안, 그리고 닫기 버튼 클릭 후 `document.body.style.overflow` 확인 | `"hidden"`, 닫힌 뒤 원래 값 `""` 으로 복원 |
| 5 | 이미지 1개에서 Space keyDown | 대화상자 노출, 이전·다음 버튼과 카운터 없음 |
| 6 | 대화상자가 열린 직후 포커스 위치 확인 | 소스에 포커스 이동 코드가 없으므로 포커스는 대화상자 안으로 이동하지 않는다. WAI-ARIA 대화상자 패턴(열릴 때 내부로 포커스 이동, Tab 순환, 닫힐 때 타일로 복귀) 적용 여부를 결정한 뒤 예상 결과를 확정한다 |

- **자동화:** 가능 ✅
- **근거:** 1~5번은 2026-09-13 jsdom 임시 테스트로 확인했다. 6번은 `ballet.tsx` 에 `focus()` 호출과 포커스 관리 코드가 없다는 소스 확인에 근거한다.

---

### TC-AC-004: GalleryHomePreview 별 토글 상태 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `tests/accessibility/GalleryHomePreview.a11y.test.tsx` (신규) |
| **대상** | `src/components/GalleryHomePreview.tsx:136-172` |
| **우선순위** | Medium |
| **전제조건** | 없음 |
| **테스트 데이터** | featured true·caption `cap` 항목, featured false·caption null 항목, `maxCount 3` |
| **기준** | WCAG 2.1 SC 4.1.2 (Name, Role, Value), 1.1.1 (Non-text Content), 2.1.1 (Keyboard) |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | featured true 항목 렌더 | 별 버튼 `aria-pressed="true"`, `aria-label="unfeature"`, 이미지 `alt="cap"` |
| 2 | featured false, caption null 항목 렌더 | 별 버튼 `aria-pressed="false"`, `aria-label="feature"`, 이미지 `alt=""` |
| 3 | `i18n` 을 지정한 상태에서 별 버튼 이름 확인 | `"feature"`/`"unfeature"` 로 고정 (해당 i18n 키 없음, 현재 동작 기록) |
| 4 | 항목 타일 속성 확인 | `draggable` 만 있고 `tabindex` 없음, 키보드 재정렬 수단 없음 (현재 동작 기록, 소스 주석상 v0.2 예정) |

- **자동화:** 가능 ✅
- **근거:** 1·2·4번은 2026-09-13 jsdom 임시 테스트로 확인했다. 3번은 `GalleryHomePreview.tsx:163` 의 고정 문자열에 근거한다.

---

### TC-AC-005: 관리자 오류 알림·보조 버튼 이름 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `tests/accessibility/admin-alerts.a11y.test.tsx` (신규) |
| **대상** | `src/components/GalleryEditForm.tsx:257-344`, `src/components/CategoryAdminManager.tsx:209-294` |
| **우선순위** | Medium |
| **전제조건** | CategoryAdminManager 는 `setGalleryConfig` 와 fetch 모의 필요 |
| **기준** | WCAG 2.1 SC 4.1.3 (Status Messages), 4.1.2 (Name, Role, Value) |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | GalleryEditForm 새 모드에서 이미지 없이 Save | `getByRole("alert")` 텍스트 `Image is required` |
| 2 | GalleryEditForm 스위치 이름 확인 | `getAllByRole("switch")` 이름이 `Featured`, `Published` |
| 3 | GalleryEditForm 다중 모드에서 이미지 2개 이상 추가 | `getAllByRole("button", { name: "remove" })` 개수가 이미지 수와 같음 |
| 4 | CategoryAdminManager 카테고리 목록 렌더 | 삭제 버튼 이름이 모두 `delete` (항목 구분 정보 없음, 현재 동작 기록) |
| 5 | CategoryAdminManager 에서 DELETE 409 응답 | `getByRole("alert")` 텍스트 `This category has galleries — remove or move them first` |
| 6 | CategoryAdminManager 폼 렌더 | `getByRole("switch", { name: "Active" })` 조회 성공 |

- **자동화:** 가능 ✅
- **근거:** 1·2·6번은 2026-09-13 jsdom 임시 테스트로 확인했다. 3~5번은 위 소스 범위를 읽고 작성했다.

---

### TC-AC-006: 폼 컨트롤 접근 가능한 이름·키보드 도달성

| 항목 | 내용 |
|------|------|
| **파일** | `tests/accessibility/form-labels.a11y.test.tsx` |
| **대상** | `src/components/CategoryAdminManager.tsx:92-100`, `:244-288` (label ↔ input), `src/components/GalleryEditForm.tsx:130-136`, `:351-403` (섹션 제목 ↔ 컨트롤), `src/components/GalleryAdminManager.tsx:286-338` (검색 input, 목록 항목 button) |
| **우선순위** | High |
| **전제조건** | 관리자 컴포넌트는 `setGalleryConfig` 와 fetch 모의 필요. 이름 확인 도우미는 `textbox`·`searchbox`·`combobox`·`spinbutton`·`switch` 역할마다 전체 컨트롤 수와 이름이 비어 있지 않은 컨트롤 수가 같은지 비교한다 |
| **기준** | WCAG 2.1 SC 1.3.1 (Info and Relationships), 4.1.2 (Name, Role, Value), 2.1.1 (Keyboard) |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | CategoryAdminManager 에서 `getByLabelText("Slug (uppercase)")`, `"Label (Ko)"`, `"Label (En)"`, `"Sort order"` | 각각 `slug`·`labelKo`·`labelEn`·`sortOrder` input 반환, 이름 대상 역할의 컨트롤이 모두 이름을 가짐 |
| 2 | host i18n `category.slug "식별자"`, `category.labelKo "한글 라벨"` 으로 렌더 | 바뀐 label 텍스트로 같은 input 반환 |
| 3 | GalleryEditForm 에서 `getByLabelText("Caption")`, `"Category"`, `"Sort order"` | 각각 caption input, category select, sortOrder input 반환, 이름 대상 역할의 컨트롤이 모두 이름을 가짐 |
| 4 | GalleryEditForm 2개와 CategoryAdminManager 2개를 한 문서에 렌더 | 문서 안 `id` 중복 0건, 영역마다 `within(...).getByLabelText` 가 자기 영역의 컨트롤 반환 |
| 5 | GalleryAdminManager 에서 `getByRole("searchbox", { name: /search/i })` | `.gallery-manager__search` 반환, 이름 대상 역할의 컨트롤이 모두 이름을 가짐 |
| 6 | GalleryAdminManager 두 번째 목록 항목에서 이름이 `/cap-b/` 인 button 을 찾아 focus 후 click | `type="button"`, 비활성 아님, `tabIndex 0`, `document.activeElement` 가 해당 버튼, click 후 편집 폼 caption `cap-b` 와 항목의 `gallery-list-item--active` 클래스 |

- **자동화:** 가능 ✅ | **테스트 수:** 6개 (2026-09-16 실측)
- **결함 이력:** 2026-09-13·2026-09-15 판에서는 결함 확인용 🔲 계획 TC 였다. CategoryAdminManager 의 `<label>` 에는 `htmlFor` 가 없고 input 을 감싸지도 않았다. GalleryEditForm 은 label 대신 `div.gallery-edit-form__section-title` 만 사용했다. GalleryAdminManager 검색 input 에는 placeholder 만 있었고, 목록 `li` 에는 `onClick` 만 있고 role·tabIndex·키 처리가 없었다. 2026-09-16 커밋 `addd6b7` 에서 CategoryAdminManager 는 `useId` 기반 `htmlFor`·`id` 로, GalleryEditForm 은 섹션 제목 `id` 와 `aria-labelledby` 로 연결했다. GalleryEditForm 은 DOM 구조와 CSS 를 유지하려고 제목 요소를 `label` 로 바꾸지 않았다. 검색 input 에는 `aria-label` 을 지정하고, 목록 항목 내용은 네이티브 `button` 으로 감쌌다. 수정 전 코드에서는 6건이 모두 실패했다.
- **비고:** jsdom 은 네이티브 `button` 의 Enter·Space → click 변환을 구현하지 않으므로, 6번은 버튼 역할·포커스 가능 여부와 click 선택까지 확인한다. 실제 키 입력 검증에는 브라우저 환경이 필요하다. 목록 항목 버튼은 `li` 의 `onClick` 으로 전파되는 click 을 사용하므로 기존처럼 `li` 를 직접 클릭해도 선택된다. 버튼 안에는 phrasing content 만 둘 수 있어 내용의 `div` 를 `span` 으로 바꾸고, `gallery.css` 에 `display: block` 과 버튼 스타일 초기화를 추가했다. 검색 input 이름은 새 i18n 키를 만들지 않고 기존 `admin.searchPlaceholder` 값을 사용한다.

---

### TC-AC-007: axe 규칙 기반 자동 검사 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `tests/accessibility/axe.a11y.test.tsx` (신규) |
| **대상** | `src/components/index.ts` 가 export 하는 컴포넌트 7개, `PublicGalleryMosaic` |
| **우선순위** | Medium |
| **전제조건** | `axe-core` 또는 `vitest-axe` devDependency 추가 필요 (현재 미설치이므로 `package.json` 수정 필요) |
| **기준** | WCAG 2.1 Level AA |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | ToggleSwitch(label 지정), ImageDropZone 기본 렌더 후 axe 실행 | 위반 0건 |
| 2 | PublicGalleryMosaic 렌더, 라이트박스를 연 상태에서 axe 실행 | 위반 0건 |
| 3 | GalleryEditForm, CategoryAdminManager, GalleryAdminManager 렌더 후 axe 실행 | 위반 0건 (선행 조건이던 TC-AC-006 은 2026-09-16 에 해소) |
| 4 | jsdom 에서 판정할 수 없는 규칙(색 대비 등) 처리 | 비활성화할 규칙 목록을 테스트 코드에 명시 |

- **자동화:** 가능 ✅ (의존성 추가 후)
- **비고:** axe 를 아직 실행하지 않았으므로 위반 건수를 예측하지 않는다. 예상 결과는 목표 기준이다.

---

## 7. Smoke Tests (스모크 테스트)

**목적:** 공개 진입점이 import 가능하고 핵심 API 가 export 되는지 빠르게 확인한다. 사전 조사 문서 기준으로 6개 공유 패키지 가운데 smoke 테스트를 보유한 패키지는 이 패키지뿐이다.

**실행 명령:** 아래 명령은 2026-09-16 에 파일 1개, 테스트 2건을 실행했다.

```bash
npx vitest run tests/smoke.test.ts
```

---

### TC-SM-001: 소스 공개 진입점 export

| 항목 | 내용 |
|------|------|
| **파일** | `tests/smoke.test.ts` |
| **대상** | `src/index.ts` |
| **우선순위** | Medium |
| **전제조건** | 빌드 없이 소스를 import |
| **테스트 데이터** | 없음 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `import * as kit from "../src/index"` | import 성공 |
| 2 | `kit.setGalleryConfig`, `kit.getGalleryConfig` 타입 확인 | 둘 다 `"function"` |
| 3 | `kit.cn`, `kit.getVariantUrl` 타입 확인 | 둘 다 `"function"` |

- **자동화:** 가능 ✅ | **테스트 수:** 2개 (2026-09-16 실측)
- **비고:** `src/index.ts` 가 export 하는 오류 클래스 5개, 나머지 서브패스 진입점, dist 산출물은 확인하지 않는다.

---

### TC-SM-002: 서브패스 exports·dist 산출물 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `tests/smoke/exports.test.ts` (신규, dist 단계는 빌드 후 실행) |
| **대상** | `package.json` `exports` 8개 키 (`.`, `./server`, `./components`, `./components/gallery.css`, `./hooks`, `./validators`, `./types`, `./presets/ballet`), `tsup.config.ts:5-49` (진입점 7개, `CLIENT_ENTRIES`, `addUseClientDirective`, CSS 복사) |
| **우선순위** | Medium |
| **전제조건** | 소스 단계는 추가 준비 없음. dist 단계는 `npm run build` 선행 필요 (현재 테스트 절차에 빌드 단계 없음) |
| **테스트 데이터** | 없음 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `src/server/index.ts` import | `createGalleryRoutes`, `createGalleryService`, `createCategoryService`, `buildPaginatedResult`, 로더 4개, 오류 클래스 5개, `setGalleryConfig`·`getGalleryConfig` export |
| 2 | `src/index.ts` 오류 클래스 확인 | `GalleryError` 외 4개가 클래스로 export |
| 3 | `src/components/index.ts`, `src/hooks/index.ts` import | 컴포넌트 7개, 훅 3개 export |
| 4 | 빌드 후 `exports` 각 경로의 `import`·`require` 파일 확인 (CSS 제외) | 파일 존재, `require` 성공 |
| 5 | 빌드 후 `dist/components/index.mjs`, `dist/hooks/index.mjs`, `dist/presets/ballet.mjs` 와 각 `.js` 첫 줄 확인 | `"use client";` |
| 6 | 빌드 후 CSS 파일 확인 | `dist/gallery.css`, `dist/components/gallery.css` 존재 |

- **자동화:** 가능 ✅ (4~6번은 빌드 단계 추가 후)
- **근거:** `package.json` 의 `exports` 와 `tsup.config.ts` 의 `entry`, `onSuccess` 후처리를 읽고 작성했다.

---

## 분류 요약

| 유형 | 현재 파일 수 | 현재 테스트 수 | SC 수 (✅/🔲) | TC 수 (✅/🔲) | 계획 파일 |
|------|------------|-------------|--------------|--------------|----------|
| **Unit** | 17개 | 163개 | 19 (19/0) | 19 (19/0) | - |
| **Integration** | 5개 | 34개 | 6 (6/0) | 6 (6/0) | - |
| **API** | 1개 | 35개 | 7 (6/1) | 7 (6/1) | 기존 1개에 추가 |
| **E2E** | 1개 | 5개 | 1 (1/0) | 1 (1/0) | - |
| **Security** | 2개 | 28개 | 8 (6/2) | 8 (6/2) | 기존 1개에 추가 |
| **Accessibility** | 1개 | 6개 | 7 (1/6) | 7 (1/6) | 신규 6개 |
| **Performance** | 0개 | 0개 | 0 | 0 | - |
| **Load/Stress** | 0개 | 0개 | 0 | 0 | - |
| **Smoke** | 1개 | 2개 | 2 (1/1) | 2 (1/1) | 신규 1개 |
| **Chaos** | 0개 | 0개 | 0 | 0 | - |
| **합계** | **26개** (중복 제외) | **273개** | **50 (40/10)** | **50 (40/10)** | |

- 현재 파일 수는 해당 도메인 테스트를 1건 이상 포함한 파일 수이다. `tests/validators/index.test.ts` 는 Unit·Security 에, `tests/server/route-handlers.test.ts` 는 API·Security 에 함께 집계되므로 도메인별 파일 수의 합(28)은 실제 파일 수(26)보다 크다.
- 도메인별 테스트 수(163 + 34 + 35 + 5 + 28 + 6 + 2)의 합은 실측 273건과 같다.
- 2026-09-15 판에서 증가한 4건은 0.2.1 회귀 테스트이며, 모두 기존 TC 에 배정했다 (TC-U-006 1건, TC-U-007 1건, TC-A-006 2건). 새 SC·TC 는 없다.
- 2026-09-16 판에서 증가한 25건은 결함 수정과 함께 추가한 테스트이며, 새 SC·TC 없이 기존 계획 TC 에 배정했다 (TC-U-019 5건, TC-I-005 5건, TC-I-006 4건, TC-E-001 5건, TC-AC-006 6건). TC-I-003 5번 테스트 1건은 단언과 이름을 바꿨지만 건수는 같다. 새 테스트 파일은 `tests/integration/admin-route-contract.test.tsx`, `tests/e2e/admin-roundtrip.test.tsx`, `tests/accessibility/form-labels.a11y.test.tsx` 3개이다.

### 테스트 파일 배정표

| 파일 | 테스트 수 | 도메인 | TC |
|------|---------|--------|----|
| `tests/errors.test.ts` | 7 | Unit | TC-U-001 |
| `tests/config.test.ts` | 3 | Unit | TC-U-002 |
| `tests/utils/cn.test.ts` | 2 | Unit | TC-U-003 |
| `tests/utils/image-variants.test.ts` | 4 | Unit | TC-U-003 |
| `tests/services/helpers.test.ts` | 5 | Unit | TC-U-004 |
| `tests/utils/api-helpers.test.ts` | 12 | Unit | TC-U-005 |
| `tests/validators/index.test.ts` | 42 | Unit 31, Security 11 | TC-U-006 (18), TC-U-007 (13), TC-S-001 (5), TC-S-002 (6) |
| `tests/services/gallery-service.test.ts` | 25 | Unit | TC-U-008 (23), TC-U-010 (2) |
| `tests/services/category-service.test.ts` | 11 | Unit | TC-U-009 (9), TC-U-010 (2) |
| `tests/hooks/useGalleryLightbox.test.tsx` | 9 | Unit | TC-U-011 |
| `tests/hooks/useImageDropZone.test.tsx` | 9 | Unit | TC-U-012 |
| `tests/hooks/useScrollReveal.test.tsx` | 6 | Unit | TC-U-013 |
| `tests/components/ToggleSwitch.test.tsx` | 8 | Unit | TC-U-014 |
| `tests/components/ImageDropZone.test.tsx` | 7 | Unit | TC-U-015 |
| `tests/components/GalleryManagerLayout.test.tsx` | 7 | Unit | TC-U-016 |
| `tests/components/GalleryEditForm.test.tsx` | 12 | Unit | TC-U-017 (7), TC-U-019 (5) |
| `tests/components/GalleryHomePreview.test.tsx` | 5 | Unit | TC-U-018 |
| `tests/server/loaders.test.ts` | 7 | Integration | TC-I-001 |
| `tests/presets/ballet.test.tsx` | 10 | Integration | TC-I-002 |
| `tests/components/GalleryAdminManager.test.tsx` | 9 | Integration | TC-I-003 (5), TC-I-006 (4) |
| `tests/components/CategoryAdminManager.test.tsx` | 3 | Integration | TC-I-004 |
| `tests/integration/admin-route-contract.test.tsx` | 5 | Integration | TC-I-005 |
| `tests/server/route-handlers.test.ts` | 52 | API 35, Security 17 | TC-A-001 (7), TC-A-002 (9), TC-A-003 (5), TC-A-004 (10), TC-A-005 (2), TC-A-006 (2), TC-S-003 (5), TC-S-004 (5), TC-S-005 (4), TC-S-006 (3) |
| `tests/e2e/admin-roundtrip.test.tsx` | 5 | E2E | TC-E-001 |
| `tests/accessibility/form-labels.a11y.test.tsx` | 6 | Accessibility | TC-AC-006 |
| `tests/smoke.test.ts` | 2 | Smoke | TC-SM-001 |

`tests/setup.ts` 는 테스트 파일이 아니라 `setupFiles` 로 등록된 정리 코드(`afterEach(cleanup)`)이므로 배정 대상에서 제외한다. `tests/helpers/in-memory-prisma.ts`, `tests/helpers/route-fetch.ts` 도 테스트 도우미이므로 제외한다.

---

## 도메인 적용성 판정

사전 조사 문서(`WITHWIZ_PACKAGES_TEST_AUDIT.md`)의 판정표에서 gallery 열을 옮기고, 이 문서에 반영한 결과와 근거를 함께 적는다.

| 도메인 | 판정 (사전 조사) | 이 문서 반영 | 근거 |
|--------|----------------|------------|------|
| Unit | 적용 | ✅ 19 / 🔲 0 | 오류 클래스, 스키마, 서비스, 훅, 컴포넌트를 모의 객체로 격리할 수 있으며 현재 163건이 있다 |
| API | 적용 | ✅ 6 / 🔲 1 | `createGalleryRoutes` 가 6개 경로 그룹에 핸들러 14개를 제공하며, 호스트는 이를 그대로 라우트로 export 한다 |
| Integration | 제한적 | ✅ 6 / 🔲 0 | Prisma·apiWrapper·fetch 를 모두 호스트가 주입하므로 결합 범위가 로더와 서비스, 컴포넌트와 설정·fetch 로 한정된다. 클라이언트와 라우트 사이 응답 형식 불일치가 확인되어 계획 TC 를 추가했고, 2026-09-16 에 fetch 어댑터로 관리자 컴포넌트와 실제 라우트 핸들러를 연결한 계약 검증을 구현했다 |
| E2E | 제한적 | ✅ 1 | 페이지와 브라우저 흐름은 호스트 책임이다. 패키지 안에서는 jsdom 과 실제 라우트 핸들러를 연결한 왕복 흐름까지만 검증할 수 있으며, 2026-09-16 에 이 범위의 5건을 구현했다 |
| Security | 적용(재분류) | ✅ 6 / 🔲 2 | 보안 강화 커밋 `82f081f` 의 검증과 401 검증 28건을 파일 이동 없이 Security 로 재분류했다 |
| Accessibility | 적용, 0건 | ✅ 1 / 🔲 6 | 컴포넌트 7개와 프리셋 1개를 공개 API 로 내보내고 ARIA·키보드 처리를 구현했지만, 접근성 전용 검증은 2026-09-16 에 추가한 폼 컨트롤 이름·목록 항목 버튼 6건뿐이다 |
| Performance | 제한적 | SC 없음 | 서버 계층은 쿼리 인자를 조립해 호스트 Prisma 에 위임하므로 쿼리 성능은 호스트 DB 책임이다. 클라이언트 계산도 `slice`·`filter` 수준이어서 측정 기준을 세울 경로가 없다 |
| Load/Stress | 미적용 | SC 없음 | 패키지는 잠금이나 조건부 갱신 같은 동시성 제어를 두지 않고 Prisma 호출을 그대로 위임한다 |
| Smoke | 적용(구현됨) | ✅ 1 / 🔲 1 | `tests/smoke.test.ts` 2건은 소스 진입점만 확인하며, `exports` 8개 키와 dist 후처리는 검증하지 않는다 |
| Chaos | 미적용 | SC 없음 | DB·저장소·네트워크를 모두 호스트가 주입하며, 패키지에는 재시도나 타임아웃 로직이 없다 |

판정은 유지하되, 소스를 읽는 과정에서 다음 두 가지를 확인 필요 사항으로 남긴다. 두 항목 모두 실행으로 재현하지는 않았다.

- **Load/Stress 관련:** `togglePublish` 는 `published` 를 조회한 뒤 반전 값을 쓰는 방식이다(`src/services/index.ts:256-270`). 동시 요청 두 건이 같은 값을 읽으면 두 번 토글해도 한 번 토글한 결과가 된다.
- **Chaos 관련:** `remove`·`removeMany` 는 DB 행을 먼저 삭제한 뒤 `storage.deleteKeys` 를 호출한다(`src/services/index.ts:196-232`). `deleteKeys` 가 실패하면 DB 행은 이미 삭제된 상태로 예외가 전파되고, 라우트의 `callRevalidate` 도 실행되지 않는다(`src/server/route-handlers.ts:262-264`).

---

## 우선순위 갭

| 순위 | TC | 항목 | 우선순위 | 선행 조건 |
|------|----|------|---------|----------|
| 1 | TC-AC-001~005 | ARIA·키보드 구현분에 대한 자동 접근성 검증 (사전 조사 문서 우선순위 갭 5번) | High·Medium | 없음 (testing-library 설치됨). TC-AC-003 6번은 포커스 관리 정책 결정 |
| 2 | TC-S-007 | 라우트 경유 URL·키 검증과 `config.validation` 전달 | High | 없음 |
| 3 | TC-A-007 | 오류 응답 본문 계약과 비매핑 예외 전파 | Medium | 없음 |
| 4 | TC-S-008 | 인증 식별자 추출·권한 검사 경계값 | Medium | 없음 |
| 5 | TC-SM-002 | 서브패스 exports 와 dist 산출물 검증 | Medium | 테스트 절차에 빌드 단계 추가 |
| 6 | TC-AC-007 | axe 규칙 기반 자동 검사 | Medium | `axe-core` 또는 `vitest-axe` devDependency 추가 (`package.json` 수정) |

2026-09-15 판의 1순위 TC-I-005, 3순위 TC-I-006, 5순위 TC-E-001, 6순위 TC-U-019 와 2순위에 묶여 있던 TC-AC-006 은 2026-09-16 에 결함 수정(`bf72aa8`, `e9cbd7a`, `addd6b7`)과 함께 구현되어 갭에서 제외했다. 2026-09-13 판에서 1순위였던 TC-A-006(부분 수정 PUT 이 `published`·`featured`·`sortOrder`·`isActive` 기본값을 덮어씀)은 0.2.1 에서 결함이 수정되고 회귀 테스트 4건이 추가되어 갭에서 제외했다. 관리자 UI 요청 본문(`{ featured }`, `{ sortOrder }`)을 화면 조작부터 확인하는 검증은 TC-E-001 3·4번으로 구현되었다.

2026-09-16 결함 수정 중에 다음 사항을 확인했다. 결함 확인용 TC 의 범위 밖이고 동작 설계 결정이 필요하므로 수정하지 않았다.

- **저장 실패 응답을 확인하지 않음:** `GalleryAdminManager` 의 `handleSubmit`·`handleSubmitMany`·`handleDelete`·`handleToggleFeatured`·`handleReorder` 는 응답의 `res.ok` 를 확인하지 않는다 (`src/components/GalleryAdminManager.tsx:176-263`). TC-E-001 을 작성하면서 PUT 이 400 `ValidationError` 를 받았을 때 화면이 오류를 표시하지 않고 폼을 닫은 뒤 목록을 다시 불러오는 것을 실제 실행으로 확인했다. 입력한 내용은 사라진다. 오류 표시 위치와 문구를 정해야 한다.
- **목록이 첫 페이지 20건으로 제한됨:** `GalleryAdminManager` 는 `/api/admin/galleries` 를 쿼리 없이 요청하고, `collection.GET` 은 `limit` 기본값 20 으로 첫 페이지만 반환한다 (`src/utils/api-helpers.ts:8-15`). 임시 테스트에서 항목 25개 가운데 25번째만 featured·published 로 두면, 목록과 개수 표시는 20 이고 홈 프리뷰 타일은 0개였다. 클라이언트 검색과 featured 개수 계산도 첫 페이지 기준이 된다. 전체 페이지를 불러올지 페이지 UI 를 둘지 결정해야 한다.
- **일괄 생성으로 featured 상한을 넘을 수 있음:** 새 모드의 `canToggleFeatured` 는 `featuredCount < maxFeatured` 만 확인한다 (`src/components/GalleryAdminManager.tsx:276`). featured 가 6개인 상태에서 featured·published 로 이미지 3개를 일괄 생성하면 9개가 되며, 서버 라우트에도 상한 검사가 없다. 소스로만 확인했고 실행으로 재현하지는 않았다.

테스트 인프라에도 다음 공백이 있다.

- `package.json` 에 `test` 와 `test:watch` 만 있고 도메인별 스크립트가 없다. 이 문서의 도메인 구분은 파일 경로와 테스트 이름 필터에 의존한다.
- 커버리지 설정과 목표값이 없다.

---

## 리뷰 체크리스트

- [x] 테스트 파일 26개가 모두 TC 에 배정됨 (2026-09-16 문서와 `tests/` 목록 대조, 누락 0개)
- [x] 테스트 273건이 각각 TC 하나에만 배정됨 (도메인 합계와 실측 합계 일치)
- [x] 도메인별 실행 명령과 파일 내 분할 필터로 건수를 재현함 (2026-09-16: Unit 163, Integration 34, API 35, E2E 5, Security 28, Accessibility 6, Smoke 2)
- [x] 0.2.1 변경을 반영함: 회귀 테스트 4건을 TC-U-006·TC-U-007·TC-A-006 에 배정하고 TC-A-006 을 완료로 전환함. 수정 전 스키마(`29fd94c`)로 4건 실패를 재현함
- [x] 2026-09-16 결함 수정 3건을 반영함: TC-I-005·TC-I-006·TC-AC-006 을 완료로 전환하고 TC-U-019·TC-E-001 을 구현함. 수정 전 코드로 TC-I-005·TC-E-001 6건, TC-I-006 2건, TC-AC-006 6건의 실패를 확인함
- [x] 완료 TC 의 단계·예상 결과를 실제 테스트 이름과 단언에서 발췌함
- [x] 계획 TC 에 소스 위치를 명시하고, 결함 확인용 항목은 임시 실행으로 현재 동작을 확인함
- [x] 보안 기준(OWASP Top 10 2021)과 접근성 기준(WCAG 2.1)을 명시함
- [ ] 테스트 이름과 단언이 일치하지 않는 1건 정리 필요: `GalleryEditForm` "새 모드 (value=null) … onSubmit 호출 payload 검증"(실제 단언은 미호출). `GalleryAdminManager` "새로 생성 … POST 호출" 은 2026-09-16 에 단언과 이름을 맞춤
- [ ] 테스트 이름 필터 기반 도메인 구분은 테스트 이름이 바뀌면 깨지므로, 도메인별 스크립트 추가 또는 디렉토리 정리 여부 결정 필요
- [ ] 커버리지 설정과 목표값 결정 필요
- [x] 결함 확인용 TC 4건이 모두 수정 완료됨 (TC-A-006 은 0.2.1, TC-I-005·TC-I-006·TC-AC-006 은 2026-09-16)
- [ ] 접근성 계획 TC(TC-AC-001~005, TC-AC-007) 구현 필요
- [ ] 도메인 적용성 판정에 남긴 확인 필요 사항 2건(`togglePublish` 동시 토글, 저장소 삭제 실패 시 순서) 검토 필요
- [ ] 우선순위 갭에 남긴 2026-09-16 확인 사항 3건(저장 실패 응답 미확인, 목록 20건 제한, 일괄 생성의 featured 상한) 검토 필요
