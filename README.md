# @withwiz/gallery-kit

Host-independent gallery module for Next.js 16 + Prisma 7. Self-contained admin UI, headless lightbox, drop-in API route factories.

## Status

**v0.1.0** — Sprint 1–6 complete (`@withwiz/gallery-kit` scaffolding + validators + services + server layer + hooks/primitive UI + admin composite UI + Prisma partial + ballet preset + README). ballet 마이그레이션 (Sprint 7) 미실시.

## Features

- **Headless** — drop into any Next.js host via `setGalleryConfig` (Prisma client / API wrapper / storage / revalidate / i18n / limits).
- **Admin UI** — 5 composite components (`GalleryAdminManager`, `GalleryEditForm`, `GalleryHomePreview`, `GalleryManagerLayout`, `CategoryAdminManager`) + 2 primitives (`ImageDropZone`, `ToggleSwitch`). Self-contained 3-pane layout.
- **API routes** — `createGalleryRoutes(config)` returns Next.js Route Handlers for 6 endpoint groups (collection / item / publish toggle / bulk / category collection / category item).
- **RSC loaders** — `getGalleryItems`, `getFeaturedGalleries`, `getRecentGalleries`, `getGalleryCount` for server components / dashboards.
- **Public preset** — `PublicGalleryMosaic` (presets/ballet) — 1~7 tile adaptive mosaic + lightbox.
- **Headless lightbox hook** — `useGalleryLightbox` with ESC / Arrow key bindings + wrap-around.
- **Image upload primitive** — `useImageDropZone` + `<ImageDropZone>` (host-side validate + accept/maxSize).
- **Storage-agnostic** — R2 / S3 / local file system 등 어디든 호스트가 `config.storage` 로 주입.
- **Host model name-agnostic** — Prisma `Gallery` 모델은 host 의 User/Admin/Account 이름을 가정하지 않는다. `authorId: String` 컬럼만.
- **Typed error 계층** — `GalleryNotFoundError`, `CategoryNotFoundError`, `CategoryInUseError`, `PermissionDeniedError` 등 host 가 catch 후 자체 처리.

## Install

현재는 monorepo 안에서 file: 참조로 사용한다 (publish 미실시):

```bash
# host root
npm install file:../node-packages/withwiz-gallery
```

배포 후에는:

```bash
npm install @withwiz/gallery-kit
```

### Peer dependencies

| Package | Range |
|---|---|
| `next` | `>=16` |
| `react` / `react-dom` | `>=19` |
| `@prisma/client` | `>=7` |
| `zod` | `>=4` |
| `clsx` | `>=2` |
| `tailwind-merge` | `>=3` |
| `sonner` | `>=2` (optional) |

## Quick start

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
cp node_modules/@withwiz/gallery-kit/prisma/gallery.schema.prisma prisma/
npx prisma generate
npx prisma migrate dev --create-only
```

이 partial 은 `GalleryCategory`, `Gallery` 두 모델 + 인덱스 + `@@map` 을 정의한다. host 의 User 모델 이름과 무관하게 `authorId: String` 컬럼만 두므로 multi-file schema 머지 시 validate 가 통과한다.

ballet 처럼 enum 기반 기존 스키마에서 마이그레이션하는 경우 아래 [Migration from ballet enum-based schema](#migration-from-ballet-enum-based-schema) 섹션 참조.

### 2. `setGalleryConfig` (host bootstrap)

**module top-level 에서 호출해야 한다** (client component 가 mount 시 `getGalleryConfig()` 를 즉시 호출하므로).

```ts
// host: lib/gallery-config.ts
import { setGalleryConfig } from "@withwiz/gallery-kit/server";
import type { GalleryConfig } from "@withwiz/gallery-kit/server";
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
    // ... 나머지 키는 @withwiz/gallery-kit/types 의 GalleryI18nKey 참조
  },
};

setGalleryConfig(galleryConfig);
```

### 3. Route handler mount

각 엔드포인트마다 thin re-export.

```ts
// host: app/api/admin/galleries/route.ts
import { createGalleryRoutes } from "@withwiz/gallery-kit/server";
import { galleryConfig } from "@/lib/gallery-config";

const { collection } = createGalleryRoutes(galleryConfig);
export const { GET, POST, DELETE } = collection;
```

```ts
// host: app/api/admin/galleries/[id]/route.ts
import { createGalleryRoutes } from "@withwiz/gallery-kit/server";
import { galleryConfig } from "@/lib/gallery-config";

const { item } = createGalleryRoutes(galleryConfig);
export const { GET, PUT, DELETE } = item;
```

```ts
// host: app/api/admin/galleries/[id]/publish/route.ts
import { createGalleryRoutes } from "@withwiz/gallery-kit/server";
import { galleryConfig } from "@/lib/gallery-config";

