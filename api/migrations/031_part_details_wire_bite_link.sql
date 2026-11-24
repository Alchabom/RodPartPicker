-- Part details from part_details_wire_bite_link.csv, generated 2026-11-24.
-- Design: docs/superpowers/specs/2026-11-18-part-details-design.md

UPDATE tippets SET purchase_url = 'https://farbank.com/products/rio-powerflex-wire-bite-tippet' WHERE brand_id = (SELECT id FROM brands WHERE name = 'RIO') AND name = 'Powerflex Wire Bite Tippet';
