-- 008_drop_tippet_strength: tippets no longer store breaking strength (leaders dropped it in 006).

ALTER TABLE tippets DROP COLUMN strength_lb;
