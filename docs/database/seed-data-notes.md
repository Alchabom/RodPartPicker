# Seed Data Notes: `rods reels lines.xlsx`

**Loaded:** 2026-10-11 by migrations 010–012; synced with `rods reels lines (updated).xlsx` by 013

| Migration | What it does |
|---|---|
| `010_allow_unknown_specs.sql` | Lets rod `pieces`, leader `x_size_id` and `price`, and fly line `type` be blank; a sinking line's sink rate may be unknown |
| `011_restore_strength_lb.sql` | Adds `strength_lb` back to `leaders` and `tippets` (dropped in 006 and 008) |
| `012_seed_catalog.sql` | The catalog data, generated from the spreadsheet |
| `013_sync_catalog.sql` | Updates from the team's edits to the updated workbook: rod pieces, Sage/Redington rods, tippets, leader lb ratings, Flats Pro head weights. Lets rod `action` be blank |

## What was loaded

| Table | Rows | Source columns |
|---|---|---|
| `brands` | 7 | Lamson, Orvis, RIO, Scientific Anglers (split off the front of each product name); Sage, Redington, Umpqua added in 013 |
| `rods` | 193 | A–E: name, weight, speed, length (ft), price; 88 Sage/Redington rods added in 013 |
| `reels` | 50 | H–J: name, size, price |
| `fly_lines` | 58 | L–Q: name, weight, sink rate, water, head weight, price (22 sheet rows; see "Line versions") |
| `leaders` | 13 | W–AC: brand, name, pack count, tip, material, length, use (no header row) |
| `tippets` | 32 | Added in 013: 4 brands × 0X–7X |

The "Standard 30ft head weights" block (S–T) matches the existing `line_weights`
seed, so nothing new was loaded from it.

## Still blank

| Table | Column | Blank rows | Status |
|---|---|---|---|
| `rods` | `action` | 13 of 193 | Sage Spey R8 rods are listed by Spey category ("Max Versatility", "Switch"...), not action |
| `leaders` | `price` | 13 of 13 | Team is adding these |
| `leaders` | `x_size_id` | 3 of 13 | Rated in lb only: Mirage Big Game, Absolute Streamer, Absolute Saltwater |
| `fly_lines` | `type` | 5 of 58 | Trop. Outbound Short (Quick): no matching type in the enum |
| `fly_lines` | `sink_rate_ips` | all non-floating | Not in the sheet |

## Rules from the team

- **Rod water:** a name saying Freshwater/Saltwater wins (Recon); otherwise `both` at 8wt and up, `fresh` below.
- **Reel line weights:** a size of `-n+` (or plain `n`) is an (n−1)–(n+1) weight reel, so `-2+` = 1–3wt.
  The size is no longer part of the reel name; the line-weight range tells sizes apart.
- **Reel water:** "(saltwater)" reels are `salt` (removed from the name); all others `fresh`.
- **Leader water:** from the use column (AC). "Clear water…" and "Streamers…" → `fresh`; "Large flies and big fish" → `both`.
- **Leader strength:** the lb value in the tip column (5.9, 4.4, 12, 10, 12).

## Line versions

A sheet row listing several versions became one row per version, with the
version in the name. Price and head weight are the sheet row's, shared by every version.

| Line | Version | `type` |
|---|---|---|
| Flats Pro | Float | `floating` |
| Flats Pro | 6ft Int, 15ft Int | `sink_tip` (floating line, intermediate tip) |
| Flats Pro | Int | `intermediate` |
| Trop. Outbound Short | Float | `floating` |
| Trop. Outbound Short | Slow, Int | `intermediate` |
| Trop. Outbound Short | Quick | blank |

## Other interpretations

- **New rods (013) came in the raw format** and were normalized: "Freshwater"/"Saltwater" → `fresh`/`salt` (the sheet's value is used, so the 8wt+ `both` rule doesn't apply), "Moderate" → `medium`, decimal feet × 12 (9.5 ft = 114 in, matching Sage model codes like 596).
- **"Ultra-Fast" (Sage Power R8, 8 rods) stored as `fast`;** the enum has no faster value.
- **Tippet spools of 32.81 yd (30 m) stored as 33 yd;** `spool_yards` is a whole number.

- **Five reels had no brand** (Hyperspeed F, Litespeed F). Assigned **Lamson**, which makes both.
- **Rod lengths `8.6` and `10.8` read as 8'6" (102 in) and 10'8" (128 in).** Other decimals were feet × 12.
- **Duplicate skipped:** Orvis Helios F 7wt 9 ft $1198 appears twice.
- **"Rio" and "RIO" merged** into one brand, `RIO`.
- **Leaders sold in several lengths** became one row per length.
- **Leader material:** "Nylon copolymer" and "Copolymer / nylon blend" → `nylon`; "100% fluorocarbon" → `fluorocarbon`.
- **Names kept as written,** including "Orvis Superfine Grafite" (likely "Graphite") and lowercase names like "liquid max".

