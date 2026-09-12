# @withwiz/gallery

[English](./README.md) | **한국어**

Next.js 16 + Prisma 7 호스트에 독립적으로 동작하는 갤러리 모듈. 자가완결형 어드민 UI, 헤드리스 라이트박스, 드롭인 API 라우트 팩토리를 제공한다.

## 상태

**v0.1.0** — Sprint 1–6 완료 (`@withwiz/gallery` 스캐폴딩 + validators + services + server layer + hooks/primitive UI + admin composite UI + Prisma partial + ballet preset + README). ballet 마이그레이션 (Sprint 7) 미실시.

## 주요 기능

- **헤드리스** — `setGalleryConfig` 한 번 호출로 어떤 Next.js 호스트에도 주입 (Prisma client / API wrapper / storage / revalidate / i18n / limits).
- **어드민 UI** — 5개 컴포지트 컴포넌트 (`GalleryAdminManager`, `GalleryEditForm`, `GalleryHomePreview`, `GalleryManagerLayout`, `CategoryAdminManager`) + 2개 프리미티브 (`ImageDropZone`, `ToggleSwitch`). 자가완결 3-pane 레이아웃.
- **API 라우트** — `createGalleryRoutes(config)` 가 6개 엔드포인트 그룹의 Next.js Route Handler 를 반환 (collection / item / publish toggle / bulk / category collection / category item).
- **RSC 로더** — `getGalleryItems`, `getFeaturedGalleries`, `getRecentGalleries`, `getGalleryCount` — 서버 컴포넌트 / 대시보드 용.
- **퍼블릭 프리셋** — `PublicGalleryMosaic` (presets/ballet) — 1~7장 적응형 모자이크 + 라이트박스.
- **헤드리스 라이트박스 훅** — `useGalleryLightbox` — ESC / Arrow 키 자동 바인딩 + wrap-around.
- **이미지 업로드 프리미티브** — `useImageDropZone` + `<ImageDropZone>` (호스트 측 validate + accept/maxSize).
- **스토리지 비종속** — R2 / S3 / 로컬 파일시스템 등 어디든 호스트가 `config.storage` 로 주입.
- **호스트 모델명 비종속** — Prisma `Gallery` 모델은 호스트의 User/Admin/Account 이름을 가정하지 않는다. `authorId: String` 컬럼만.
- **타입 에러 계층** — `GalleryNotFoundError`, `CategoryNotFoundError`, `CategoryInUseError`, `PermissionDeniedError` 등 호스트가 catch 후 자체 처리.

## 설치

현재는 모노레포 안에서 file: 참조로 사용한다 (npm publish 미실시):

```bash
# host root
npm install file:../node-packages/withwiz-gallery
```

배포 후에는:

```bash
npm install @withwiz/gallery
```

### Peer dependencies

| 패키지 | 버전 범위 |
|---|---|
| `next` | `>=16` |
| `react` / `react-dom` | `>=19` |
| `@prisma/client` | `>=7` |
| `zod` | `>=4` |
| `clsx` | `>=2` |
| `tailwind-merge` | `>=3` |
| `sonner` | `>=2` (선택) |

## 빠른 시작

### 1. Prisma schema 머지

host 의 `prisma/` 디렉토리에 본 패키지의 partial schema 를 복사 또는 symlink.

```jsonc
// host package.json
{
  "prisma": { "schema": "./prisma" }
}
```

```bash
# host 측 작업
cp node_modules/@withwiz/gallery/prisma/gallery.schema.prisma prisma/
npx prisma generate
npx prisma migrate dev --create-only
```

이 partial 은 `GalleryCategory`, `Gallery` 두 모델 + 인덱스 + `@@map` 을 정의한다. host 의 User 모델 이름과 무관하게 `authorId: String` 컬럼만 두므로 multi-file schema 머지 시 validate 가 통과한다.

