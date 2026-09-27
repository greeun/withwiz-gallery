-- ═══════════════════════════════════════════════════════════════════════════
-- @withwiz/gallery — enum 기반 카테고리 → table backfill 마이그레이션 예시
-- ───────────────────────────────────────────────────────────────────────────
-- 1회용 마이그레이션 스크립트 템플릿.
-- 가정하는 호스트의 기존 schema (예시):
--   enum GalleryCategory { EVENT | NATURE | PEOPLE | TRAVEL }
--   galleries.category  ← enum 컬럼
-- 본 패키지의 새 schema:
--   gallery_categories  ← enum 값마다 1 row seed
--   galleries.category_id  ← cuid FK
--
-- 2) 의 seed row 는 예시다. 호스트는 자신의 enum 값에 맞춰 slug·라벨·순서를
-- 바꿔서 사용한다. slug 는 기존 enum 값과 정확히 같아야 3) 의 백필이 매핑된다.
-- ───────────────────────────────────────────────────────────────────────────
-- 실행 절차 (호스트 환경):
--   1. host prisma/ 에 본 패키지의 gallery.schema.prisma 를 머지.
--   2. `npx prisma migrate dev --create-only` 로 마이그레이션 SQL 자동 생성.
--      Prisma 가 만들어준 migration.sql 에서 `DROP COLUMN category` /
--      `DROP TYPE "GalleryCategory"` 부분은 수동으로 제거하고, 본 파일의 SQL 을
--      그 위치에 삽입 (즉, gallery_categories 테이블 / categoryId 컬럼 생성 직후,
--      enum 컬럼 DROP 이전에 실행되어야 한다).
--   3. `npx prisma migrate dev` 로 마이그레이션 실행 + 검증.
--   4. 검증 통과 시 별도 후속 마이그레이션에서 enum 컬럼/타입을 DROP.
-- ───────────────────────────────────────────────────────────────────────────

BEGIN;

-- ─── 1) 새 테이블 / 컬럼 생성 ──────────────────────────────────────────────
-- gallery_categories 와 galleries.category_id 컬럼은 prisma migrate 결과로
-- 이미 생성되어 있다고 가정 (위 실행 절차 2 단계).

-- ─── 2) 카테고리 seed (slug = 기존 enum value, 예시 값) ─────────────────────
INSERT INTO gallery_categories (id, slug, label_ko, label_en, sort_order, is_active, created_at, updated_at) VALUES
  ('cat_event',  'EVENT',  '이벤트', 'Event',  0, true, NOW(), NOW()),
  ('cat_nature', 'NATURE', '자연',   'Nature', 1, true, NOW(), NOW()),
  ('cat_people', 'PEOPLE', '인물',   'People', 2, true, NOW(), NOW()),
  ('cat_travel', 'TRAVEL', '여행',   'Travel', 3, true, NOW(), NOW());

-- ─── 3) 기존 galleries.category (enum) → category_id 백필 ──────────────────
-- 전제: enum 컬럼이 아직 살아있어야 backfill 가능.
-- prisma migrate 가 enum 컬럼 DROP 을 같은 트랜잭션에 만들었다면, 위 실행 절차
-- 2 단계에서 DROP 부분을 잘라내고 본 SQL 다음에 별도 마이그레이션으로 분리.

UPDATE galleries g
SET category_id = c.id
FROM gallery_categories c
WHERE c.slug = g.category::text;

-- ─── 4) 검증 ───────────────────────────────────────────────────────────────
-- 미매핑 row 가 있으면 트랜잭션 롤백.
DO $$
DECLARE
  unmapped_count INT;
BEGIN
  SELECT COUNT(*) INTO unmapped_count FROM galleries WHERE category_id IS NULL;
  IF unmapped_count > 0 THEN
    RAISE EXCEPTION 'Unmapped gallery rows: % — backfill 실패. enum 값과 slug 매핑을 확인하라.', unmapped_count;
  END IF;
END $$;

COMMIT;

-- ───────────────────────────────────────────────────────────────────────────
-- 후속 마이그레이션 (별도 파일 / 별도 트랜잭션으로 실행):
--   ALTER TABLE galleries DROP COLUMN category;
--   DROP TYPE "GalleryCategory";
-- ───────────────────────────────────────────────────────────────────────────
