# Rod Series Design: Pick a Rod by Brand, Then Series, Then Size

**Date:** 2026-11-20
**Follows:** `docs/superpowers/specs/2026-11-18-part-details-design.md` (purchase links and images), whose rod image and link columns this spec moves onto the new series table
**Depends on:** migrations `022_part_details_links.sql` and `023_powerflex_strong.sql` (branch `oa-part-links`), which must merge first
**Updates:** `docs/database/schema-design.md` (new table) and `docs/database/seed-data-notes.md` (rod batches are per series)
**Branch:** `oa-rod-series`, off `main` once `oa-part-links` has merged

## Goal

Make choosing a rod quick and clear. Today a brand's rods are one flat table with a row per size: Sage alone lists 64 rows that differ only in weight and length. Instead, a brand's page lists its rod **series** (Sage R8 Core, Orvis Clearwater, ...). Each series has a photo, and opening it shows its sizes. The user adds one size, as before.

This is for rods only. Reels follow in a later, smaller change that reuses the same pattern (a `reel_series` table and the same page component). Lines, leaders and tippets keep the current table.

The grouping is server data, not a frontend guess: the database knows which rods form a series, and the API returns them grouped, sorted and summarized.

## Success criteria

- A `rod_series` table holds the 20 series listed below. Every rod belongs to exactly one series (`series_id` NOT NULL, with a foreign key).
- Each series owns its purchase link and image. `rods.purchase_url` and `rods.image_path` no longer exist.
- Rod ids and names are unchanged. Saved builds, published builds, the questionnaire and the compatibility checks keep working without changes.
- `GET /api/rods/series` returns series grouped and sorted, with brand, image, link, a summary and their sizes. `?brand=<slug>` filters to one brand. The endpoint runs in two queries, however many series there are.
- `GET /api/parts/rod` keeps its shape and gains `seriesId` and `sizeCode`. Its `purchaseUrl` and `imageUrl` come from the series.
- Published build responses read the rod's link and image from its series, with no extra queries.
- `/builder/rod/:brand` and `/builder/:buildId/rod/:brand` show the new series page: collapsible series rows with a photo, opening to a large photo, a Buy link and a sizes table with Add.
- The `part_details` tool takes rod rows per series and updates `rod_series`.
- `uv run pytest`, `pnpm test`, `npm run build` and `npm run lint` pass, and the manual script passes.

## Out of scope

- Reels, lines, leaders and tippets (reels are the planned follow-up).
- Series descriptions. They were drafted and dropped; the name and summary carry the page.
- Changing rod specs or names. Catalog values such as Helios F's "slow" action are taken as they are.
- Filtering or sorting controls on the series page.
- Remembering which series rows were open after leaving the page.

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Where series come from | A `rod_series` table and `rods.series_id` | Series become real data with an id, a slug and a display name. Parsing names fails for Orvis and Lamson, whose names have no size code, and the team wanted the server to own the grouping |
| Not a `series` text column on `rods` | Rejected | A series would have no id, slug or display name, and its image and link would stay copied on every size row |
| Image and link | Move from `rods` to `rod_series` | Every size of a series already shares them (migration 022 set them per series), so each fact gets one home and can't drift between sizes |
| Rod names | Unchanged | The questionnaire picks rods by name, and builds point at rod ids. Leaving both alone keeps every other feature working |
| Display names | Stored on the series | They can be correct even where the catalog name is not: "Liquid Max" instead of "liquid max", "Superfine Graphite" instead of "Grafite" |
| Lamson Speedster | One series, with the fighting-butt rod as one of its sizes | Lamson sells both from one product page with one photo |
| Telling sizes apart | A `size_code` column | Sage and Redington codes (`590-4`, `690-4 FB`) are what anglers look for. The column is `NULL` where length and weight already identify the size |
| API shape | A grouped endpoint plus the existing flat one | The page gets everything it shows from one request. The builder still needs per-size lookups for a selected rod |
| Page layout | Collapsible series rows (option B from the mockups) | The user chose it: one page per brand, with a photo per series and the sizes in place |
| Reels | A follow-up change | Rods are the hard case (size in the name). Reels are already one name per model, so they can reuse this design with little data work |

