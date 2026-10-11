-- 001_init: catalog, lookup and build tables.
-- Requires MySQL 8.0.16+ (older versions parse CHECK constraints but ignore them).
-- Design rationale: docs/database/schema-design.md

-- ---------- Lookups ----------
CREATE TABLE brands (
  id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_brands_name (name)
) ENGINE=InnoDB;

-- AFTMA standard: grains in the first 30 ft of line
CREATE TABLE line_weights (
  weight_class   TINYINT UNSIGNED PRIMARY KEY,
  grains_target  SMALLINT UNSIGNED NOT NULL,
  grains_min     SMALLINT UNSIGNED NOT NULL,
  grains_max     SMALLINT UNSIGNED NOT NULL,
  CONSTRAINT chk_lw_class CHECK (weight_class BETWEEN 1 AND 15),
  CONSTRAINT chk_lw_range CHECK (grains_min <= grains_target AND grains_target <= grains_max)
) ENGINE=InnoDB;

-- Ordered so a higher id = finer tippet; "one size finer" is id + 1
CREATE TABLE x_sizes (
  id           TINYINT UNSIGNED PRIMARY KEY,
  label        VARCHAR(4) NOT NULL,
  diameter_in  DECIMAL(4,3) NOT NULL,
  UNIQUE KEY uq_x_sizes_label (label)
) ENGINE=InnoDB;

-- ---------- Rods ----------
CREATE TABLE rod_models (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  brand_id  INT UNSIGNED NOT NULL,
  name      VARCHAR(120) NOT NULL,
  action    ENUM('slow','medium','medium_fast','fast') NOT NULL,
  water     ENUM('fresh','salt','both') NOT NULL,
  UNIQUE KEY uq_rod_models (brand_id, name),
  CONSTRAINT fk_rod_models_brand FOREIGN KEY (brand_id) REFERENCES brands(id)
) ENGINE=InnoDB;

CREATE TABLE rods (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rod_model_id  INT UNSIGNED NOT NULL,
  line_weight   TINYINT UNSIGNED NOT NULL,
  length_in     SMALLINT UNSIGNED NOT NULL,            -- 9'0" = 108
  pieces        TINYINT UNSIGNED NOT NULL DEFAULT 4,
  price         DECIMAL(8,2) NOT NULL,
  UNIQUE KEY uq_rods (rod_model_id, line_weight, length_in, pieces),
  KEY idx_rods_line_weight (line_weight),
  CONSTRAINT chk_rods_price  CHECK (price >= 0),
  CONSTRAINT chk_rods_length CHECK (length_in > 0),
  CONSTRAINT fk_rods_model  FOREIGN KEY (rod_model_id) REFERENCES rod_models(id) ON DELETE CASCADE,
  CONSTRAINT fk_rods_weight FOREIGN KEY (line_weight)  REFERENCES line_weights(weight_class)
) ENGINE=InnoDB;

-- ---------- Reels ----------
CREATE TABLE reel_models (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  brand_id  INT UNSIGNED NOT NULL,
  name      VARCHAR(120) NOT NULL,
  water     ENUM('fresh','salt','both') NOT NULL,
  UNIQUE KEY uq_reel_models (brand_id, name),
  CONSTRAINT fk_reel_models_brand FOREIGN KEY (brand_id) REFERENCES brands(id)
) ENGINE=InnoDB;

CREATE TABLE reels (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reel_model_id    INT UNSIGNED NOT NULL,
  size_label       VARCHAR(20) NOT NULL,              -- e.g. "III", "5/6"
  min_line_weight  TINYINT UNSIGNED NOT NULL,
  max_line_weight  TINYINT UNSIGNED NOT NULL,
  price            DECIMAL(8,2) NOT NULL,
  UNIQUE KEY uq_reels (reel_model_id, size_label),
  KEY idx_reels_weights (min_line_weight, max_line_weight),
  CONSTRAINT chk_reels_price CHECK (price >= 0),
  CONSTRAINT fk_reels_model FOREIGN KEY (reel_model_id)   REFERENCES reel_models(id) ON DELETE CASCADE,
  CONSTRAINT fk_reels_min   FOREIGN KEY (min_line_weight) REFERENCES line_weights(weight_class),
  CONSTRAINT fk_reels_max   FOREIGN KEY (max_line_weight) REFERENCES line_weights(weight_class)
  -- min <= max is validated in the API: MySQL restricts CHECKs on FK columns
) ENGINE=InnoDB;

-- ---------- Fly lines ----------
CREATE TABLE fly_line_models (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  brand_id       INT UNSIGNED NOT NULL,
  name           VARCHAR(120) NOT NULL,
  type           ENUM('floating','intermediate','sink_tip','full_sink') NOT NULL,
  taper          ENUM('weight_forward','double_taper','shooting_head','level') NOT NULL,
  sink_rate_ips  DECIMAL(3,1) NULL,                   -- NULL when floating
  water          ENUM('fresh','salt','both') NOT NULL,
  UNIQUE KEY uq_fly_line_models (brand_id, name),
  CONSTRAINT chk_fly_line_sink CHECK ((type = 'floating') = (sink_rate_ips IS NULL)),
  CONSTRAINT fk_fly_line_models_brand FOREIGN KEY (brand_id) REFERENCES brands(id)
) ENGINE=InnoDB;

