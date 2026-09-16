# @withwiz/gallery

**English** | [한국어](./README.ko.md)

Host-independent gallery module for Next.js 16 + Prisma 7. Self-contained admin UI, headless lightbox, drop-in API route factories.

## Status

**v0.1.0** — Sprints 1–6 complete (`@withwiz/gallery` scaffold + validators + services + server layer + hooks/primitive UI + admin composite UI + Prisma partial + ballet preset + README). Sprint 7 (ballet migration) not yet executed.

## Features

- **Headless** — drop into any Next.js host via `setGalleryConfig` (Prisma client / API wrapper / storage / revalidate / i18n / limits).
- **Admin UI** — 5 composite components (`GalleryAdminManager`, `GalleryEditForm`, `GalleryHomePreview`, `GalleryManagerLayout`, `CategoryAdminManager`) + 2 primitives (`ImageDropZone`, `ToggleSwitch`). Self-contained 3-pane layout.
- **API routes** — `createGalleryRoutes(config)` returns Next.js Route Handlers for 6 endpoint groups (collection / item / publish toggle / bulk / category collection / category item).
- **RSC loaders** — `getGalleryItems`, `getFeaturedGalleries`, `getRecentGalleries`, `getGalleryCount` for server components / dashboards.
- **Public preset** — `PublicGalleryMosaic` (presets/mosaic) — 1–7 tile adaptive mosaic + lightbox. `presets/ballet` remains as a deprecated alias.
- **Headless lightbox hook** — `useGalleryLightbox` with ESC / Arrow key bindings + wrap-around.
- **Image upload primitive** — `useImageDropZone` + `<ImageDropZone>` (host-side validate + accept/maxSize).
- **Storage-agnostic** — R2 / S3 / local filesystem — host injects via `config.storage`.
- **Host-model-name-agnostic** — the Prisma `Gallery` model makes no assumption about the host's User/Admin/Account model name. Only an `authorId: String` column.
- **Typed error hierarchy** — `GalleryNotFoundError`, `CategoryNotFoundError`, `CategoryInUseError`, `PermissionDeniedError` for the host to catch and handle.

## Install

Currently consumed via `file:` reference inside the monorepo (not yet published to npm):

```bash
# host root
npm install file:../node-packages/withwiz-gallery
```

After publishing:

```bash
npm install @withwiz/gallery
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

### 1. Merge the Prisma schema

Copy or symlink this package's partial schema into the host's `prisma/` directory.

```jsonc
// host package.json
{
  "prisma": { "schema": "./prisma" }
}
```

```bash
# in the host
cp node_modules/@withwiz/gallery/prisma/gallery.schema.prisma prisma/
npx prisma generate
npx prisma migrate dev --create-only
```

The partial defines two models (`GalleryCategory`, `Gallery`) plus indexes and `@@map`. Because `authorId` is a plain `String` column (no `@relation`), the host's User-model name is irrelevant and the multi-file schema validates cleanly.

Migrating from a ballet-style enum-based schema? See [Migration from ballet enum-based schema](#migration-from-ballet-enum-based-schema) below.

### 2. `setGalleryConfig` (host bootstrap)

**Call this at module top-level** — client components invoke `getGalleryConfig()` on mount.

```ts
// host: lib/gallery-config.ts
import { setGalleryConfig } from "@withwiz/gallery/server";
import type { GalleryConfig } from "@withwiz/gallery/server";
import { prisma } from "./prisma";
import { withAdminApi } from "@/lib/api-middleware"; // host's auth wrapper
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
  // optional — omit to allow every apiWrapper-authenticated user everything
  permissions: {
    canEdit: (ctx, g) => ctx.user?.role === "owner" || g.authorId === ctx.user?.id,
    canDelete: (ctx, g) => ctx.user?.role === "owner" || g.authorId === ctx.user?.id,
    canManageCategories: (ctx) => ctx.user?.role === "owner",
  },
  // optional — safe defaults apply when omitted (see "Security notes")
  validation: {
    imageUrlHosts: ["cdn.example.com"],
    imageKeyPattern: /^gallery\/[A-Za-z0-9._-]+$/,
  },
  i18n: {
    "admin.title": "Gallery",
    "admin.newButton": "New image",
    "form.caption": "Caption",
    "form.save": "Save",
    "form.cancel": "Cancel",
    // see @withwiz/gallery/types → GalleryI18nKey for the full key list
  },
};

setGalleryConfig(galleryConfig);
```

### 3. Mount route handlers

Thin re-export per endpoint.

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

### 4. Mount the admin UI

```tsx
// host: app/admin/galleries/page.tsx
import { GalleryAdminManager } from "@withwiz/gallery/components";
import "@withwiz/gallery/components/gallery.css";
import "@/lib/gallery-config"; // setGalleryConfig as a module side effect

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

Uploading is the host's job. Pass `onImageSelect` so new images can be selected; without it the edit form shows an upload-handler error. Functions cannot be passed from a Server Component, so wrap the manager in a Client Component:

