# Seed Data Notes: `rods reels lines.xlsx`

**Loaded:** 2026-10-11 by migrations 010–012

| Migration | What it does |
|---|---|
| `010_allow_unknown_specs.sql` | Lets rod `pieces`, leader `x_size_id` and `price`, and fly line `type` be blank; a sinking line's sink rate may be unknown |
| `011_restore_strength_lb.sql` | Adds `strength_lb` back to `leaders` and `tippets` (dropped in 006 and 008) |
| `012_seed_catalog.sql` | The catalog data, generated from the spreadsheet |

## What was loaded

| Table | Rows | Source columns |
|---|---|---|
| `brands` | 4 | Lamson, Orvis, RIO, Scientific Anglers (split off the front of each product name) |
| `rods` | 105 | A–E: name, weight, speed, length (ft), price |
| `reels` | 50 | H–J: name, size, price |
| `fly_lines` | 58 | L–Q: name, weight, sink rate, water, head weight, price (22 sheet rows; see "Line versions") |
| `leaders` | 13 | W–AC: brand, name, pack count, tip, material, length, use (no header row) |
| `tippets` | 0 | Not in the sheet |

The "Standard 30ft head weights" block (S–T) matches the existing `line_weights`
seed, so nothing new was loaded from it.

## Still blank

| Table | Column | Blank rows | Status |
|---|---|---|---|
| `rods` | `pieces` | 105 of 105 | Team is adding these |
| `leaders` | `price` | 13 of 13 | Team is adding these |
| `leaders` | `strength_lb` | 5 of 13 | Sheet says only "5X (varies by size)": Absolute Fluorocarbon Trout, Powerflex Plus Trout (3 lengths), Fluoroflex Trout |
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

- **Five reels had no brand** (Hyperspeed F, Litespeed F). Assigned **Lamson**, which makes both.
- **Rod lengths `8.6` and `10.8` read as 8'6" (102 in) and 10'8" (128 in).** Other decimals were feet × 12.
- **Duplicate skipped:** Orvis Helios F 7wt 9 ft $1198 appears twice.
- **"Rio" and "RIO" merged** into one brand, `RIO`.
- **Leaders sold in several lengths** became one row per length.
- **Leader material:** "Nylon copolymer" and "Copolymer / nylon blend" → `nylon`; "100% fluorocarbon" → `fluorocarbon`.
- **Names kept as written,** including "Orvis Superfine Grafite" (likely "Graphite") and lowercase names like "liquid max".

## Values to double-check

- **Avid Trout-Gold 7wt: 270 gr.** The rest of that line sits at the AFTMA maximum, which would be 193 for a 7wt.
- **Flats Pro 11wt: 380 gr,** lighter than its 10wt (475 gr).

## Changing the data

Data typed into TablePlus lives only in that computer's database. Teammates
won't get it from `pnpm db:migrate`. To share a change, add a new migration
with the `UPDATE`/`INSERT` statements (never edit 012 once others have run it).