const { publishToggle } = createGalleryRoutes(galleryConfig);
export const { PATCH } = publishToggle;
```

```ts
// host: app/api/admin/galleries/bulk/route.ts
import { createGalleryRoutes } from "@withwiz/gallery-kit/server";
import { galleryConfig } from "@/lib/gallery-config";

const { bulk } = createGalleryRoutes(galleryConfig);
export const { POST, PATCH } = bulk;
```

```ts
// host: app/api/admin/gallery-categories/route.ts
import { createGalleryRoutes } from "@withwiz/gallery-kit/server";
import { galleryConfig } from "@/lib/gallery-config";

const { categoryCollection } = createGalleryRoutes(galleryConfig);
export const { GET, POST } = categoryCollection;
```

```ts
// host: app/api/admin/gallery-categories/[id]/route.ts
import { createGalleryRoutes } from "@withwiz/gallery-kit/server";
import { galleryConfig } from "@/lib/gallery-config";

const { categoryItem } = createGalleryRoutes(galleryConfig);
export const { GET, PUT, DELETE } = categoryItem;
```

### 4. Admin UI mount

```tsx
// host: app/admin/galleries/page.tsx
import { GalleryAdminManager } from "@withwiz/gallery-kit/components";
import "@withwiz/gallery-kit/components/gallery.css";
import "@/lib/gallery-config"; // setGalleryConfig 가 module side effect

export default function GalleryAdminPage() {
  return <GalleryAdminManager />;
}
```

```tsx
// host: app/admin/galleries/new/page.tsx
import { GalleryAdminManager } from "@withwiz/gallery-kit/components";
import "@/lib/gallery-config";

export default function GalleryNewPage() {
  return <GalleryAdminManager initialMode="new" />;
}
```

```tsx
// host: app/admin/galleries/[id]/page.tsx
import { GalleryAdminManager } from "@withwiz/gallery-kit/components";
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
import { CategoryAdminManager } from "@withwiz/gallery-kit/components";
import "@/lib/gallery-config";

export default function CategoryAdminPage() {
  return <CategoryAdminManager />;
}
```

### 5. Public gallery (RSC + client)

```tsx
// host: app/page.tsx (RSC)
import { PublicGalleryMosaic } from "@withwiz/gallery-kit/presets/ballet";
import { getFeaturedGalleries } from "@withwiz/gallery-kit/server";
import { galleryConfig } from "@/lib/gallery-config";
import "@withwiz/gallery-kit/components/gallery.css";

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

## API Reference

### `@withwiz/gallery-kit` (main entry)

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
} from "@withwiz/gallery-kit";
```

### `@withwiz/gallery-kit/server`

| Export | Signature |
|---|---|
| `setGalleryConfig(config)` | DI setter — module top-level 에서 1회 호출 |
| `getGalleryConfig()` | 현재 등록된 config 반환 (미설정이면 throw) |
| `createGalleryService(config)` | CRUD 객체 (list / get / create / update / remove / bulk*) |
| `createCategoryService(config)` | 카테고리 CRUD 객체 (list / getBySlug / create / update / remove / reorder) |
| `createGalleryRoutes(config)` | Next.js Route Handler 6 그룹 (`collection / item / publishToggle / bulk / categoryCollection / categoryItem`) |
| `getGalleryItems(config, opts)` | RSC 페이지네이션 loader |
| `getFeaturedGalleries(config, limit?)` | RSC featured 목록 |
| `getRecentGalleries(config, limit)` | RSC 최근 항목 (dashboard) |
| `getGalleryCount(config, opts?)` | RSC 카운트 (dashboard) |
| `buildPaginatedResult(items, page, limit, total)` | helper |

Typed errors (모두 server entry 에서도 re-export):

- `GalleryError` (base)
- `GalleryNotFoundError`
- `CategoryNotFoundError`
- `CategoryInUseError`
- `PermissionDeniedError`

### `@withwiz/gallery-kit/components`

| Export | Description |
|---|---|
| `GalleryAdminManager` | 3-pane 어드민 마운트 포인트 (`initialMode? / initialSelectedId?`) |
| `GalleryManagerLayout` | 3-pane primitive (좌=list / 중=form / 우=preview) |
| `GalleryEditForm` | 단일/다중 모드 form (`value / multipleMode / onSubmit / onSubmitMany`) |
| `GalleryHomePreview` | 7-tile 모자이크 + drag 재정렬 + 별 토글 |
| `CategoryAdminManager` | 카테고리 CRUD UI |
| `ImageDropZone` | 이미지 드롭존 (accept / maxSize / multiple / disabled / validate) |
| `ToggleSwitch` | size sm/md/lg, ARIA switch role |

CSS (host 가 명시 import):

```ts
import "@withwiz/gallery-kit/components/gallery.css";
```

### `@withwiz/gallery-kit/hooks`

| Export | Signature |
|---|---|
| `useGalleryLightbox(images)` | `{ isOpen, currentIndex, current, open, close, next, prev }` — ESC / Arrow 자동 바인딩, wrap-around |
| `useImageDropZone(opts)` | headless 드롭존 — `inputProps / containerProps / files / rejectedReasons / clear` |
| `useScrollReveal(opts?)` | IntersectionObserver 기반 fade-in — `{ ref, isVisible }` |

### `@withwiz/gallery-kit/validators`

```ts
import { createGallerySchemas } from "@withwiz/gallery-kit/validators";