```tsx
// host: app/admin/galleries/GalleryAdminClient.tsx
"use client";
import { GalleryAdminManager, type GalleryAdminManagerProps } from "@withwiz/gallery/components";

async function uploadImage(file: File): Promise<{ url: string; key?: string }> {
  // the upload endpoint and response shape are host-specific
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body, credentials: "include" });
  const json = await res.json();
  return { url: json.data.url, key: json.data.key };
}

export function GalleryAdminClient(props: Omit<GalleryAdminManagerProps, "onImageSelect">) {
  return <GalleryAdminManager {...props} onImageSelect={uploadImage} />;
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
import { PublicGalleryMosaic } from "@withwiz/gallery/presets/mosaic";
import { getFeaturedGalleries } from "@withwiz/gallery/server";
import { galleryConfig } from "@/lib/gallery-config";
import "@withwiz/gallery/components/gallery.css";

export default async function HomePage() {
  const featured = await getFeaturedGalleries(galleryConfig, 7);
  const images = featured.map((g) => ({
    src: g.imageUrl,
    alt: g.caption ?? "Gallery",
  }));
  return (
    <PublicGalleryMosaic
      images={images}
      count={7}
      i18n={{ sectionLabel: "Gallery", moments: "Highlights" }}
    />
  );
}
```

## API reference

### `@withwiz/gallery` (main entry)

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

| Export | Signature |
|---|---|
| `setGalleryConfig(config)` | DI setter — call once at module top-level |
| `getGalleryConfig()` | Returns the registered config (throws if unset) |
| `createGalleryService(config)` | CRUD object (`list` / `get` / `create` / `update` / `remove` / `bulk*`) |
| `createCategoryService(config)` | Category CRUD (`list` / `getBySlug` / `create` / `update` / `remove` / `reorder`) |
| `createGalleryRoutes(config)` | 6 Next.js Route Handler groups (`collection` / `item` / `publishToggle` / `bulk` / `categoryCollection` / `categoryItem`) |
| `getGalleryItems(config, opts)` | RSC pagination loader |
| `getFeaturedGalleries(config, limit?)` | RSC featured list |
| `getRecentGalleries(config, limit)` | RSC recent items (dashboard) |
| `getGalleryCount(config, opts?)` | RSC count (dashboard) |
| `buildPaginatedResult(items, page, limit, total)` | helper |

Typed errors (also re-exported from the server entry):

- `GalleryError` (base)
- `GalleryNotFoundError`
- `CategoryNotFoundError`
- `CategoryInUseError`
- `PermissionDeniedError`

### `@withwiz/gallery/components`

| Export | Description |
|---|---|
| `GalleryAdminManager` | 3-pane admin mount point (`initialMode?` / `initialSelectedId?` / `onImageSelect?`) |
| `GalleryManagerLayout` | 3-pane primitive (left = list / center = form / right = preview) |
| `GalleryEditForm` | Single/multi form (`value` / `multipleMode` / `onSubmit` / `onSubmitMany`) |
| `GalleryHomePreview` | 7-tile mosaic + drag reorder + featured toggle |
| `CategoryAdminManager` | Category CRUD UI |
| `ImageDropZone` | Image dropzone (`accept` / `maxSize` / `multiple` / `disabled` / `validate`) |
| `ToggleSwitch` | size sm/md/lg, ARIA switch role |

CSS (host imports explicitly):

```ts
import "@withwiz/gallery/components/gallery.css";
```

### `@withwiz/gallery/hooks`

| Export | Signature |
|---|---|
| `useGalleryLightbox(images)` | `{ isOpen, currentIndex, current, open, close, next, prev }` — auto-bound ESC / Arrow, wrap-around |
| `useImageDropZone(opts)` | Headless dropzone — `inputProps / containerProps / files / rejectedReasons / clear` |
| `useScrollReveal(opts?)` | IntersectionObserver-based fade-in — `{ ref, isVisible }` |

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

### `@withwiz/gallery/presets/mosaic`

