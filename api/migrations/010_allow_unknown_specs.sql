-- 010_allow_unknown_specs: let specs our source data doesn't have yet be NULL (unknown)
-- instead of forcing a made-up value. Filled in by later data updates.

ALTER TABLE rods
  MODIFY pieces TINYINT UNSIGNED NULL;

ALTER TABLE leaders
  MODIFY x_size_id TINYINT UNSIGNED NULL,   -- leaders rated only in lb
  MODIFY price     DECIMAL(8,2) NULL;

-- A version may have no matching type, and a sinking line's rate may be unknown.
-- A floating line still never has a sink rate.
ALTER TABLE fly_lines
  MODIFY type ENUM('floating','intermediate','sink_tip','full_sink') NULL,
  DROP CHECK chk_fly_lines_sink,
  ADD CONSTRAINT chk_fly_lines_sink CHECK (type <> 'floating' OR sink_rate_ips IS NULL);
