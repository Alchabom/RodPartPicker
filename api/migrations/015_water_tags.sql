-- 015_water_tags: tag parts that suit saltwater as well as freshwater.
-- The seed data left every tippet, and every reel not labelled "(saltwater)", as fresh.
-- Strong tippets (0X-3X) and sealed-drag reels rated to 7 wt or above become both.

UPDATE tippets SET water = 'both'
WHERE x_size_id IN (SELECT id FROM x_sizes WHERE label IN ('0X', '1X', '2X', '3X'));

UPDATE reels SET water = 'both'
WHERE name LIKE '%(sealed)%' AND max_line_weight >= 7;
