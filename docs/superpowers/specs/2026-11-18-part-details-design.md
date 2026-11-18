# Part Details Design: Purchase Links and Images

**Date:** 2026-11-18
**Follows:** `docs/superpowers/specs/2026-11-18-published-builds-design.md`, whose build cards this spec gives images
**Updates:** `docs/database/schema-design.md` (new part columns) and `docs/database/seed-data-notes.md` (where links and images came from)
**Branch:** `oa-part-details`, stacked on `oa-published-builds`

## Goal

Make a finished setup easy to buy and easy to recognize. Every catalog part can carry a **Buy** link to one product page. Rods and reels can also carry a product image, shown on the Completed Builds cards and on a published build's page.

This is the "purchase links for every part" sprint from the weekly report (due Nov 26), with images folded in, since both add product details to the same tables through the same data work.

The data arrives in batches. The feature ships when the code and the first batch are done, and a part with no data yet degrades cleanly: a placeholder image and no Buy button.

The team will present this work, so every choice in "Decisions" records its reason.

## Success criteria

- `purchase_url` exists on all five part tables, and `image_path` exists on `rods` and `reels`. Both are nullable.
- The database rejects any link that doesn't start with `https://`. It also rejects any image path that isn't `rods/<slug>.webp` or `reels/<slug>.webp`.
- `GET /api/parts/*` returns `purchaseUrl` for every part, and `imageUrl` for rods and reels.
- Published build responses return `purchaseUrl` for each part, `imageUrl` for the rod and reel on the detail page, and `rod.imageUrl` on list items.
- A Completed Builds card shows the rod image as a banner across the top, or a "Rod" placeholder when there's no image or the image fails to load.
- A published build's page shows the rod and reel images above the parts table, and a **Buy** link for every part that has one.
- The builder shows a **Buy** link on each selected part that has one.
- Buy links open in a new tab with `rel="noopener noreferrer"`. A part without a link shows no Buy button.
- A CSV of part details turns into a numbered seed migration through one command. The command refuses bad links, missing image files and unknown models, and it can list the models that still have no data.
- Batch 1 is loaded:
  - links and images for all 15 reel models
  - links for all 22 line, leader and tippet models
  - links and images for the five rods the questionnaire recommends
- Every API case in "Testing" has a passing pytest case, and every step of the manual script passes.
- `uv run pytest`, `npm run build` and `npm run lint` pass.

## Out of scope

