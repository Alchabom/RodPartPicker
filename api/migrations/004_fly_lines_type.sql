-- 004_fly_lines_type: bring back the fly line type dropped in 003.
-- fly_lines held no data when this was written, so NOT NULL needs no default.

ALTER TABLE fly_lines
  ADD COLUMN type ENUM('floating','intermediate','sink_tip','full_sink') NOT NULL AFTER line_weight,
  ADD CONSTRAINT chk_fly_lines_sink CHECK ((type = 'floating') = (sink_rate_ips IS NULL));
