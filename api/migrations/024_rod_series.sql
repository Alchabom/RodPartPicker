-- 024_rod_series: group rods into series. A series (Sage R8 Core, Orvis
-- Clearwater, ...) owns the purchase link and image that every size of it
-- shares, so both move here from rods. Rod ids and names are unchanged.
-- Design rationale: docs/superpowers/specs/2026-11-20-rod-series-design.md

-- 1. The table and the new rod columns
CREATE TABLE rod_series (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  brand_id      INT UNSIGNED NOT NULL,
  name          VARCHAR(120) NOT NULL,
  slug          VARCHAR(120) NOT NULL,
  purchase_url  VARCHAR(500) NULL,
  image_path    VARCHAR(255) NULL,
  UNIQUE KEY uq_rod_series_name (brand_id, name),
  UNIQUE KEY uq_rod_series_slug (brand_id, slug),
  CONSTRAINT fk_rod_series_brand FOREIGN KEY (brand_id) REFERENCES brands(id),
  CONSTRAINT chk_rod_series_slug CHECK (REGEXP_LIKE(slug, '^[a-z0-9]+(-[a-z0-9]+)*$', 'c')),
  CONSTRAINT chk_rod_series_purchase_url CHECK (purchase_url LIKE 'https://%'),
  CONSTRAINT chk_rod_series_image_path CHECK (REGEXP_LIKE(image_path, '^rods/[a-z0-9-]+\\.webp$', 'c'))
) ENGINE=InnoDB;

ALTER TABLE rods
  ADD COLUMN series_id INT UNSIGNED NULL,
  ADD COLUMN size_code VARCHAR(40) NULL;

-- 2. The 20 series. Display names can differ from the catalog's rod names
-- ('Liquid Max' for 'liquid max', 'Superfine Graphite' for 'Superfine Grafite')
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'E-Series', 'e-series' FROM brands WHERE name = 'Lamson';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'Liquid', 'liquid' FROM brands WHERE name = 'Lamson';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'Liquid Max', 'liquid-max' FROM brands WHERE name = 'Lamson';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'Speedster', 'speedster' FROM brands WHERE name = 'Lamson';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'Clearwater', 'clearwater' FROM brands WHERE name = 'Orvis';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'Encounter', 'encounter' FROM brands WHERE name = 'Orvis';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'Helios D', 'helios-d' FROM brands WHERE name = 'Orvis';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'Helios F', 'helios-f' FROM brands WHERE name = 'Orvis';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'Recon Freshwater', 'recon-freshwater' FROM brands WHERE name = 'Orvis';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'Recon Saltwater', 'recon-saltwater' FROM brands WHERE name = 'Orvis';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'Superfine Glass', 'superfine-glass' FROM brands WHERE name = 'Orvis';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'Superfine Graphite', 'superfine-graphite' FROM brands WHERE name = 'Orvis';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'Classic Trout', 'classic-trout' FROM brands WHERE name = 'Redington';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'EDC', 'edc' FROM brands WHERE name = 'Redington';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'Classic R8', 'classic-r8' FROM brands WHERE name = 'Sage';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'Foundation', 'foundation' FROM brands WHERE name = 'Sage';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'Power R8', 'power-r8' FROM brands WHERE name = 'Sage';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'R8 Core', 'r8-core' FROM brands WHERE name = 'Sage';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'Salt R8', 'salt-r8' FROM brands WHERE name = 'Sage';
INSERT INTO rod_series (brand_id, name, slug) SELECT id, 'Spey R8', 'spey-r8' FROM brands WHERE name = 'Sage';

-- 3. Assign rods. Lamson and Orvis names are the series; Redington and Sage
-- names are '<series> <size code>', and the trailing space in each pattern
-- keeps one series from matching another's names
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'e-series' SET r.series_id = s.id WHERE r.name = 'e-series';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'liquid' SET r.series_id = s.id WHERE r.name = 'liquid';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'liquid-max' SET r.series_id = s.id WHERE r.name = 'liquid max';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'speedster' SET r.series_id = s.id WHERE r.name IN ('speedster', 'speedster with fighting butt');
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'clearwater' SET r.series_id = s.id WHERE r.name = 'Clearwater';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'encounter' SET r.series_id = s.id WHERE r.name = 'Encounter';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'helios-d' SET r.series_id = s.id WHERE r.name = 'Helios D';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'helios-f' SET r.series_id = s.id WHERE r.name = 'Helios F';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'recon-freshwater' SET r.series_id = s.id WHERE r.name = 'Recon Freshwater';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'recon-saltwater' SET r.series_id = s.id WHERE r.name = 'Recon Saltwater';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'superfine-glass' SET r.series_id = s.id WHERE r.name = 'Superfine Glass';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'superfine-graphite' SET r.series_id = s.id WHERE r.name = 'Superfine Grafite';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'classic-trout' SET r.series_id = s.id WHERE r.name LIKE 'Classic Trout %';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'edc' SET r.series_id = s.id WHERE r.name LIKE 'EDC %';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'classic-r8' SET r.series_id = s.id WHERE r.name LIKE 'Classic R8 %';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'foundation' SET r.series_id = s.id WHERE r.name LIKE 'Foundation %';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'power-r8' SET r.series_id = s.id WHERE r.name LIKE 'Power R8 %';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'r8-core' SET r.series_id = s.id WHERE r.name LIKE 'R8 Core %';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'salt-r8' SET r.series_id = s.id WHERE r.name LIKE 'Salt R8 %';
UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'spey-r8' SET r.series_id = s.id WHERE r.name LIKE 'Spey R8 %';

-- 4. Size codes: what follows the series name, for Redington and Sage
UPDATE rods r
JOIN rod_series s ON s.id = r.series_id
JOIN brands b ON b.id = s.brand_id
SET r.size_code = TRIM(SUBSTRING(r.name, CHAR_LENGTH(s.name) + 2))
WHERE b.name IN ('Redington', 'Sage');
UPDATE rods SET size_code = 'Fighting butt' WHERE name = 'speedster with fighting butt';

-- 5. Each series takes the link and image its sizes share (022 set them per series)
UPDATE rod_series s
JOIN (
  SELECT series_id, MIN(purchase_url) AS url, MIN(image_path) AS img
  FROM rods
  GROUP BY series_id
) r ON r.series_id = s.id
SET s.purchase_url = r.url, s.image_path = r.img;

-- 6. Every rod has a series from here on; the link and image live only on it.
-- The CHECKs go before their columns, since MySQL won't drop a column a CHECK uses
ALTER TABLE rods
  MODIFY series_id INT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_rods_series FOREIGN KEY (series_id) REFERENCES rod_series(id);
ALTER TABLE rods DROP CHECK chk_rods_purchase_url, DROP CHECK chk_rods_image_path;
ALTER TABLE rods DROP COLUMN purchase_url, DROP COLUMN image_path;