```ts
import { PublicGalleryMosaic } from "@withwiz/gallery/presets/mosaic";
import type { PublicGalleryMosaicProps } from "@withwiz/gallery/presets/mosaic";
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

Default labels are Korean (`sectionLabel` "갤러리", `moments` "하이라이트"); pass `i18n` to override them.

`@withwiz/gallery/presets/ballet` is a deprecated alias kept for 0.2.x users. It renders the same component and only keeps the previous default `moments` label ("공연의 순간들"). Import from `presets/mosaic` and set `i18n.moments` instead.

## Host-independence guarantees

- **Zero `@withwiz/pms` imports** — this package does not depend on any domain package.
- **Zero direct `process.env` reads** — environment variables are read by the host and bound into `config.storage`, etc.
- **No assumption about the host's User model name** — the Prisma `Gallery` model has only an `authorId: String` column and no `@relation`.
- **All infrastructure is injected via `GalleryConfig`** — Prisma client / API wrapper / storage / revalidate / i18n / limits.
- **Storage / auth / revalidate are the host's responsibility** — this package only deals with keys/paths; actual R2/S3/local calls are delegated to the host via `config.storage.deleteKeys`, etc.
- **`presets/mosaic` (and its alias `presets/ballet`) does not import `next/image`, `next/navigation`, or `useI18n`** — images use plain `<img>`, labels come from props.

## Security notes

- **Authentication is entirely the host's `apiWrapper`.** Every admin route (including the list GET that returns unpublished items) trusts whatever the wrapper lets through. The wrapper must enforce an admin session and, because the admin components send cookies (`credentials: "include"`), CSRF protection.
- **`permissions` hooks apply to bulk routes too.** `canDelete` gates the collection `DELETE` (ids) and `canEdit` gates `bulk PATCH`; every target must pass or the whole request is rejected with 403 (no partial success). `canManageCategories` gates category create / update / delete.
- **`imageUrl` is protocol-restricted** to `https:` / `http:` by default (`javascript:` and `data:` are rejected). Set `validation.imageUrlProtocols` / `validation.imageUrlHosts` to tighten further.
- **`imageKey` is validated before it reaches `storage.deleteKeys`.** The default pattern allows `[A-Za-z0-9._-/]`, forbids a leading slash, `//` and `..` segments, and caps at 512 chars. Pass `validation.imageKeyPattern` to enforce your bucket prefix; `storage.collectKeys` should still treat the key as untrusted.
- **`search` is truncated** to `validation.searchMaxLength` (default 100) before hitting the database.
- **Keep the peer `next` on a patched release.** The package pins nothing; run `npm audit` in the host.

## CSS customization

Override the CSS variables from the host's root CSS.

```css
/* host: app/globals.css */
:root {
  --gallery-accent: 212 175 55;   /* RGB triplet (NOT hex) */
  --gallery-bg: 10 10 10;
  --gallery-fg: 254 254 254;
  --gallery-border: 30 30 30;
}
```

These four variables are defined as fallbacks inside `:where(.gallery-toggle, .gallery-dropzone, .gallery-manager, .gallery-edit-form, .gallery-home-preview, .gallery-category-admin, .gallery-public-mosaic, .gallery-lightbox, ...)`, so the package works out of the box (dark tone + gold accent) without any host override.

The admin components also support per-slot customization via `config.ui.classNames[slot]` / `config.ui.slots[slot]`.

## Migration from ballet enum-based schema

ballet's existing schema:

```prisma
enum GalleryCategory { PERFORMANCE | REHEARSAL | ACTIVITY | ARTIST }
model Gallery {
  category GalleryCategory
  // ...
}
```

This package's new schema replaces the enum with a `gallery_categories` table + a `Gallery.categoryId` FK. Migration steps:

1. Merge this package's `gallery.schema.prisma` into the host's `prisma/` (copy or symlink).
2. Run `npx prisma migrate dev --create-only` to auto-generate the migration SQL.
3. Manually remove `DROP COLUMN category` / `DROP TYPE "GalleryCategory"` from the generated SQL (separate them into a follow-up migration).
4. Insert the contents of `prisma/migrations/2026-05-24-enum-to-table.sql` (shipped with this package) at that location — seeds the 4 categories, backfills `galleries.category_id`, and includes a PL/pgSQL verification block.
5. `npx prisma migrate dev` to apply.
6. Once verification passes, run the second migration (separate file) to `DROP` the enum column and type.

Reference the shipped `prisma/migrations/2026-05-24-enum-to-table.sql` as-is.

The ballet code (`src/components/sections/Gallery.tsx` — `gallery-mosaic` / `lightbox-*` classes) and this package (`gallery-public-mosaic` / `gallery-lightbox__*` classes) use different prefixes and are isolated. During ballet migration, remove those classes from the existing `main.css` and import only this package's `gallery.css`.

## Architecture

```
@withwiz/toolkit            (lowest)
   ↑
@withwiz/pms                (performance-management domain CMS)
   ↑                        ↑
   │                        │ consumed as a host
host app (ballet, yeroom)   │
   ↓                        │
   └─→ @withwiz/gallery ┘  (this package — depends on no host)
```

`@withwiz/gallery` depends on no host project (ballet, yeroom, etc.), no domain package (`@withwiz/pms`, etc.), and no host domain model (`User`, `Admin`, `Account`, etc.). Whatever the host uses (Next 16 / Prisma 7 assumed), a single `setGalleryConfig` call integrates it.

## Repository layout

```
node-packages/withwiz-gallery/
├── package.json
├── tsup.config.ts
├── README.md
├── prisma/
│   ├── gallery.schema.prisma            # GalleryCategory + Gallery partial models
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
        ├── mosaic.tsx        # PublicGalleryMosaic
        └── ballet.tsx        # deprecated alias of mosaic.tsx
```

## Scripts

```bash
npm run build       # tsup multi-entry CJS/ESM/DTS
npm test            # vitest run (221 tests, 23 files)
npm run test:watch  # vitest watch
```

## License

MIT
