-- 005_flatten_catalog: merge each *_models table into its product table, as 003 did for fly lines.
-- One row per brand/name/size. All catalog tables held no data when this was written.
-- Design rationale: docs/database/schema-design.md (D3, D10)

ALTER TABLE builds
  DROP FOREIGN KEY fk_builds_rod,
  DROP FOREIGN KEY fk_builds_reel,
  DROP FOREIGN KEY fk_builds_leader,
  DROP FOREIGN KEY fk_builds_tippet;

DROP TABLE rods, reels, leaders, tippets;
DROP TABLE rod_models, reel_models, leader_models, tippet_models;

-- ---------- Rods ----------
CREATE TABLE rods (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  brand_id     INT UNSIGNED NOT NULL,
  name         VARCHAR(120) NOT NULL,
  action       ENUM('slow','medium','medium_fast','fast') NOT NULL,
  water        ENUM('fresh','salt','both') NOT NULL,
  line_weight  TINYINT UNSIGNED NOT NULL,
  length_in    SMALLINT UNSIGNED NOT NULL,            -- 9'0" = 108
  pieces       TINYINT UNSIGNED NOT NULL DEFAULT 4,
  price        DECIMAL(8,2) NOT NULL,
  UNIQUE KEY uq_rods (brand_id, name, line_weight, length_in, pieces),
  KEY idx_rods_line_weight (line_weight),
  CONSTRAINT chk_rods_price  CHECK (price >= 0),
  CONSTRAINT chk_rods_length CHECK (length_in > 0),
  CONSTRAINT fk_rods_brand  FOREIGN KEY (brand_id)    REFERENCES brands(id),
  CONSTRAINT fk_rods_weight FOREIGN KEY (line_weight) REFERENCES line_weights(weight_class)
) ENGINE=InnoDB;

-- ---------- Reels ----------
CREATE TABLE reels (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  brand_id         INT UNSIGNED NOT NULL,
  name             VARCHAR(120) NOT NULL,
  water            ENUM('fresh','salt','both') NOT NULL,
  size_label       VARCHAR(20) NOT NULL,              -- e.g. "III", "5/6"
  min_line_weight  TINYINT UNSIGNED NOT NULL,
  max_line_weight  TINYINT UNSIGNED NOT NULL,
  price            DECIMAL(8,2) NOT NULL,
  UNIQUE KEY uq_reels (brand_id, name, size_label),
  KEY idx_reels_weights (min_line_weight, max_line_weight),
  CONSTRAINT chk_reels_price CHECK (price >= 0),
  CONSTRAINT fk_reels_brand FOREIGN KEY (brand_id)        REFERENCES brands(id),
  CONSTRAINT fk_reels_min   FOREIGN KEY (min_line_weight) REFERENCES line_weights(weight_class),
  CONSTRAINT fk_reels_max   FOREIGN KEY (max_line_weight) REFERENCES line_weights(weight_class)
  -- min <= max is validated in the API: MySQL restricts CHECKs on FK columns
) ENGINE=InnoDB;

-- ---------- Leaders ----------
CREATE TABLE leaders (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  brand_id     INT UNSIGNED NOT NULL,
  name         VARCHAR(120) NOT NULL,
  material     ENUM('nylon','fluorocarbon') NOT NULL,
  water        ENUM('fresh','salt','both') NOT NULL,
  length_ft    DECIMAL(4,1) NOT NULL,                 -- 7.5, 9.0, 12.0
  x_size_id    TINYINT UNSIGNED NOT NULL,              -- size at the tip
  strength_lb  DECIMAL(4,1) NOT NULL,
  pack_count   TINYINT UNSIGNED NOT NULL DEFAULT 1,
  price        DECIMAL(8,2) NOT NULL,
  UNIQUE KEY uq_leaders (brand_id, name, length_ft, x_size_id, pack_count),
  CONSTRAINT chk_leaders_price CHECK (price >= 0),
  CONSTRAINT chk_leaders_pack  CHECK (pack_count > 0),
  CONSTRAINT fk_leaders_brand FOREIGN KEY (brand_id)  REFERENCES brands(id),
  CONSTRAINT fk_leaders_x     FOREIGN KEY (x_size_id) REFERENCES x_sizes(id)
) ENGINE=InnoDB;

-- ---------- Tippets ----------
CREATE TABLE tippets (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  brand_id     INT UNSIGNED NOT NULL,
  name         VARCHAR(120) NOT NULL,
  material     ENUM('nylon','fluorocarbon') NOT NULL,
  water        ENUM('fresh','salt','both') NOT NULL,
  x_size_id    TINYINT UNSIGNED NOT NULL,
  strength_lb  DECIMAL(4,1) NOT NULL,
  spool_yards  SMALLINT UNSIGNED NOT NULL,
  price        DECIMAL(8,2) NOT NULL,
  UNIQUE KEY uq_tippets (brand_id, name, x_size_id, spool_yards),
  CONSTRAINT chk_tippets_price CHECK (price >= 0),
  CONSTRAINT fk_tippets_brand FOREIGN KEY (brand_id)  REFERENCES brands(id),
  CONSTRAINT fk_tippets_x     FOREIGN KEY (x_size_id) REFERENCES x_sizes(id)
) ENGINE=InnoDB;

ALTER TABLE builds
  ADD CONSTRAINT fk_builds_rod    FOREIGN KEY (rod_id)    REFERENCES rods(id)    ON DELETE SET NULL,
  ADD CONSTRAINT fk_builds_reel   FOREIGN KEY (reel_id)   REFERENCES reels(id)   ON DELETE SET NULL,
  ADD CONSTRAINT fk_builds_leader FOREIGN KEY (leader_id) REFERENCES leaders(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_builds_tippet FOREIGN KEY (tippet_id) REFERENCES tippets(id) ON DELETE SET NULL;