- Several retailers per part, price comparison or price tracking (one link per product).
- Images for lines, leaders and tippets.
- Images in the builder's part lists or brand pages.
- Affiliate tracking, click analytics or link health checks.
- Uploading images through the app (files are added to the repo).
- Filling in every rod. The remaining rod models come in later batches, through the same tool.
- Build photos uploaded by users (the catalog's "photos" spec).

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Purchase links | One link per product | It's the least data (about 140 links) and fits the Nov 26 date. Several retailers would multiply the data and the price upkeep |
| Images: which parts | Rods and reels only | They're what the card shows and what people want to see. Line and tippet spools look alike in photos |
| Images: where shown | Build cards and the build page only | It keeps the scope to the catalog, which is where browsing happens. The builder's lists stay text |
| Image source | Files in the repo under `public/parts/` | They're reliable and fast, they work the same in dev and on Vercel, and they don't break when a manufacturer changes their site. Hotlinked URLs break and can be blocked |
| Where the data lives | Columns on each part row, filled in per model | It's an additive change: existing queries, the questionnaire and the compatibility checks don't change. One `UPDATE` per model fills every size of that model |
| Not a `products` table | Rejected | It would be cleaner, but it means restructuring five tables, every parts query, the questionnaire and the test factories on a deadline |
| Not names-as-paths | Rejected | Deriving image paths from names would mean a 404 for every missing image, and the slug rules would have to stay in sync in two places |
| Missing data | Nullable columns, a placeholder image, no Buy button | The feature can ship before every rod is done, and batches fill it in later |
| Link safety | A `https://` CHECK in MySQL, the same check in the API, and again before rendering | A link becomes an `href`, and a `javascript:` URL there runs script when clicked. Three independent checks mean a single mistake can't ship one |
| Image path safety | A CHECK with `^(rods\|reels)/[a-z0-9-]+\.webp$` | Paths can't leave `public/parts/` (no `../`, no absolute URLs), and every file is a WebP |
| API field | `imageUrl` built as `/parts/<image_path>` | The stored path stays an internal detail, so moving the files to a CDN later changes one function |
| Card layout | A rod banner across the top (option A from the mockups) | It's simple and reads like a product listing. The reel is shown on the build page |
| Data entry | A CSV and a generator script, producing ordinary numbered migrations | The team edits a spreadsheet, not SQL. Every batch is reviewable in git and applies through `pnpm db:migrate`. The script catches bad rows before they become migrations |
| Who gathers the data | The team gathers links and images, and Claude builds the tool and turns the CSV into migrations | Picking the right product page, and an image the team is allowed to use, takes human judgment |

## Data model

Migration `api/migrations/021_part_links_and_images.sql`:

```sql
-- 021_part_links_and_images: one purchase link per part, and an image for
-- rods and reels. Both are nullable; seed batches fill them in per model.
-- Design rationale: docs/superpowers/specs/2026-11-18-part-details-design.md

ALTER TABLE rods
  ADD COLUMN purchase_url VARCHAR(500) NULL,
  ADD COLUMN image_path   VARCHAR(255) NULL,
  ADD CONSTRAINT chk_rods_purchase_url CHECK (purchase_url LIKE 'https://%'),
  ADD CONSTRAINT chk_rods_image_path   CHECK (image_path REGEXP '^rods/[a-z0-9-]+\\.webp$');

ALTER TABLE reels
  ADD COLUMN purchase_url VARCHAR(500) NULL,
  ADD COLUMN image_path   VARCHAR(255) NULL,
  ADD CONSTRAINT chk_reels_purchase_url CHECK (purchase_url LIKE 'https://%'),
  ADD CONSTRAINT chk_reels_image_path   CHECK (image_path REGEXP '^reels/[a-z0-9-]+\\.webp$');

ALTER TABLE fly_lines
  ADD COLUMN purchase_url VARCHAR(500) NULL,
  ADD CONSTRAINT chk_fly_lines_purchase_url CHECK (purchase_url LIKE 'https://%');

ALTER TABLE leaders
  ADD COLUMN purchase_url VARCHAR(500) NULL,
  ADD CONSTRAINT chk_leaders_purchase_url CHECK (purchase_url LIKE 'https://%');

ALTER TABLE tippets
  ADD COLUMN purchase_url VARCHAR(500) NULL,
  ADD CONSTRAINT chk_tippets_purchase_url CHECK (purchase_url LIKE 'https://%');
```

- A CHECK passes when the value is NULL, so parts with no data are always valid.
- A rejected value raises MySQL error 3819 ("Check constraint … is violated").
- The SQLAlchemy part models (`app/parts/models.py`) gain `purchase_url: Mapped[str | None]` on `CatalogPart`, and `image_path: Mapped[str | None]` on `Rod` and `Reel`.

### Image files

- **Location:** `public/parts/rods/` and `public/parts/reels/`, served at `/parts/...` by Vite and by Vercel.
- **Names:** `<brand>-<model>.webp`, lowercase, with every run of other characters turned into one hyphen. For example, `Lamson` + `Liquid S` becomes `reels/lamson-liquid-s.webp`.
- **Format:** WebP, 800×600 and under 100 KB. The whole set of about 116 files stays near 10 MB.
- **Shared images:** one file can serve several rows. For example, every `Classic Trout ...-4` rod can point at `rods/redington-classic-trout.webp`, which cuts the number of rod images well below the 101 rod models.
- **Credits:** where each image came from is recorded in `docs/database/seed-data-notes.md`, so the team can swap sources before the public deploy.

### Seed batches

Each batch is a normal numbered migration (`022_part_details_batch1.sql`, ...) of statements like:

```sql
UPDATE reels
SET purchase_url = 'https://www.example-fly-shop.com/lamson-liquid-s',
    image_path   = 'reels/lamson-liquid-s.webp'
WHERE brand_id = (SELECT id FROM brands WHERE name = 'Lamson') AND name = 'Liquid S';
```

- One statement matches every size row of that model.
- A statement is safe to repeat, so a later batch can correct an earlier one.
- Migrations are never edited after they're applied; a fix is a new batch.

## API

### Parts catalog (`app/parts/`)

- `PartOut` gains `purchase_url: str | None`, sent as `purchaseUrl`, for all five types.
- `RodOut` and `ReelOut` gain `image_url: str | None`, sent as `imageUrl` and built from `image_path`.

`app/parts/links.py` holds the two helpers that every response uses:
- `safe_purchase_url(url: str | None) -> str | None` returns the URL if it starts with `https://`, else `None`.
- `image_url_for(path: str | None) -> str | None` returns `/parts/<path>` if the path matches `^(rods|reels)/[a-z0-9-]+\.webp$`, else `None`.

A value that fails either helper becomes `None`, and the API logs a warning naming the table and id. The CHECKs make this unreachable today. It's there so a future change to a CHECK can't quietly let a bad link through.

### Published builds (`app/published/schemas.py`)

- `PartRefOut` gains `purchase_url`, for all five slots.
- The `rod` and `reel` entries in `parts` also gain `image_url`.
- `RodRefOut`, the list summary's rod, gains `image_url`.
- No new fields go on the summary otherwise. The card shows only the rod image.
- The list query already joins and preloads the rod, so this adds no queries. The existing query-count test guards that.

### Unchanged

The questionnaire, compatibility and builds endpoints work only with part ids, so they don't change.

## Frontend

### Catalog feature (`src/features/catalog/`)

**`components/PartImage.tsx`**
- Props: `{ src: string | null; alt: string; label: 'Rod' | 'Reel'; className?: string }`.
- Renders an `<img>` with `object-contain` on a light background, `loading="lazy"`, `decoding="async"`, and fixed `width` and `height` so the layout doesn't jump.
- If `src` is `null`, or the image fires `onError`, the same box shows a dashed outline with the label instead.
- Alt text is `"{brand} {name}"`.
- It lives in the catalog because only the catalog uses it.

**`PublishedCard`**
- A rod banner sits across the top at a 2:1 aspect ratio (`PartImage` with `label="Rod"`).
- The rest of the card doesn't change.

**`PublishedBuildPage`**
- The rod and reel images sit side by side above the parts table, each 4:3, and stack on narrow screens.
- The parts table gains a final column. It shows a **Buy** link for each part that has one and is empty otherwise.

**Types**
- `PublishedPart` gains `purchaseUrl: string | null`, and `imageUrl?: string | null` for the rod and reel.
- `PublishedRod` gains `imageUrl: string | null`.

### Builder feature (`src/features/builder/`)

- The builder's `Part` type gains `purchaseUrl: string | null`, filled in by the catalog mapping in `api/parts.ts`.
- `ComponentRow` shows a **Buy** link next to the selected part when it has one.

### The Buy link

Both features render the same markup:

```tsx
<a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Buy ${brand} ${name}`}>Buy</a>
```

- `noopener` stops the retailer's page from controlling this tab.
- Each feature guards with `url?.startsWith('https://')` before rendering. Failing the guard and having no link both mean no element at all.
- The markup is two lines, so each feature keeps its own copy rather than adding a shared component for it.

## Data tool

The tool is `api/app/part_details.py`, run with `uv run python -m app.part_details`.

**`build <csv> [--out api/migrations/<NNN>_part_details_<name>.sql]`**
- Reads a CSV with the header `component,brand,model,purchase_url,image_file`. `component` is one of `rod`, `reel`, `line`, `leader` or `tippet`.
- `image_file` is optional. It's only allowed for rods and reels, and it's a path relative to `public/parts/`, such as `reels/lamson-liquid-s.webp`.
- The CSV is refused, with every bad row listed and no file written, when any row:
  - has a link that isn't `https://`
  - has an `image_file` that doesn't match the path rule
  - names an image file that doesn't exist under `public/parts/`
  - names a brand and model with no rows in that component's table
  - has an empty `purchase_url` and an empty `image_file`
