-- 002_seed_lookups: reference data that never changes per product.

-- AFTMA line weight standard (grains, first 30 ft of line)
INSERT INTO line_weights (weight_class, grains_target, grains_min, grains_max) VALUES
  (1,  60,  54,  66), (2,  80,  74,  86), (3, 100,  94, 106), (4, 120, 114, 126),
  (5, 140, 134, 146), (6, 160, 152, 168), (7, 185, 177, 193), (8, 210, 202, 218),
  (9, 240, 230, 250), (10, 280, 270, 290), (11, 330, 318, 342), (12, 380, 368, 392),
  (13, 450, 435, 465), (14, 500, 485, 515), (15, 550, 535, 565);

-- Tippet X-sizes, heaviest first (higher id = finer)
INSERT INTO x_sizes (id, label, diameter_in) VALUES
  (1, '03X', 0.014), (2, '02X', 0.013), (3, '01X', 0.012), (4, '0X', 0.011),
  (5, '1X', 0.010),  (6, '2X', 0.009),  (7, '3X', 0.008),  (8, '4X', 0.007),
  (9, '5X', 0.006),  (10, '6X', 0.005), (11, '7X', 0.004), (12, '8X', 0.003);
