-- 023_powerflex_strong: RIO discontinued Powerflex Plus tippet and replaced it
-- with Powerflex Strong (Far Bank's RIO FAQ). The eight rows are updated in place,
-- so saved and published builds that chose a Powerflex Plus size keep their row
-- and now show its Powerflex Strong successor.
-- Strengths: The Fly Stop and Tailwaters spec charts (Far Bank's page blocks scripts).
-- Price and link: farbank.com/products/rio-powerflex-strong-tippet.
-- See docs/database/seed-data-notes.md.

UPDATE tippets t
JOIN x_sizes x ON x.id = t.x_size_id
SET t.name = 'Powerflex Strong',
    t.strength_lb = CASE x.label
      WHEN '0X' THEN 16.2
      WHEN '1X' THEN 14.0
      WHEN '2X' THEN 11.2
      WHEN '3X' THEN 9.1
      WHEN '4X' THEN 7.5
      WHEN '5X' THEN 5.5
      WHEN '6X' THEN 3.6
      WHEN '7X' THEN 2.5
    END,
    t.spool_yards = 30,
    t.price = 8.49,
    t.purchase_url = 'https://farbank.com/products/rio-powerflex-strong-tippet'
WHERE t.brand_id = (SELECT id FROM brands WHERE name = 'RIO')
  AND t.name = 'Powerflex Plus'
  AND x.label IN ('0X', '1X', '2X', '3X', '4X', '5X', '6X', '7X');
