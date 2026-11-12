-- 019_build_owners: every build belongs to a user.
-- Existing rows are deleted: they were created before accounts existed, so
-- there is no owner to give them, and the column below is NOT NULL.
-- Design rationale: docs/superpowers/specs/2026-11-12-saved-builds-design.md

DELETE FROM builds;

ALTER TABLE builds
  ADD COLUMN user_id INT UNSIGNED NOT NULL AFTER id,
  ADD CONSTRAINT fk_builds_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  ADD INDEX idx_builds_user_updated (user_id, updated_at);
