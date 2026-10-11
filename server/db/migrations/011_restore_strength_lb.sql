-- 011_restore_strength_lb: bring back breaking strength (lb) dropped in 006 and 008.
-- NULL when the maker doesn't publish it for that size.

ALTER TABLE leaders ADD COLUMN strength_lb DECIMAL(4,1) NULL AFTER x_size_id;
ALTER TABLE tippets ADD COLUMN strength_lb DECIMAL(4,1) NULL AFTER x_size_id;