## Data model

Migration `api/migrations/024_rod_series.sql`. It runs in this order, in one file.

**1. Create the table and the new rod columns.**

```sql
CREATE TABLE rod_series (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  brand_id      INT UNSIGNED NOT NULL,
  name          VARCHAR(120) NOT NULL,
  slug          VARCHAR(120) NOT NULL,
  purchase_url  VARCHAR(500) NULL,
  image_path    VARCHAR(255) NULL,
  UNIQUE KEY uq_rod_series_name (brand_id, name),
  UNIQUE KEY uq_rod_series_slug (brand_id, slug),
  CONSTRAINT fk_rod_series_brand FOREIGN KEY (brand_id) REFERENCES brands(id),
  CONSTRAINT chk_rod_series_slug CHECK (REGEXP_LIKE(slug, '^[a-z0-9]+(-[a-z0-9]+)*$', 'c')),
  CONSTRAINT chk_rod_series_purchase_url CHECK (purchase_url LIKE 'https://%'),
  CONSTRAINT chk_rod_series_image_path CHECK (REGEXP_LIKE(image_path, '^rods/[a-z0-9-]+\\.webp$', 'c'))
) ENGINE=InnoDB;

ALTER TABLE rods
  ADD COLUMN series_id INT UNSIGNED NULL,
  ADD COLUMN size_code VARCHAR(40) NULL;
```

**2. Insert the 20 series.** Each is written out, with its brand looked up by name.

| Brand | Name | Slug | Rods in it (current `rods.name`) |
|---|---|---|---|
| Lamson | E-Series | `e-series` | `e-series` |
| Lamson | Liquid | `liquid` | `liquid` |
| Lamson | Liquid Max | `liquid-max` | `liquid max` |
| Lamson | Speedster | `speedster` | `speedster`, `speedster with fighting butt` |
| Orvis | Clearwater | `clearwater` | `Clearwater` |
| Orvis | Encounter | `encounter` | `Encounter` |
| Orvis | Helios D | `helios-d` | `Helios D` |
| Orvis | Helios F | `helios-f` | `Helios F` |
| Orvis | Recon Freshwater | `recon-freshwater` | `Recon Freshwater` |
| Orvis | Recon Saltwater | `recon-saltwater` | `Recon Saltwater` |
| Orvis | Superfine Glass | `superfine-glass` | `Superfine Glass` |
| Orvis | Superfine Graphite | `superfine-graphite` | `Superfine Grafite` |
| Redington | Classic Trout | `classic-trout` | `Classic Trout %` |
| Redington | EDC | `edc` | `EDC %` |
| Sage | Classic R8 | `classic-r8` | `Classic R8 %` |
| Sage | Foundation | `foundation` | `Foundation %` |
| Sage | Power R8 | `power-r8` | `Power R8 %` |
| Sage | R8 Core | `r8-core` | `R8 Core %` |
| Sage | Salt R8 | `salt-r8` | `Salt R8 %` |
| Sage | Spey R8 | `spey-r8` | `Spey R8 %` |

**3. Assign rods to series.** One `UPDATE` per series, matching the brand and either the exact name (Lamson, Orvis) or `name LIKE '<prefix> %'` (Redington, Sage). The trailing space in the pattern keeps `R8 Core` from matching another series' names.

**4. Fill `size_code`.**
- Redington and Sage: the part of the name after the series prefix, trimmed (`R8 Core 590-4` → `590-4`, `EDC 690-4 FB` → `690-4 FB`, `Power R8 690-4FB` → `690-4FB`). The codes are kept exactly as the catalog writes them.
- Lamson `speedster with fighting butt`: `Fighting butt`.
- Everything else: `NULL`.

**5. Copy links and images.** Each series takes the `purchase_url` and `image_path` of its rods. Migration 022 gave every size of a series the same link, so the copy uses `MIN(...)` over the series' rods. An assertion query in the tests checks that no series had two different values.

