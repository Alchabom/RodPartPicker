-- 029_large_river_parts: parts the large rivers questionnaire needs that the catalog
-- lacked: sink-tip and musky lines, heavier trout leaders, a musky leader and wire bite
-- tippet. See docs/superpowers/specs/2026-11-23-large-rivers-questionnaire-design.md.
-- Sources (checked 2026-11-23):
--   Sonar Titan Sink Tip: scientificanglers.com/product/sonar-titan-sink-tip/ (#5-#10;
--     Int about 1.25 ips, Sink 3 2.5-3.5 ips, Sink 6 5.5-6.5 ips), $99.95 at retailers.
--     Head weights vary between listings, so they are left blank.
--   RIO Elite Predator (Pike/Musky) WF10F: 410 gr head (FishUSA, Trident), $129.99.
--   RIO Powerflex Plus 9' leaders: 3X 9.5 lb, 0X 18 lb (Backcountry, Yellow Dog,
--     Trident); same price, pack, link and image as the existing 9' 5X row.
--   RIO Pike/Musky Leader (stealth): 6', 60 lb fluorocarbon bite section, $13.99
--     (farbank.com/products/rio-pike-musky-leader).
--   RIO Powerflex Wire Bite Tippet: 30 lb, 15 ft spool, $19.99
--     (rioproducts.com/products/powerflex-wire-bite-tippet).

-- Wire bite tippet is neither nylon nor fluorocarbon
ALTER TABLE tippets
  MODIFY material ENUM('nylon','fluorocarbon','wire') NOT NULL;

INSERT INTO fly_lines (brand_id, name, line_weight, type, sink_rate_ips, water, head_weight_grains, price, purchase_url) VALUES
  ((SELECT id FROM brands WHERE name = 'Scientific Anglers'), 'Sonar Titan Sink Tip (Sink 3)', 7, 'sink_tip', 3.0, 'fresh', NULL, 99.95,
   'https://www.scientificanglers.com/product/sonar-titan-sink-tip/'),
  ((SELECT id FROM brands WHERE name = 'Scientific Anglers'), 'Sonar Titan Sink Tip (Int)', 10, 'sink_tip', 1.25, 'fresh', NULL, 99.95,
   'https://www.scientificanglers.com/product/sonar-titan-sink-tip/'),
  ((SELECT id FROM brands WHERE name = 'Scientific Anglers'), 'Sonar Titan Sink Tip (Sink 6)', 10, 'sink_tip', 6.0, 'fresh', NULL, 99.95,
   'https://www.scientificanglers.com/product/sonar-titan-sink-tip/'),
  ((SELECT id FROM brands WHERE name = 'RIO'), 'Elite Predator', 10, 'floating', NULL, 'fresh', 410, 129.99,
   'https://www.tridentflyfishing.com/products/rio-predator-elite-fly-line');

-- Copy the 9' 5X row's link and image (MySQL can't read leaders while inserting
-- into it, so the values come through a derived table)
INSERT INTO leaders (brand_id, name, material, water, length_ft, x_size_id, strength_lb, pack_count, price, purchase_url, image_path)
SELECT base.brand_id, base.name, 'nylon', 'fresh', 9.0, x.id, sizes.strength_lb, 3, 19.99, base.purchase_url, base.image_path
FROM (
  SELECT l.brand_id, l.name, l.purchase_url, l.image_path
  FROM leaders l
  JOIN x_sizes lx ON lx.id = l.x_size_id
  WHERE l.brand_id = (SELECT id FROM brands WHERE name = 'RIO')
    AND l.name = 'Powerflex Plus Trout Leader' AND l.length_ft = 9.0 AND lx.label = '5X'
) AS base
CROSS JOIN (SELECT '3X' AS label, 9.5 AS strength_lb UNION ALL SELECT '0X', 18.0) AS sizes
JOIN x_sizes x ON x.label = sizes.label;

INSERT INTO leaders (brand_id, name, material, water, length_ft, x_size_id, strength_lb, pack_count, price, purchase_url) VALUES
  ((SELECT id FROM brands WHERE name = 'RIO'), 'Pike/Musky Leader', 'fluorocarbon', 'fresh', 6.0, NULL, 60.0, 1, 13.99,
   'https://farbank.com/products/rio-pike-musky-leader');

INSERT INTO tippets (brand_id, name, material, water, x_size_id, strength_lb, spool_yards, price, purchase_url) VALUES
  ((SELECT id FROM brands WHERE name = 'RIO'), 'Powerflex Wire Bite Tippet', 'wire', 'both', NULL, 30.0, 5, 19.99,
   'https://rioproducts.com/products/powerflex-wire-bite-tippet');
