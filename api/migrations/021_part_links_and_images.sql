-- 021_part_links_and_images: one purchase link per part, and an image for
-- rods and reels. Both are nullable; seed batches fill them in per model.
-- The image_path CHECKs use REGEXP_LIKE(..., 'c') because plain REGEXP is
-- case-insensitive under the default collation and would accept 'rods/X.webp'.
-- Design rationale: docs/superpowers/specs/2026-11-18-part-details-design.md

ALTER TABLE rods
  ADD COLUMN purchase_url VARCHAR(500) NULL,
  ADD COLUMN image_path   VARCHAR(255) NULL,
  ADD CONSTRAINT chk_rods_purchase_url CHECK (purchase_url LIKE 'https://%'),
  ADD CONSTRAINT chk_rods_image_path   CHECK (REGEXP_LIKE(image_path, '^rods/[a-z0-9-]+\\.webp$', 'c'));

ALTER TABLE reels
  ADD COLUMN purchase_url VARCHAR(500) NULL,
  ADD COLUMN image_path   VARCHAR(255) NULL,
  ADD CONSTRAINT chk_reels_purchase_url CHECK (purchase_url LIKE 'https://%'),
  ADD CONSTRAINT chk_reels_image_path   CHECK (REGEXP_LIKE(image_path, '^reels/[a-z0-9-]+\\.webp$', 'c'));

ALTER TABLE fly_lines
  ADD COLUMN purchase_url VARCHAR(500) NULL,
  ADD CONSTRAINT chk_fly_lines_purchase_url CHECK (purchase_url LIKE 'https://%');

ALTER TABLE leaders
  ADD COLUMN purchase_url VARCHAR(500) NULL,
  ADD CONSTRAINT chk_leaders_purchase_url CHECK (purchase_url LIKE 'https://%');

ALTER TABLE tippets
  ADD COLUMN purchase_url VARCHAR(500) NULL,
  ADD CONSTRAINT chk_tippets_purchase_url CHECK (purchase_url LIKE 'https://%');