ballet 처럼 enum 기반 기존 스키마에서 마이그레이션하는 경우 아래 [Migration from ballet enum-based schema](#migration-from-ballet-enum-based-schema) 섹션 참조.

### 2. `setGalleryConfig` (host bootstrap)

**module top-level 에서 호출해야 한다** (client component 가 mount 시 `getGalleryConfig()` 를 즉시 호출하므로).

```ts
// host: lib/gallery-config.ts
import { setGalleryConfig } from "@withwiz/gallery/server";
import type { GalleryConfig } from "@withwiz/gallery/server";
import { prisma } from "./prisma";
import { withAdminApi } from "@/lib/api-middleware"; // host 의 인증 래퍼
import { isR2Enabled, collectR2Keys, deleteR2Keys } from "@/lib/r2";
import { revalidatePath } from "next/cache";

export const galleryConfig: GalleryConfig = {
  prisma,
  apiWrapper: withAdminApi,
  authorIdFromContext: (ctx) => ctx.user!.id,
  limits: {
    maxFeatured: 7,
    mosaicCount: 7,
    batchMax: 20,
    captionMaxLength: 200,
  },
  revalidate: revalidatePath,
  revalidatePaths: ["/", "/home/v1"],
  // 선택 — 생략하면 apiWrapper 를 통과한 사용자 전원에게 모든 권한 부여
  permissions: {
    canEdit: (ctx, g) => ctx.user?.role === "owner" || g.authorId === ctx.user?.id,
    canDelete: (ctx, g) => ctx.user?.role === "owner" || g.authorId === ctx.user?.id,
    canManageCategories: (ctx) => ctx.user?.role === "owner",
  },
  // 선택 — 생략하면 안전한 기본값 적용 ("보안 참고" 절 참조)
  validation: {
    imageUrlHosts: ["cdn.example.com"],
    imageKeyPattern: /^gallery\/[A-Za-z0-9._-]+$/,
  },
  storage: {
    isEnabled: isR2Enabled,
    collectKeys: collectR2Keys,
    deleteKeys: deleteR2Keys,
  },
  i18n: {
    "admin.title": "갤러리 관리",
    "admin.newButton": "새 이미지",
    "form.caption": "캡션",
    "form.save": "저장",
    "form.cancel": "취소",
    // ... 나머지 키는 @withwiz/gallery/types 의 GalleryI18nKey 참조
  },
};

setGalleryConfig(galleryConfig);
```

### 3. Route handler mount

각 엔드포인트마다 thin re-export.

```ts
// host: app/api/admin/galleries/route.ts
import { createGalleryRoutes } from "@withwiz/gallery/server";
import { galleryConfig } from "@/lib/gallery-config";

const { collection } = createGalleryRoutes(galleryConfig);
export const { GET, POST, DELETE } = collection;
```

```ts
// host: app/api/admin/galleries/[id]/route.ts
import { createGalleryRoutes } from "@withwiz/gallery/server";
import { galleryConfig } from "@/lib/gallery-config";

const { item } = createGalleryRoutes(galleryConfig);
export const { GET, PUT, DELETE } = item;
```

```ts
// host: app/api/admin/galleries/[id]/publish/route.ts
import { createGalleryRoutes } from "@withwiz/gallery/server";
import { galleryConfig } from "@/lib/gallery-config";

const { publishToggle } = createGalleryRoutes(galleryConfig);
export const { PATCH } = publishToggle;
```

```ts
// host: app/api/admin/galleries/bulk/route.ts
import { createGalleryRoutes } from "@withwiz/gallery/server";
import { galleryConfig } from "@/lib/gallery-config";

const { bulk } = createGalleryRoutes(galleryConfig);
export const { POST, PATCH } = bulk;
```

```ts
// host: app/api/admin/gallery-categories/route.ts
import { createGalleryRoutes } from "@withwiz/gallery/server";
import { galleryConfig } from "@/lib/gallery-config";

const { categoryCollection } = createGalleryRoutes(galleryConfig);
export const { GET, POST } = categoryCollection;
```

```ts
// host: app/api/admin/gallery-categories/[id]/route.ts
import { createGalleryRoutes } from "@withwiz/gallery/server";
import { galleryConfig } from "@/lib/gallery-config";

const { categoryItem } = createGalleryRoutes(galleryConfig);
export const { GET, PUT, DELETE } = categoryItem;
```

### 4. Admin UI mount

```tsx
// host: app/admin/galleries/page.tsx
import { GalleryAdminManager } from "@withwiz/gallery/components";
import "@withwiz/gallery/components/gallery.css";
import "@/lib/gallery-config"; // setGalleryConfig 가 module side effect

export default function GalleryAdminPage() {
  return <GalleryAdminManager />;
}
```

```tsx
// host: app/admin/galleries/new/page.tsx
import { GalleryAdminManager } from "@withwiz/gallery/components";
import "@/lib/gallery-config";

export default function GalleryNewPage() {
  return <GalleryAdminManager initialMode="new" />;
}
```

```tsx
// host: app/admin/galleries/[id]/page.tsx
import { GalleryAdminManager } from "@withwiz/gallery/components";
import "@/lib/gallery-config";

export default async function GalleryEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GalleryAdminManager initialSelectedId={id} />;
}
```

```tsx
// host: app/admin/gallery-categories/page.tsx
import { CategoryAdminManager } from "@withwiz/gallery/components";
import "@/lib/gallery-config";

export default function CategoryAdminPage() {
  return <CategoryAdminManager />;
}
```

### 5. Public gallery (RSC + client)

```tsx
// host: app/page.tsx (RSC)
import { PublicGalleryMosaic } from "@withwiz/gallery/presets/ballet";
import { getFeaturedGalleries } from "@withwiz/gallery/server";
import { galleryConfig } from "@/lib/gallery-config";
import "@withwiz/gallery/components/gallery.css";

export default async function HomePage() {
  const featured = await getFeaturedGalleries(galleryConfig, 7);
  const images = featured.map((g) => ({
    src: g.imageUrl,
    alt: g.caption ?? "갤러리",
  }));
  return (
    <PublicGalleryMosaic
      images={images}
      count={7}
      i18n={{ sectionLabel: "갤러리", moments: "공연의 순간들" }}
    />
  );
}
```

## API 레퍼런스

### `@withwiz/gallery` (메인 entry)

```ts
import {
  setGalleryConfig,
  getGalleryConfig,
  cn,
  getVariantUrl,
  GalleryError,
  GalleryNotFoundError,
  CategoryNotFoundError,
  CategoryInUseError,
  PermissionDeniedError,
} from "@withwiz/gallery";
```

### `@withwiz/gallery/server`

| Export | 시그니처 |
|---|---|
| `setGalleryConfig(config)` | DI setter — 모듈 top-level 에서 1회 호출 |
| `getGalleryConfig()` | 현재 등록된 config 반환 (미설정이면 throw) |
| `createGalleryService(config)` | CRUD 객체 (list / get / create / update / remove / bulk*) |
| `createCategoryService(config)` | 카테고리 CRUD 객체 (list / getBySlug / create / update / remove / reorder) |
| `createGalleryRoutes(config)` | Next.js Route Handler 6 그룹 (`collection / item / publishToggle / bulk / categoryCollection / categoryItem`) |
| `getGalleryItems(config, opts)` | RSC 페이지네이션 loader |
| `getFeaturedGalleries(config, limit?)` | RSC featured 목록 |
| `getRecentGalleries(config, limit)` | RSC 최근 항목 (dashboard) |
| `getGalleryCount(config, opts?)` | RSC 카운트 (dashboard) |
| `buildPaginatedResult(items, page, limit, total)` | helper |

타입 에러 (모두 server entry 에서도 re-export):

- `GalleryError` (base)
- `GalleryNotFoundError`
- `CategoryNotFoundError`
- `CategoryInUseError`
- `PermissionDeniedError`

### `@withwiz/gallery/components`

| Export | 설명 |
|---|---|
| `GalleryAdminManager` | 3-pane 어드민 마운트 포인트 (`initialMode? / initialSelectedId?`) |
| `GalleryManagerLayout` | 3-pane primitive (좌=list / 중=form / 우=preview) |
| `GalleryEditForm` | 단일/다중 모드 form (`value / multipleMode / onSubmit / onSubmitMany`) |
| `GalleryHomePreview` | 7-tile 모자이크 + drag 재정렬 + 별 토글 |
| `CategoryAdminManager` | 카테고리 CRUD UI |
| `ImageDropZone` | 이미지 드롭존 (accept / maxSize / multiple / disabled / validate) |
| `ToggleSwitch` | size sm/md/lg, ARIA switch role |

CSS (호스트가 명시 import):

```ts
import "@withwiz/gallery/components/gallery.css";
```

### `@withwiz/gallery/hooks`

| Export | 시그니처 |
|---|---|
| `useGalleryLightbox(images)` | `{ isOpen, currentIndex, current, open, close, next, prev }` — ESC / Arrow 자동 바인딩, wrap-around |
| `useImageDropZone(opts)` | 헤드리스 드롭존 — `inputProps / containerProps / files / rejectedReasons / clear` |
| `useScrollReveal(opts?)` | IntersectionObserver 기반 fade-in — `{ ref, isVisible }` |

### `@withwiz/gallery/validators`

```ts
import { createGallerySchemas } from "@withwiz/gallery/validators";

const schemas = createGallerySchemas({
  batchMax: 20,
  captionMaxLength: 200,
});
// schemas.CreateGallerySchema / UpdateGallerySchema / BatchCreateGallerySchema
// / BulkUpdateSchema / CreateCategorySchema / UpdateCategorySchema / ReorderCategorySchema
```

### `@withwiz/gallery/types`

```ts
import type {
  GalleryConfig,
  GalleryI18nKey,
  GallerySlotName,
  GalleryListItem,
  GalleryDetail,
  GalleryCategoryItem,
  CreateGalleryInput,
  UpdateGalleryInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  PaginatedResult,
  PaginationMeta,
  SortOrder,
  PrismaLike,
  ApiContext,
  RouteHandler,
  ApiWrapper,
} from "@withwiz/gallery/types";
```

### `@withwiz/gallery/presets/ballet`

```ts
import { PublicGalleryMosaic } from "@withwiz/gallery/presets/ballet";
import type { PublicGalleryMosaicProps } from "@withwiz/gallery/presets/ballet";
```

Signature:

```ts
function PublicGalleryMosaic(props: {
  images: { src: string; alt?: string }[];
  count?: number;          // default 7
  i18n?: {
    sectionLabel?: string;
    moments?: string;
    expandAria?: string;
    lbClose?: string;
    lbPrev?: string;
    lbNext?: string;
  };
  className?: string;
  scrollReveal?: boolean;  // default true
  hideHeader?: boolean;    // default false
}): JSX.Element | null;
```

## 호스트 비종속 보증

- **`@withwiz/pms` import 0** — 본 패키지는 도메인 패키지에 의존하지 않는다.
- **`process.env` 직접 의존 0** — 환경 변수는 호스트가 읽어 `config.storage` 등에 binding.
- **호스트의 User 모델명 가정 없음** — Prisma `Gallery` 모델은 `authorId: String` 컬럼만 두고 `@relation` 정의하지 않는다.
- **모든 인프라는 `GalleryConfig` 로 주입** — Prisma client / API wrapper / storage / revalidate / i18n / limits 모두 주입.
- **Storage / auth / revalidate 는 호스트 책임** — 본 패키지는 키/경로만 다루고 실제 R2/S3/로컬 호출은 호스트의 `config.storage.deleteKeys` 등에 위임.
- **`presets/ballet` 에서 `next/image`, `next/navigation`, `useI18n` 직접 의존 없음** — 이미지는 plain `<img>`, 라벨은 props.

## 보안 참고

- **인증은 전적으로 호스트의 `apiWrapper` 책임이다.** 비공개 항목까지 반환하는 목록 GET 을 포함해 모든 admin 라우트는 래퍼가 통과시킨 요청을 그대로 신뢰한다. 래퍼는 관리자 세션을 검증해야 하며, admin 컴포넌트가 쿠키를 함께 전송하므로(`credentials: "include"`) CSRF 방어도 갖춰야 한다.
- **`permissions` 훅은 bulk 라우트에도 적용된다.** `canDelete` 는 collection `DELETE`(ids) 를, `canEdit` 는 `bulk PATCH` 를 검사한다. 대상 전원이 통과해야 하며 하나라도 거부되면 요청 전체가 403 으로 거부된다(부분 성공 없음). `canManageCategories` 는 카테고리 생성 / 수정 / 삭제를 검사한다.
- **`imageUrl` 은 기본적으로 `https:` / `http:` 프로토콜만 허용한다** (`javascript:`, `data:` 거부). `validation.imageUrlProtocols` / `validation.imageUrlHosts` 로 더 좁힐 수 있다.
- **`imageKey` 는 `storage.deleteKeys` 에 전달되기 전에 형식 검증을 거친다.** 기본 패턴은 `[A-Za-z0-9._-/]` 만 허용하고 선행 슬래시, `//`, `..` 세그먼트를 금지하며 512자로 제한한다. 버킷 접두사를 강제하려면 `validation.imageKeyPattern` 을 지정한다. `storage.collectKeys` 도 키를 신뢰하지 않는 방향으로 구현해야 한다.
- **`search` 는 DB 조회 전에 `validation.searchMaxLength`(기본 100) 로 잘린다.**
- **peer 의존성 `next` 는 패치된 릴리스를 유지한다.** 본 패키지는 버전을 고정하지 않으므로 호스트에서 `npm audit` 을 수행해야 한다.

## CSS 커스터마이즈

호스트의 root CSS 에서 CSS variable 을 override.

```css
/* host: app/globals.css */
:root {
  --gallery-accent: 212 175 55;   /* RGB triplet (NOT hex) */
  --gallery-bg: 10 10 10;
  --gallery-fg: 254 254 254;
  --gallery-border: 30 30 30;
}
```

본 패키지는 위 4 variable 을 `:where(.gallery-toggle, .gallery-dropzone, .gallery-manager, .gallery-edit-form, .gallery-home-preview, .gallery-category-admin, .gallery-public-mosaic, .gallery-lightbox, ...)` 안에 fallback 값으로 정의해 두므로, 호스트가 override 하지 않아도 즉시 동작한다 (다크 톤 / 골드 액센트 기본).

추가로 어드민 컴포넌트는 `config.ui.classNames[slot]` / `config.ui.slots[slot]` 으로 slot 별 커스터마이즈 가능.

## ballet enum 기반 스키마에서 마이그레이션

ballet 의 기존 schema:

```prisma
enum GalleryCategory { PERFORMANCE | REHEARSAL | ACTIVITY | ARTIST }
model Gallery {
  category GalleryCategory
  // ...
}
```

본 패키지의 새 schema 는 `gallery_categories` 테이블 + `Gallery.categoryId` FK 로 전환한다. 마이그레이션 단계:

1. host 의 `prisma/` 에 본 패키지의 `gallery.schema.prisma` 를 머지 (복사 또는 symlink).
2. `npx prisma migrate dev --create-only` 로 마이그레이션 SQL 자동 생성.
3. 생성된 SQL 에서 `DROP COLUMN category` / `DROP TYPE "GalleryCategory"` 부분을 수동 제거 (별도 후속 마이그레이션으로 분리).
4. `prisma/migrations/2026-05-24-enum-to-table.sql` (본 패키지가 동봉) 의 내용을 그 위치에 삽입 — 4개 카테고리 seed + `galleries.category_id` 백필 + PL/pgSQL 검증 블록.
5. `npx prisma migrate dev` 로 적용.
6. 검증 통과 시 두 번째 마이그레이션 (별도 파일) 에서 enum 컬럼/타입 DROP.

본 패키지의 `prisma/migrations/2026-05-24-enum-to-table.sql` 파일을 그대로 참조하라.

ballet 코드 (`src/components/sections/Gallery.tsx` 의 `gallery-mosaic` / `lightbox-*` 클래스) 와 본 패키지의 `gallery-public-mosaic` / `gallery-lightbox__*` 클래스는 prefix 가 다르므로 격리된다. ballet 마이그레이션 시 기존 main.css 의 해당 클래스를 제거하고 본 패키지의 `gallery.css` 만 import 하면 된다.

## 아키텍처

```
@withwiz/toolkit            (가장 낮음)
   ↑
@withwiz/pms                (공연관리 도메인 CMS)
   ↑                        ↑
   │                        │ host 로서 끌어 씀
host app (ballet, yeroom)   │
   ↓                        │
   └─→ @withwiz/gallery ┘  (이 패키지 — 어떤 호스트에도 의존하지 않음)
```

`@withwiz/gallery` 은 어떤 호스트 프로젝트 (ballet, yeroom 등)에도, 어떤 도메인 패키지 (`@withwiz/pms` 등)에도, 호스트의 도메인 모델 (`User`, `Admin`, `Account` 등) 에도 일절 의존하지 않는다. 호스트가 무엇을 쓰든 (Next 16 / Prisma 7 가정) `setGalleryConfig` 한 번으로 통합 가능하다.

## 저장소 구조

```
node-packages/withwiz-gallery/
├── package.json
├── tsup.config.ts
├── README.md
├── prisma/
│   ├── gallery.schema.prisma            # GalleryCategory + Gallery 모델 partial
│   └── migrations/
│       └── 2026-05-24-enum-to-table.sql # ballet enum → table backfill
└── src/
    ├── index.ts              # main entry — config, types, errors, utils
    ├── config.ts
    ├── errors.ts
    ├── types/                # GalleryConfig / domain / pagination / api-context / i18n
    ├── validators/           # createGallerySchemas
    ├── services/             # createGalleryService / createCategoryService / helpers
    ├── server/               # createGalleryRoutes + loaders + server re-exports
    ├── components/           # admin UI + ImageDropZone + ToggleSwitch + gallery.css
    ├── hooks/                # useGalleryLightbox / useImageDropZone / useScrollReveal
    ├── utils/                # cn / image-variants / api-helpers
    └── presets/
        └── ballet.tsx        # PublicGalleryMosaic
```

## 스크립트

```bash
npm run build       # tsup multi-entry CJS/ESM/DTS
npm test            # vitest run (221 tests, 23 files)
npm run test:watch  # vitest watch
```

## 라이선스

MIT