**6. Lock it down.** In this order:
- `series_id` becomes `NOT NULL`, with `fk_rods_series FOREIGN KEY (series_id) REFERENCES rod_series(id)`.
- The rod CHECKs `chk_rods_purchase_url` and `chk_rods_image_path` are dropped.
- The columns `rods.purchase_url` and `rods.image_path` are dropped.

### SQLAlchemy models (`app/parts/models.py`)

- New `RodSeries` model mapping `rod_series`, with a `brand` relationship.
- `Rod` gains `series_id`, `size_code` and a `series` relationship, and loses `image_path`.
- `purchase_url` moves off the shared `CatalogPart` onto `Reel`, `FlyLine`, `Leader` and `Tippet`, since rods no longer have it.

### Images

- Rod image files are named after the series: `rods/<brand slug>-<series slug>.webp`, such as `rods/sage-r8-core.webp`.
- The Orvis Superfine Graphite file is `rods/orvis-superfine-graphite.webp`, following the series slug, not the catalog's "Grafite" spelling.
- The image rules in `seed-data-notes.md` otherwise stay the same: WebP, 800×600, under 100 KB.

## API

### `GET /api/rods/series` (new package `app/rods/`: `router.py`, `schemas.py`)

- Public, like `/api/parts`. Registered in `app/main.py` under `/api`.
- Optional query `brand`: a brand slug. An unknown slug returns `200 []`.
- Brand slugs use the rule the frontend already uses: lowercase, with every run of other characters turned into one hyphen (`Scientific Anglers` → `scientific-anglers`). The helper `brand_slug(name)` lives in `app/rods/schemas.py`.

Response, a list of series:

```json
[{
  "id": 7,
  "slug": "r8-core",
  "name": "R8 Core",
  "brand": { "name": "Sage", "slug": "sage" },
  "imageUrl": "/parts/rods/sage-r8-core.webp",
  "purchaseUrl": "https://farbank.com/products/sage-r8-core-rod",
  "summary": {
    "sizeCount": 19,
    "minLineWeight": 3, "maxLineWeight": 9,
    "minLengthIn": 102, "maxLengthIn": 120,
    "minPrice": 1100.0, "maxPrice": 1100.0
  },
  "sizes": [{
    "id": 51, "sizeCode": "390-4",
    "lineWeight": 3, "lengthIn": 108,
    "action": "fast", "pieces": 4, "water": "fresh", "price": 1100.0
  }]
}]
```

- Series are sorted by brand name, then series name. Sizes are sorted by line weight, then length, then id.
- `imageUrl` and `purchaseUrl` pass through the existing `image_url_for` and `safe_purchase_url`, so a bad stored value becomes `null`.
- `sizes[].id` is the rod's id, the same one `/api/parts/rod` returns.
- The summary is computed in Python from the loaded sizes. Every series has at least one size, so the ranges are always set.

Queries: the brand filter is resolved first by loading the brands (a handful of rows) and matching slugs in Python. Then:
1. `rod_series` joined to `brands`, filtered by brand when given.
2. `rods` where `series_id` is in those series.

That's two queries for the series data, plus the small brand lookup when filtering. A test checks the count stays constant as series are added.

### `GET /api/parts/rod` (changed)

- Each row gains `seriesId: int` and `sizeCode: str | null`.
- `purchaseUrl` and `imageUrl` are read from the rod's series (`AliasPath("series", ...)`). The query adds the series to its join with `contains_eager`, so it stays one query.
- The other part types are unchanged.

### Published builds (`app/published/`, changed)

- The rod's `purchase_url` and `image_path` come from `rod.series` in `_rod_ref` and in the per-part references.
- The list and detail queries preload the rod's series with the rod, so the existing query-count test passes unchanged.

### `part_details` tool (changed)

- For `component = rod`, `model` is the **series name** (matched without regard to case, like the other components), and the generated statement updates `rod_series`.
- `missing` lists rods by series: series with no link, and series with no image.
- Other components are unchanged.

### Unchanged

The questionnaire, compatibility and builds endpoints use rod ids and names only.

## Frontend

### Data (`src/features/builder/api/rodSeries.ts`)

