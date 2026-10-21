-- 014_leader_prices: retail prices for every leader seeded in 012.
-- Prices are per pack (pack_count), collected from retailer listings in October 2026.

UPDATE leaders SET price = 19.95 WHERE brand_id = (SELECT id FROM brands WHERE name = 'Scientific Anglers') AND name = 'Absolute Trout Leader' AND length_ft = 7.5 AND pack_count = 3;
UPDATE leaders SET price = 19.95 WHERE brand_id = (SELECT id FROM brands WHERE name = 'Scientific Anglers') AND name = 'Absolute Trout Leader' AND length_ft = 9 AND pack_count = 3;
UPDATE leaders SET price = 16.95 WHERE brand_id = (SELECT id FROM brands WHERE name = 'Scientific Anglers') AND name = 'Absolute Fluorocarbon Trout Leader' AND length_ft = 9 AND pack_count = 1;
UPDATE leaders SET price = 19.99 WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Powerflex Plus Trout Leader' AND length_ft = 7.5 AND pack_count = 3;
UPDATE leaders SET price = 19.99 WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Powerflex Plus Trout Leader' AND length_ft = 9 AND pack_count = 3;
UPDATE leaders SET price = 19.99 WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Powerflex Plus Trout Leader' AND length_ft = 12 AND pack_count = 3;  -- estimated from the 7.5/9 ft price
UPDATE leaders SET price = 16.99 WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Fluoroflex Trout Leader' AND length_ft = 9 AND pack_count = 1;
UPDATE leaders SET price = 8.95 WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'SuperStrong Plus Leader' AND length_ft = 7.5 AND pack_count = 2;
UPDATE leaders SET price = 8.95 WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'SuperStrong Plus Leader' AND length_ft = 9 AND pack_count = 2;
UPDATE leaders SET price = 8.95 WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'SuperStrong Plus Leader' AND length_ft = 12 AND pack_count = 2;
UPDATE leaders SET price = 29.95 WHERE brand_id = (SELECT id FROM brands WHERE name = 'Orvis') AND name = 'Mirage Big Game Leader' AND length_ft = 9 AND pack_count = 2;
UPDATE leaders SET price = 8.95 WHERE brand_id = (SELECT id FROM brands WHERE name = 'Scientific Anglers') AND name = 'Absolute Streamer Leader' AND length_ft = 4 AND pack_count = 1;
UPDATE leaders SET price = 8.95 WHERE brand_id = (SELECT id FROM brands WHERE name = 'Scientific Anglers') AND name = 'Absolute Saltwater Leader' AND length_ft = 10 AND pack_count = 1;
