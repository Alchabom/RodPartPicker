-- Part details from part_details_small_images.csv, generated 2026-11-20.
-- Design: docs/superpowers/specs/2026-11-18-part-details-design.md

UPDATE fly_lines SET image_path = 'lines/rio-elite-gold.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Elite Gold';
UPDATE fly_lines SET image_path = 'lines/rio-avid-trout-gold.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Avid Trout-Gold';
UPDATE fly_lines SET image_path = 'lines/rio-flats-pro.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Flats Pro (15ft Int)';
UPDATE fly_lines SET image_path = 'lines/rio-flats-pro.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Flats Pro (6ft Int)';
UPDATE fly_lines SET image_path = 'lines/rio-flats-pro.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Flats Pro (Float)';
UPDATE fly_lines SET image_path = 'lines/rio-flats-pro.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Flats Pro (Int)';
UPDATE fly_lines SET image_path = 'lines/rio-tropical-outbound-short.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Trop. Outbound Short (Float)';
UPDATE fly_lines SET image_path = 'lines/rio-tropical-outbound-short.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Trop. Outbound Short (Int)';
UPDATE fly_lines SET image_path = 'lines/rio-tropical-outbound-short.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Trop. Outbound Short (Quick)';
UPDATE fly_lines SET image_path = 'lines/rio-tropical-outbound-short.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Trop. Outbound Short (Slow)';
UPDATE leaders SET image_path = 'leaders/orvis-mirage-big-game-leader.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'Mirage Big Game Leader';
UPDATE leaders SET image_path = 'leaders/orvis-superstrong-plus-leader.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'SuperStrong Plus Leader';
UPDATE leaders SET image_path = 'leaders/rio-fluoroflex-trout-leader.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Fluoroflex Trout Leader';
UPDATE leaders SET image_path = 'leaders/rio-powerflex-plus-trout-leader.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Powerflex Plus Trout Leader';
UPDATE leaders SET image_path = 'leaders/scientific-anglers-absolute-fluorocarbon-trout-leader.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Scientific Anglers') AND name = 'Absolute Fluorocarbon Trout Leader';
UPDATE leaders SET image_path = 'leaders/scientific-anglers-absolute-saltwater-leader.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Scientific Anglers') AND name = 'Absolute Saltwater Leader';
UPDATE leaders SET image_path = 'leaders/scientific-anglers-absolute-streamer-leader.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Scientific Anglers') AND name = 'Absolute Streamer Leader';
UPDATE leaders SET image_path = 'leaders/scientific-anglers-absolute-trout-leader.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Scientific Anglers') AND name = 'Absolute Trout Leader';
UPDATE tippets SET image_path = 'tippets/orvis-superstrong-plus.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'SuperStrong Plus';
UPDATE tippets SET image_path = 'tippets/rio-powerflex-strong.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Powerflex Strong';
UPDATE tippets SET image_path = 'tippets/scientific-anglers-absolute-fluorocarbon-trout.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Scientific Anglers') AND name = 'Absolute Fluorocarbon Trout';
UPDATE tippets SET image_path = 'tippets/umpqua-perform-x-nylon-trout-tippet.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Umpqua') AND name = 'Perform X Nylon Trout Tippet';
