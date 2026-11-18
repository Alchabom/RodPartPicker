-- 020_published_builds: the public catalog of completed builds.
-- A published build is a snapshot of a saved build's parts, plus a title and
-- write-up. Design rationale: docs/superpowers/specs/2026-11-18-published-builds-design.md

CREATE TABLE published_builds (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          INT UNSIGNED NOT NULL,
  source_build_id  INT UNSIGNED NULL,
  title            VARCHAR(80)  NOT NULL,
  writeup          TEXT         NOT NULL,
  rod_id           INT UNSIGNED NULL,
  reel_id          INT UNSIGNED NULL,
  fly_line_id      INT UNSIGNED NULL,
  leader_id        INT UNSIGNED NULL,
  tippet_id        INT UNSIGNED NULL,
  published_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_published_source (source_build_id),
  KEY idx_published_newest (published_at, id),
  CONSTRAINT fk_published_user     FOREIGN KEY (user_id)         REFERENCES users (id)     ON DELETE CASCADE,
  CONSTRAINT fk_published_source   FOREIGN KEY (source_build_id) REFERENCES builds (id)    ON DELETE SET NULL,
  CONSTRAINT fk_published_rod      FOREIGN KEY (rod_id)          REFERENCES rods (id)      ON DELETE SET NULL,
  CONSTRAINT fk_published_reel     FOREIGN KEY (reel_id)         REFERENCES reels (id)     ON DELETE SET NULL,
  CONSTRAINT fk_published_fly_line FOREIGN KEY (fly_line_id)     REFERENCES fly_lines (id) ON DELETE SET NULL,
  CONSTRAINT fk_published_leader   FOREIGN KEY (leader_id)       REFERENCES leaders (id)   ON DELETE SET NULL,
  CONSTRAINT fk_published_tippet   FOREIGN KEY (tippet_id)       REFERENCES tippets (id)   ON DELETE SET NULL
) ENGINE=InnoDB;
