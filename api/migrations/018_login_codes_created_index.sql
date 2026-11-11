-- 018_login_codes_created_index: index login_codes by created_at alone.
-- POST /api/auth/code deletes rows older than 24 h on every request. Without
-- this index that DELETE scans (and, under REPEATABLE READ, locks) the whole
-- table; with it, it's a range scan over the expired rows only.
-- Why it matters: docs/auth/rate-limiting.md, "Cleanup and locking".

CREATE INDEX idx_login_codes_created ON login_codes (created_at);