CREATE TABLE fly_lines (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fly_line_model_id   INT UNSIGNED NOT NULL,
  line_weight         TINYINT UNSIGNED NOT NULL,
  head_weight_grains  SMALLINT UNSIGNED NULL,
  price               DECIMAL(8,2) NOT NULL,
  UNIQUE KEY uq_fly_lines (fly_line_model_id, line_weight),
  KEY idx_fly_lines_line_weight (line_weight),
  CONSTRAINT chk_fly_lines_price CHECK (price >= 0),
  CONSTRAINT fk_fly_lines_model  FOREIGN KEY (fly_line_model_id) REFERENCES fly_line_models(id) ON DELETE CASCADE,
  CONSTRAINT fk_fly_lines_weight FOREIGN KEY (line_weight)       REFERENCES line_weights(weight_class)
) ENGINE=InnoDB;

-- ---------- Leaders ----------
CREATE TABLE leader_models (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  brand_id  INT UNSIGNED NOT NULL,
  name      VARCHAR(120) NOT NULL,
  material  ENUM('nylon','fluorocarbon') NOT NULL,
  water     ENUM('fresh','salt','both') NOT NULL,
  UNIQUE KEY uq_leader_models (brand_id, name),
  CONSTRAINT fk_leader_models_brand FOREIGN KEY (brand_id) REFERENCES brands(id)
) ENGINE=InnoDB;

CREATE TABLE leaders (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  leader_model_id  INT UNSIGNED NOT NULL,
  length_ft        DECIMAL(4,1) NOT NULL,             -- 7.5, 9.0, 12.0
  x_size_id        TINYINT UNSIGNED NOT NULL,          -- size at the tip
  strength_lb      DECIMAL(4,1) NOT NULL,
  pack_count       TINYINT UNSIGNED NOT NULL DEFAULT 1,
  price            DECIMAL(8,2) NOT NULL,
  UNIQUE KEY uq_leaders (leader_model_id, length_ft, x_size_id, pack_count),
  CONSTRAINT chk_leaders_price CHECK (price >= 0),
  CONSTRAINT chk_leaders_pack  CHECK (pack_count > 0),
  CONSTRAINT fk_leaders_model FOREIGN KEY (leader_model_id) REFERENCES leader_models(id) ON DELETE CASCADE,
  CONSTRAINT fk_leaders_x     FOREIGN KEY (x_size_id)       REFERENCES x_sizes(id)
) ENGINE=InnoDB;

-- ---------- Tippets ----------
CREATE TABLE tippet_models (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  brand_id  INT UNSIGNED NOT NULL,
  name      VARCHAR(120) NOT NULL,
  material  ENUM('nylon','fluorocarbon') NOT NULL,
  water     ENUM('fresh','salt','both') NOT NULL,
  UNIQUE KEY uq_tippet_models (brand_id, name),
  CONSTRAINT fk_tippet_models_brand FOREIGN KEY (brand_id) REFERENCES brands(id)
) ENGINE=InnoDB;

CREATE TABLE tippets (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tippet_model_id  INT UNSIGNED NOT NULL,
  x_size_id        TINYINT UNSIGNED NOT NULL,
  strength_lb      DECIMAL(4,1) NOT NULL,
  spool_yards      SMALLINT UNSIGNED NOT NULL,
  price            DECIMAL(8,2) NOT NULL,
  UNIQUE KEY uq_tippets (tippet_model_id, x_size_id, spool_yards),
  CONSTRAINT chk_tippets_price CHECK (price >= 0),
  CONSTRAINT fk_tippets_model FOREIGN KEY (tippet_model_id) REFERENCES tippet_models(id) ON DELETE CASCADE,
  CONSTRAINT fk_tippets_x     FOREIGN KEY (x_size_id)       REFERENCES x_sizes(id)
) ENGINE=InnoDB;

-- ---------- Builds ----------
-- Part columns are nullable so a build can be saved before all five parts are chosen.
CREATE TABLE builds (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(120) NOT NULL,
  rod_id       INT UNSIGNED NULL,
  reel_id      INT UNSIGNED NULL,
  fly_line_id  INT UNSIGNED NULL,
  leader_id    INT UNSIGNED NULL,
  tippet_id    INT UNSIGNED NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_builds_rod      FOREIGN KEY (rod_id)      REFERENCES rods(id)      ON DELETE SET NULL,
  CONSTRAINT fk_builds_reel     FOREIGN KEY (reel_id)     REFERENCES reels(id)     ON DELETE SET NULL,
  CONSTRAINT fk_builds_fly_line FOREIGN KEY (fly_line_id) REFERENCES fly_lines(id) ON DELETE SET NULL,
  CONSTRAINT fk_builds_leader   FOREIGN KEY (leader_id)   REFERENCES leaders(id)   ON DELETE SET NULL,
  CONSTRAINT fk_builds_tippet   FOREIGN KEY (tippet_id)   REFERENCES tippets(id)   ON DELETE SET NULL
) ENGINE=InnoDB;
