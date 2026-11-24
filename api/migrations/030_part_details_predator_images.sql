-- Part details from part_details_predator_images.csv, generated 2026-11-24.
-- Design: docs/superpowers/specs/2026-11-18-part-details-design.md

UPDATE fly_lines SET image_path = 'lines/scientific-anglers-sonar-titan-sink-tip.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Scientific Anglers') AND name = 'Sonar Titan Sink Tip (Sink 3)';
UPDATE fly_lines SET image_path = 'lines/scientific-anglers-sonar-titan-sink-tip.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Scientific Anglers') AND name = 'Sonar Titan Sink Tip (Int)';
UPDATE fly_lines SET image_path = 'lines/scientific-anglers-sonar-titan-sink-tip.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Scientific Anglers') AND name = 'Sonar Titan Sink Tip (Sink 6)';
UPDATE fly_lines SET image_path = 'lines/rio-elite-predator.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Elite Predator';
UPDATE leaders SET image_path = 'leaders/rio-pike-musky-leader.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Pike/Musky Leader';
UPDATE tippets SET image_path = 'tippets/rio-powerflex-wire-bite.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Powerflex Wire Bite Tippet';
