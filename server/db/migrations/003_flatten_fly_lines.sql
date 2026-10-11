-- 003_flatten_fly_lines: merge fly_line_models into fly_lines (one row per brand/name/weight).
-- Drops type and taper; a NULL sink_rate_ips means a floating line.
-- Both tables held no data when this was written, so nothing is copied over.

ALTER TABLE builds DROP FOREIGN KEY fk_builds_fly_line;

DROP TABLE fly_lines;
DROP TABLE fly_line_models;

CREATE TABLE fly_lines (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  brand_id            INT UNSIGNED NOT NULL,
  name                VARCHAR(120) NOT NULL,
  line_weight         TINYINT UNSIGNED NOT NULL,
  sink_rate_ips       DECIMAL(3,1) NULL,                   -- NULL when floating
  water               ENUM('fresh','salt','both') NOT NULL,
  head_weight_grains  SMALLINT UNSIGNED NULL,
  price               DECIMAL(8,2) NOT NULL,
  UNIQUE KEY uq_fly_lines (brand_id, name, line_weight),
  KEY idx_fly_lines_line_weight (line_weight),
  CONSTRAINT chk_fly_lines_price CHECK (price >= 0),
  CONSTRAINT fk_fly_lines_brand  FOREIGN KEY (brand_id)    REFERENCES brands(id),
  CONSTRAINT fk_fly_lines_weight FOREIGN KEY (line_weight) REFERENCES line_weights(weight_class)
) ENGINE=InnoDB;

ALTER TABLE builds
  ADD CONSTRAINT fk_builds_fly_line FOREIGN KEY (fly_line_id) REFERENCES fly_lines(id) ON DELETE SET NULL;