## Values to double-check

- **Avid Trout-Gold 7wt: 270 gr.** The rest of that line sits at the AFTMA maximum, which would be 193 for a 7wt.

## Links and images

Purchase links (all five part types) and images (rods and reels) are loaded in
batches. Each batch is a numbered migration generated from a CSV by
`api/app/part_details.py`, so it is reviewed in git and applied by `pnpm db:migrate`.

**Workflow**

1. Copy `api/part_details_template.csv` to `api/part_details_<label>.csv` and fill it in. The header is `component,brand,model,purchase_url,image_file`. `component` is `rod`, `reel`, `line`, `leader` or `tippet`. For rods, `model` is the **series name** (`R8 Core`, `Liquid Max`), since rod links and images live on `rod_series` (migration 024). `image_file` is optional and only for rods and reels.
2. Put the `.webp` files in `public/parts/rods/` and `public/parts/reels/`.
3. From `api/`, run `uv run python -m app.part_details build part_details_<label>.csv --name <label>`. It writes `api/migrations/<next number>_part_details_<label>.sql`, or lists every bad row (with its line number) and writes nothing.
4. Read the generated SQL.
5. Run `pnpm db:migrate`.
6. Run `uv run python -m app.part_details missing` to see what is still empty.

A statement matches every size row of that model, and can be repeated, so a later batch can replace an earlier link or image, but it cannot clear one. Clearing a value (for example a dead link) needs a hand-written migration with `UPDATE ... SET purchase_url = NULL ...`. Fully blank rows in the CSV are skipped. Never edit an applied batch; add a new one. Cells are trimmed, the CSV may come from Excel (UTF-8 BOM, CRLF), and brand and model match the catalog without regard to case.

**Image rules**

- WebP, 800x600, under 100 KB.
- Named `<brand>-<model>.webp`, lowercase, with every run of other characters turned into one hyphen: `Lamson` + `Liquid S` is `reels/lamson-liquid-s.webp`. The folder must match the component (`rods/` or `reels/`).
- Rod images are named after the series slug: `rods/<brand>-<series slug>.webp`, such as `rods/sage-r8-core.webp` and `rods/orvis-superfine-graphite.webp`. One image covers every size of the series.
- One reel file can serve several rows (every size of a reel model can share one image).
- Only use images the team may use, and record where each came from in the table below.

**Batches**

| Batch | Migration | Sources | Image credits |
|---|---|---|---|
| `links` (2026-11-19) | `022_part_details_links.sql` | Manufacturer product pages only: farbank.com (Sage, Redington, RIO), orvis.com, lamsonflyfishing.com, scientificanglers.com, umpqua.com. Every URL was listed in that site's own sitemap (robots.txt allowed it). All sizes of a series share the series page | No images |

Notes on the `links` batch:

- RIO Powerflex Plus tippet had no link: RIO discontinued it and replaced it with Powerflex Strong ([Far Bank's RIO FAQ](https://farbank.com/pages/rio-product-faq)). Migration `023_powerflex_strong.sql` updates the eight rows in place, so builds that chose a Powerflex Plus size now hold Powerflex Strong. It sets the new name, the 30 yd spool, $8.49 (Far Bank's price), the Far Bank link, and these strengths from The Fly Stop's and Tailwaters' spec charts: 0X 16.2, 1X 14.0, 2X 11.2, 3X 9.1, 4X 7.5, 5X 5.5, 6X 3.6, 7X 2.5 lb. Strong's half sizes (4.5X, 5.5X, 6.5X) were not added. The questionnaire's tippet pick (`app/questionnaire/rules.py`) follows the rename.
- Lamson `Remix S` and `Remix S (sealed)` both link to the Remix S page, and `speedster` and `speedster with fighting butt` both link to the Speedster rod page. Lamson sells those variants from one page.
- Scientific Anglers' `absolute-trout` page is the Trout *Tippet*. The Absolute Trout Leader is `absolute-trout-1-pack`, and the Absolute Fluorocarbon Trout Leader is `absolute-fluorocarbon` (page title "Absolute Fluorocarbon Leaders").

## Changing the data

Data typed into TablePlus lives only in that computer's database. Teammates
won't get it from `pnpm db:migrate`. To share a change, add a new migration
with the `UPDATE`/`INSERT` statements (never edit 012 once others have run it).
