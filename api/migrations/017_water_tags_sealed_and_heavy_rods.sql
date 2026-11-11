-- 017_water_tags_sealed_and_heavy_rods: widen the saltwater tags from 015.
-- Every sealed-drag reel becomes both, whatever its line weight (015 only covered 7 wt and up).
-- Freshwater rods rated 7 wt or above become both; saltwater-specific rods stay salt.

UPDATE reels SET water = 'both'
WHERE name LIKE '%(sealed)%' AND water = 'fresh';

UPDATE rods SET water = 'both'
WHERE line_weight >= 7 AND water = 'fresh';
