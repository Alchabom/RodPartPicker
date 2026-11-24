-- 028_nullable_tippet_x_size: let a tippet have no X size, as 010 did for leaders.
-- Wire bite tippet (for musky and pike) is rated only in lb. uq_tippets still holds:
-- MySQL allows repeated NULLs in a unique key, so such a tippet is told apart by
-- name and spool.

ALTER TABLE tippets
  MODIFY x_size_id TINYINT UNSIGNED NULL;   -- tippets rated only in lb