- Otherwise it writes one `UPDATE` per row, numbered after the highest existing migration.
- Values go into the SQL file through a quoting function that doubles single quotes, and they are validated before that. The SQL is only ever applied by `app/migrate.py`.

**`missing`**
- Prints the models that still have no link, and the rods and reels that have no image, grouped by component.

**The template**
- `api/part_details_template.csv` holds the header and one example row.

## Error handling

| Case | What happens |
|---|---|
| A part has no image yet | A dashed "Rod" or "Reel" placeholder |
| An image file is missing or fails to load | The same placeholder (`onError`) |
| A part has no link | No Buy button and no empty space |
| A bad link or path reaches the API | It becomes `null`, with a logged warning |
| A bad link reaches the browser | The link isn't rendered |
| A CSV row has a typo in the brand or model | `build` refuses the CSV and names the row |
| A batch statement matches 0 rows (the catalog changed later) | Nothing breaks. `missing` shows the gap |

## Testing

API (`api/tests/test_part_details.py`, plus new cases in `test_parts.py` and `test_published.py`):

- `GET /api/parts/rod` and `/reel` return `purchaseUrl` and `imageUrl`. An image path of `rods/x.webp` comes back as `/parts/rods/x.webp`.
- Lines, leaders and tippets return `purchaseUrl` and have no `imageUrl` key.
- A part with no data returns `null` for both fields.
- The database rejects these values with error 3819:
  - `purchase_url` set to `javascript:alert(1)` or to `http://example.com`
  - `image_path` set to `../x.webp`, `rods/x.png`, `reels/X.webp` (uppercase) or `https://evil.example/x.webp`
