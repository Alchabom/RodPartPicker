-- 007_drop_reel_size_label: reels no longer store a size label.
-- size_label was part of uq_reels, so the line weight range now tells sizes apart.

ALTER TABLE reels
  DROP INDEX uq_reels,
  DROP COLUMN size_label,
  ADD UNIQUE KEY uq_reels (brand_id, name, min_line_weight, max_line_weight);