const schemas = createGallerySchemas({
  batchMax: 20,
  captionMaxLength: 200,
});
// schemas.CreateGallerySchema / UpdateGallerySchema / BatchCreateGallerySchema
// / BulkUpdateSchema / CreateCategorySchema / UpdateCategorySchema / ReorderCategorySchema
```

### `@withwiz/gallery-kit/types`

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
} from "@withwiz/gallery-kit/types";
```

### `@withwiz/gallery-kit/presets/ballet`

```ts
import { PublicGalleryMosaic } from "@withwiz/gallery-kit/presets/ballet";
import type { PublicGalleryMosaicProps } from "@withwiz/gallery-kit/presets/ballet";
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

## Host-independence guarantees

- **Zero `@withwiz/pms` imports** — 본 패키지는 도메인 패키지에 의존하지 않는다.
- **Zero `process.env` 직접 의존** — 환경 변수는 host 가 읽어 `config.storage` 등에 binding.
- **No assumption on host's User model name** — Prisma `Gallery` 모델은 `authorId: String` 컬럼만 두고 `@relation` 정의하지 않는다.
- **All infrastructure injected via `GalleryConfig`** — Prisma client / API wrapper / storage / revalidate / i18n / limits 모두 주입.
- **Storage / auth / revalidate 는 host 책임** — 본 패키지는 키/경로만 다루고 실제 R2/S3/로컬 호출은 host 의 `config.storage.deleteKeys` 등에 위임.
- **No `next/image`, `next/navigation`, `useI18n` 직접 의존 in `presets/ballet`** — 이미지는 plain `<img>`, 라벨은 props.

## CSS customization

host 의 root CSS 에서 CSS variable 을 override.

```css
/* host: app/globals.css */
:root {
  --gallery-accent: 212 175 55;   /* RGB triplet (NOT hex) */
  --gallery-bg: 10 10 10;
  --gallery-fg: 254 254 254;
  --gallery-border: 30 30 30;
}
```

본 패키지는 위 4 variable 을 `:where(.gallery-toggle, .gallery-dropzone, .gallery-manager, .gallery-edit-form, .gallery-home-preview, .gallery-category-admin, .gallery-public-mosaic, .gallery-lightbox, ...)` 안에 fallback 값으로 정의해 두므로, host 가 override 하지 않아도 즉시 동작한다 (다크 톤 / 골드 액센트 기본).

추가로 어드민 컴포넌트는 `config.ui.classNames[slot]` / `config.ui.slots[slot]` 으로 slot 별 customization 가능.

## Migration from ballet enum-based schema

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

## Architecture

```
@withwiz/toolkit            (가장 낮음)
   ↑
@withwiz/pms                (공연관리 도메인 CMS)
   ↑                        ↑
   │                        │ host 로서 끌어 씀
host app (ballet, yeroom)   │
   ↓                        │
   └─→ @withwiz/gallery-kit ┘  (이 패키지 — 어떤 host 에도 의존하지 않음)
```

`@withwiz/gallery-kit` 은 어떤 host 프로젝트 (ballet, yeroom 등)에도, 어떤 도메인 패키지 (`@withwiz/pms` 등)에도, host 의 도메인 모델 (`User`, `Admin`, `Account` 등) 에도 일절 의존하지 않는다. host 가 무엇을 쓰든 (Next 16 / Prisma 7 가정) `setGalleryConfig` 한 번으로 통합 가능하다.

## Repository layout

```
node-packages/withwiz-gallery/
├── package.json
├── tsup.config.ts
├── README.md
├── prisma/
│   ├── gallery.schema.prisma            # GalleryCategory + Gallery 모델 partial
│   └── migrations/
│       └── 2026-05-24-enum-to-table.sql # ballet enum → table backfill
├── docs/superpowers/{specs,plans}/      # 설계 문서 + sprint contracts/reports
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

## Scripts

```bash
npm run build       # tsup multi-entry CJS/ESM/DTS
npm test            # vitest run (221 tests, 23 files)
npm run test:watch  # vitest watch
```

## License

MIT
