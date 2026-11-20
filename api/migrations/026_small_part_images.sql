-- 026_small_part_images: lines, leaders and tippets get an image, like reels.
-- Nullable until an image batch fills it in. Each table only accepts its own
-- folder; REGEXP_LIKE(..., 'c') keeps the match case-sensitive (see 021).
-- Rods and reels already have theirs (021, and rod_series in 024).

ALTER TABLE fly_lines
  ADD COLUMN image_path VARCHAR(255) NULL,
  ADD CONSTRAINT chk_fly_lines_image_path CHECK (REGEXP_LIKE(image_path, '^lines/[a-z0-9-]+\\.webp$', 'c'));

ALTER TABLE leaders
  ADD COLUMN image_path VARCHAR(255) NULL,
  ADD CONSTRAINT chk_leaders_image_path CHECK (REGEXP_LIKE(image_path, '^leaders/[a-z0-9-]+\\.webp$', 'c'));

ALTER TABLE tippets
  ADD COLUMN image_path VARCHAR(255) NULL,
  ADD CONSTRAINT chk_tippets_image_path CHECK (REGEXP_LIKE(image_path, '^tippets/[a-z0-9-]+\\.webp$', 'c'));