- `RodSeries`, `RodSize` and `RodSeriesSummary` types matching the response.
- `fetchRodSeries(brandSlug: string | 'all', signal)` calls `/rods/series`, adding `?brand=` unless `all`.
- `rodSeriesKeys.list(brandSlug)` for TanStack Query, next to the fetcher, following the repo's convention.

### Routing (`src/routes/AppRoutes.tsx`)

- `rod/:brand` is added beside `:component/:brand` in both the draft and saved-build route groups, and renders `RodSeriesPage`. React Router ranks the static `rod` segment above `:component`, so every other component still reaches `BrandPartsPage`.
- `BrandMenu` links don't change, since the URLs stay the same.

### `RodSeriesPage` (`src/features/builder/components/RodSeriesPage.tsx`)

- Header: "Back to your build", then the title "{Brand} rods" (or "All rods") and the line "{n} series. Open one to see its sizes."
- Body: one `RodSeriesRow` per series. For `all`, rows are grouped under a heading per brand.
- The series holding the build's current rod starts open. All others start closed. Several can be open at once, with open state kept in the page.
- **Add** calls `selectPart('rod', 'rod-<id>')` and navigates to the build, as `BrandPartsPage` does.
- States:
  - loading: skeleton rows the size of a closed row
  - error: "Couldn't load rods." with a **Try again** button that refetches
  - empty (unknown brand): the existing `NotFound` with "We don't have any rods for that brand." and Back to your build

### `RodSeriesRow` (`src/features/builder/components/RodSeriesRow.tsx`)

- **Closed:** a `PartImage` (168×96, `label="Rod"`), the series name, and the summary line, formatted as "19 sizes · 3–9 wt · 8'6"–10'0" · $1,100". A single value collapses (`5 wt`, `$550`). The whole header is a `<button>` with `aria-expanded` and `aria-controls`, plus a "Show sizes" or "Hide sizes" cue.
- **Open:** a large `PartImage` (360×270) with the Buy link under it, beside a sizes table:
  - columns: Size (`sizeCode`, or empty), Length, Line wt, Action, Pieces, Water, Price, and the Add button
  - the selected size shows a disabled "Selected" button with a check, and a light row tint
- **Buy link:** shown only when `purchaseUrl` starts with `https://`. It uses `target="_blank"`, `rel="noopener noreferrer"` and `aria-label="Buy {brand} {series}"`, the same markup the builder's `ComponentRow` uses.
- **Phone width:** photos go full width above the text, and the table scrolls sideways inside its row.
- **Look:** existing tokens and primitives (`Table`, `Button`, `Badge`, `PartImage` from `@components/shop`), with no new colors or fonts. The photo is the one prominent element.
- Value formatting (length, water labels, prices) reuses the builder's existing helpers. The length and water formatters in `api/parts.ts` move into `src/features/builder/utils/` so both files use them.

## Error handling

| Case | What happens |
|---|---|
| A series has no image, or its image fails to load | `PartImage` shows the dashed "Rod" placeholder in the same box |
| A series has no link | No Buy link and no empty space |
| An unknown brand slug | The API returns `[]`, and the page shows `NotFound` |
| The series request is loading | Skeleton rows |
| The series request fails | "Couldn't load rods." with Try again; the rest of the builder keeps working |
| A bad link or image path in the database | The API turns it into `null`; the CHECKs make this unreachable |
| A rod without a series | Impossible: `series_id` is NOT NULL with a foreign key |
| The build's rod isn't in this brand | Nothing starts open |

## Testing

### API (pytest, against the migrated test database)

New `tests/test_rod_series.py`, plus changes in `test_parts.py`, `test_published.py` and `test_part_details_tool.py`.

- **Migration 024:**
  - every rod has a series, and there are exactly 20 series with the names and slugs above
  - both Lamson Speedster rows are in Speedster
  - `size_code` matches for sample rows (`R8 Core 590-4` → `590-4`, `EDC 690-4 FB` → `690-4 FB`, the Lamson fighting-butt rod → `Fighting butt`, an Orvis rod → `NULL`)
  - each series' link equals the link 022 gave its rods
  - `rods` has no `purchase_url` or `image_path` column
