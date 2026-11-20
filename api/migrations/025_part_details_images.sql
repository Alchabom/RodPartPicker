-- Part details from part_details_images.csv, generated 2026-11-20.
-- Design: docs/superpowers/specs/2026-11-18-part-details-design.md

UPDATE rod_series SET image_path = 'rods/lamson-e-series.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Lamson') AND name = 'E-Series';
UPDATE rod_series SET image_path = 'rods/lamson-liquid.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Lamson') AND name = 'Liquid';
UPDATE rod_series SET image_path = 'rods/lamson-liquid-max.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Lamson') AND name = 'Liquid Max';
UPDATE rod_series SET image_path = 'rods/lamson-speedster.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Lamson') AND name = 'Speedster';
UPDATE rod_series SET image_path = 'rods/orvis-clearwater.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'Clearwater';
UPDATE rod_series SET image_path = 'rods/orvis-encounter.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'Encounter';
UPDATE rod_series SET image_path = 'rods/orvis-helios-d.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'Helios D';
UPDATE rod_series SET image_path = 'rods/orvis-helios-f.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'Helios F';
UPDATE rod_series SET image_path = 'rods/orvis-recon-freshwater.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'Recon Freshwater';
UPDATE rod_series SET image_path = 'rods/orvis-recon-saltwater.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'Recon Saltwater';
UPDATE rod_series SET image_path = 'rods/orvis-superfine-glass.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'Superfine Glass';
UPDATE rod_series SET image_path = 'rods/orvis-superfine-graphite.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'Superfine Graphite';
UPDATE rod_series SET image_path = 'rods/redington-classic-trout.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Redington') AND name = 'Classic Trout';
UPDATE rod_series SET image_path = 'rods/redington-edc.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Redington') AND name = 'EDC';
UPDATE rod_series SET image_path = 'rods/sage-classic-r8.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Sage') AND name = 'Classic R8';
UPDATE rod_series SET image_path = 'rods/sage-foundation.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Sage') AND name = 'Foundation';
UPDATE rod_series SET image_path = 'rods/sage-power-r8.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Sage') AND name = 'Power R8';
UPDATE rod_series SET image_path = 'rods/sage-r8-core.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Sage') AND name = 'R8 Core';
UPDATE rod_series SET image_path = 'rods/sage-salt-r8.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Sage') AND name = 'Salt R8';
UPDATE rod_series SET image_path = 'rods/sage-spey-r8.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Sage') AND name = 'Spey R8';
UPDATE reels SET image_path = 'reels/lamson-force-sl-series-ii.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Lamson') AND name = 'Force SL Series II';
UPDATE reels SET image_path = 'reels/lamson-guru-x.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Lamson') AND name = 'Guru X';
UPDATE reels SET image_path = 'reels/lamson-hyperspeed-f.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Lamson') AND name = 'Hyperspeed F (sealed)';
UPDATE reels SET image_path = 'reels/lamson-hyperspeed-m.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Lamson') AND name = 'HyperSpeed M';
UPDATE reels SET image_path = 'reels/lamson-liquid-s.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Lamson') AND name = 'Liquid S';
UPDATE reels SET image_path = 'reels/lamson-liquid-s-hd.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Lamson') AND name = 'Liquid S HD';
UPDATE reels SET image_path = 'reels/lamson-litespeed-f.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Lamson') AND name = 'Litespeed F (sealed)';
UPDATE reels SET image_path = 'reels/lamson-litespeed-m.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Lamson') AND name = 'Litespeed M';
UPDATE reels SET image_path = 'reels/lamson-remix-s.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Lamson') AND name = 'Remix S';
UPDATE reels SET image_path = 'reels/lamson-remix-s.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Lamson') AND name = 'Remix S (sealed)';
UPDATE reels SET image_path = 'reels/lamson-speedster-s.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Lamson') AND name = 'Speedster S';
UPDATE reels SET image_path = 'reels/lamson-speedster-s-hd.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Lamson') AND name = 'Speedster S HD';
UPDATE reels SET image_path = 'reels/orvis-hydros.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'Hydros (sealed)';
UPDATE reels SET image_path = 'reels/orvis-mirage-lt.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'Mirage LT (sealed)';
UPDATE reels SET image_path = 'reels/orvis-ratio.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'Ratio (sealed)';