- `safe_purchase_url` and `image_url_for` return `None` for each of the bad values above, and return the value for good ones.
- Published detail: every part carries `purchaseUrl`, and the rod and reel carry `imageUrl`. Published list: `rod.imageUrl` is present. The list's query count is unchanged.
- `part_details build`:
  - A valid CSV writes the expected `UPDATE` statements.
  - Each refusal case is reported and writes no file.
  - A model name containing `'` is quoted correctly.
  - Applying the generated SQL to the test database sets the columns on every size row of that model.
- `part_details missing` lists a model with no data and leaves out one that has data.

Frontend: there's no test runner, so `npm run build` and `npm run lint` must pass, plus this manual script:
1. `/builds` shows a card with a rod image, and another card with the dashed placeholder.
2. Point a part's image at a file that doesn't exist (in a dev-only SQL `UPDATE`). The card shows the placeholder, and the Network tab shows a single failed request.
3. A build page shows the rod and reel images and a Buy column. Buy opens the product page in a new tab, and `window.opener` there is `null`.
4. A part with no link has no Buy button.
5. The builder shows Buy on a selected part that has a link.
6. At phone width, the build page's images stack and the card banner keeps its 2:1 ratio.

## Documentation

- `docs/database/schema-design.md`: the new columns, their CHECKs and why they exist.
- `docs/database/seed-data-notes.md`: a "Links and images" section listing each batch, its source sites, and the image credits.
- CLAUDE.md:
  - Add `public/parts/` and `app/part_details.py` under "API".
  - Add a line saying links and images are filled in through CSV batches.

## PR breakdown

All on `oa-part-details`, stacked on `oa-published-builds`. If `oa-published-builds` merges first, rebase onto `main`.

1. **Schema and API:** migration 021, the model fields, `links.py`, the schema fields and the API tests.
2. **Frontend:** `PartImage`, the card banner, the build page's images and Buy column, and the builder's Buy link.
3. **Data tool and batch 1:** `part_details.py` with its tests, the template, the batch 1 CSV and migration, the image files, and the docs.

## Changes during implementation

1. **`sql_str` doubles backslashes as well as single quotes.** MySQL's default `sql_mode` treats `\` as an escape character, so a value ending in `\` would otherwise swallow its closing quote.
2. **Invalid stored values are logged with the value and field, not the table and id.** `safe_purchase_url` and `image_url_for` only see the value, so that is what the warning names.
3. **The generator takes `--name <label>`** and writes `api/migrations/<next>_part_details_<label>.sql`, where `<next>` is the highest existing number plus one. `--out` overrides the path. The label must match `^[a-z0-9_]+$`.
4. **The generator also refuses** URLs over 500 characters (the column is `VARCHAR(500)`), duplicate rows (same component, brand and model, compared without regard to case), and an `image_file` whose folder doesn't match its component. It accepts Excel CSVs (UTF-8 BOM and CRLF) and trims every cell.
5. **Migration 021's image-path CHECKs use `REGEXP_LIKE(image_path, '<pattern>', 'c')`.** MySQL's `REGEXP` is case-insensitive under the default collation, so the plain-`REGEXP` SQL in "Data model" would have accepted uppercase paths such as `rods/X.webp`. (Controller ruling from Task 1.)