- **The database rejects** (error 3819 for CHECKs, 1062 for duplicates):
  - a series `purchase_url` of `javascript:alert(1)` or `http://example.com`
  - a series `image_path` of `../x.webp`, `rods/x.png`, `rods/X.webp` or `reels/x.webp`
  - a slug of `R8 Core` or `r8--core`
  - a second series with the same brand and name, or the same brand and slug
- **`GET /api/rods/series`:**
  - groups and sorts as specified
  - `?brand=sage` returns only Sage, and `?brand=nope` returns `[]`
  - the summary ranges match the sizes
  - every `sizes[].id` appears in `/api/parts/rod`
  - query count stays the same with one series or many
- **`GET /api/parts/rod`:** `seriesId` and `sizeCode` are present, and `purchaseUrl` and `imageUrl` follow the series (change the series, and every size shows it).
- **Published builds:** the rod's `purchaseUrl` and `imageUrl` come from its series, and the list's query count is unchanged.
- **`part_details`:** a rod row naming a series writes an `UPDATE rod_series ...`, an unknown series is refused, and `missing` lists a series without data and leaves out one with data.
- **Fixtures:** `make_part` creates (or reuses) a series for each brand when making a rod, so existing tests keep working.

### Frontend (Vitest, `RodSeriesPage.test.tsx`)

- Renders one row per series from a mocked response, and opening a row shows its sizes.
- The series holding the build's rod starts open, with that size marked Selected.
- Add selects `rod-<id>` and navigates to the build.
- `imageUrl: null` shows the placeholder, and `purchaseUrl: null` shows no Buy link.
- A failed request shows the error and Try again, and Try again refetches.
- `/builder/reel/lamson` still renders `BrandPartsPage`.

### Manual script

1. `/builder/rod/sage` shows 6 series rows, each with a photo or placeholder and a summary.
2. Opening R8 Core shows a large photo, a Buy link that opens Far Bank in a new tab, and 19 sizes.
3. Add a size: the build page shows that rod. Back on `/builder/rod/sage`, R8 Core starts open with that size Selected.
4. `/builder/rod/all` shows all 20 series under brand headings.
5. Inside a saved build (`/builder/<id>/rod/orvis`), Add updates that build.
6. `/builder/rod/nope` shows the NotFound message.
7. At phone width, photos stack full width and the sizes table scrolls inside its row.
8. Reels, lines, leaders and tippets still show their tables.

## Documentation

- `docs/database/schema-design.md`: the `rod_series` table, why the rod image and link moved there, and an ER-diagram line (`rod_series ||--o{ rods`).
- `docs/database/seed-data-notes.md`: rod rows in the CSV name a series, and rod images are named after the series slug.
- CLAUDE.md: add `app/rods/` under "API", and note that rods are grouped into series in the database.

## PR breakdown

1. **Data and API:** migration 024, the models, `app/rods/`, the `/parts/rod` and published changes, the `part_details` change, fixtures and API tests, and the docs.
2. **Frontend:** `rodSeries.ts`, the route, `RodSeriesPage`, `RodSeriesRow`, the moved formatters, and the Vitest tests.

## Changes during implementation

1. **Published builds gain one fixed query.** Preloading each rod's series adds one `selectinload` query to the published list and detail. It doesn't grow with the number of builds, and the existing query-count test (which compares counts as authors are added) still passes. "No extra queries" in this spec means none per row.
2. **`part_details` needed one line for rods:** `MODELS["rod"]` is `RodSeries`. The tool already reads `brand_id`, `name`, `purchase_url` and `image_path` generically.
3. **`PartImage` was already shared** in `@components/shop`, so nothing moved.
4. **A series with no rods is left out** of `GET /api/rods/series`, since it has no sizes to pick or summarize. The migration gives every series at least one rod, so this only affects test data.
5. **`RodSeries` has no `rods` relationship.** The endpoint loads rods with an explicit second query instead, which keeps the query count fixed.
6. **Test fixtures:** `make_part(Rod, ...)` creates a series in the rod's brand unless one is given, and a rod made for a given series takes that series' brand. The new `make_rod_series` fixture makes series directly.
