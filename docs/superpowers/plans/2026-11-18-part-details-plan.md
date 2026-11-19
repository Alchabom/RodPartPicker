# Part Details (Purchase Links and Images) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every catalog part can carry one https purchase link, rods and reels can carry an image, and both show up in the catalog (card banner, build page) and the builder (a Buy link). The data is filled in by CSV batches.

**Architecture:**
- **Schema:** migration 021 adds nullable `purchase_url` to all five part tables and `image_path` to `rods`/`reels`, with CHECK constraints.
- **API:** the parts and published schemas expose `purchaseUrl` and `imageUrl` through two validating helpers in `app/parts/links.py`.
- **Frontend:** the catalog gets a `PartImage` component, and both features render a guarded Buy link.
- **Data:** a CLI (`app/part_details.py`) turns a team-edited CSV into a numbered seed migration.

**Tech Stack:** FastAPI, SQLAlchemy 2, Pydantic 2, MySQL 8, pytest; React 19, TypeScript, Vite (static files in `public/`).

**Spec:** `docs/superpowers/specs/2026-11-18-part-details-design.md`

**Who writes what:**
- Claude writes Tasks 1–4.
- Task 5 starts only when the team has filled in the batch 1 CSV and added the image files.
- Omar reviews each PR.

**After every API task:** from `api/`, run `uv run ruff check . && uv run ruff format --check . && uv run pytest`. All must pass.

**After every web task:** from the repo root, run `npm run build && npm run lint`. Both must pass with no new warnings. Then run the task's manual checks in the browser.

**Branch:** `oa-part-details`, stacked on `oa-published-builds`. It already holds the spec and this plan. PRs follow the spec's three-part breakdown: Tasks 1–2, Task 3, then Tasks 4–5. Stage files by name.

**Deviations from the spec** (made while planning; Task 4 updates the spec to match):
- **SQL quoting.** The spec says the generator's quoting "doubles single quotes". MySQL's default `sql_mode` also treats `\` as an escape character, so the quoting function must double backslashes too. Otherwise a value ending in `\` could break out of its literal.
- **Warning text.** An invalid stored value is logged with the value and the field, not the "table and id". Pydantic field validators don't see the row id, and adding it would mean a validator on every model for an unreachable case.
- **Generator naming.** The generator takes `--name <label>` and writes `api/migrations/<next>_part_details_<label>.sql`. `--out` overrides the path.
- **Extra refusals.** The generator also refuses URLs longer than 500 characters (the column width) and duplicate component/brand/model rows. It accepts Excel CSVs, which can have a UTF-8 BOM and CRLF line endings. See "Review Focus".

## Global Constraints

- Column types are exactly `purchase_url VARCHAR(500) NULL` on `rods`, `reels`, `fly_lines`, `leaders`, `tippets`, and `image_path VARCHAR(255) NULL` on `rods` and `reels`.
- CHECK names are `chk_<table>_purchase_url`, with `CHECK (purchase_url LIKE 'https://%')`, and `chk_<table>_image_path`, with `CHECK (image_path REGEXP '^<rods|reels>/[a-z0-9-]+\\.webp$')`.
- Link rule: the URL starts with `https://`. Image path rule: `^(rods|reels)/[a-z0-9-]+\.webp$`. Each image path must also start with its own table's folder.
- `imageUrl` = `"/parts/" + image_path`. Files live in `public/parts/rods/` and `public/parts/reels/`.
- Wire names are `purchaseUrl` on every part and `imageUrl` on rods and reels only. Lines, leaders and tippets have no `imageUrl` key.
- Image file names follow `<brand>-<model>` lowercased, with runs of other characters collapsed to `-` and the `.webp` extension. One file may serve several rows.
- The Buy link is exactly `<a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Buy ${brand} ${name}`}>Buy</a>`. It renders only when `url?.startsWith('https://')`.
- The placeholder is a dashed box labelled `Rod` or `Reel`. The card banner is 2:1, and the build page images are 4:3 each, side by side, stacking on narrow screens.
- CSV header, exactly: `component,brand,model,purchase_url,image_file`. Components: `rod`, `reel`, `line`, `leader`, `tippet`.
- Never edit an applied migration. Never build SQL from user input inside a request. The generator writes a file that only `app/migrate.py` applies.
- No `dangerouslySetInnerHTML`. No imports between features. No hand-written `useMemo`, `useCallback` or `React.memo`. No new dependencies.

## Review Focus

- **CSV from Excel.** Excel saves CSVs with a UTF-8 BOM and CRLF line endings. The first header must still read `component`, and rows must parse. → Task 4, `test_build_accepts_excel_csv`.
- **Stray spaces around cells** (`" https://…"`, `"Lamson "`). Values must be trimmed before they're validated and matched, so a correct row isn't rejected as an unknown model. → Task 4, `test_build_trims_cells`.
- **The same model listed twice** in one CSV. This must be refused and both line numbers named, rather than letting the later `UPDATE` silently win. → Task 4, `test_build_refuses_duplicate_rows`.
- **A product URL longer than 500 characters.** Tracking URLs get long. The generator must refuse it with a clear message instead of producing a migration that fails at `pnpm db:migrate` time. → Task 4, `test_build_refuses_long_url`.
- **Brand or model in different case** (`lamson`, `liquid s`). MySQL matches these case-insensitively, so the existence check (run through the database) must accept them the same way the `UPDATE` would. → Task 4, `test_build_matches_case_insensitively`.

---

### Task 1: Schema, model fields and the parts API

**Files:**
- Create: `api/migrations/021_part_links_and_images.sql` (exactly as in the spec's "Data model")
- Create: `api/app/parts/links.py`
- Modify: `api/app/parts/models.py` (`CatalogPart.purchase_url`; `Rod.image_path`, `Reel.image_path`)
- Modify: `api/app/parts/schemas.py`
- Test: `api/tests/test_part_details.py` (new), `api/tests/test_parts.py`

**Interfaces:**
- Produces:
  - `safe_purchase_url(url: str | None) -> str | None` in `app/parts/links.py`. It returns `url` when it starts with `https://`. Otherwise it returns `None` and logs `logger.warning("Dropping unsafe purchase_url %r", url)`. `None` input returns `None` silently.
  - `image_url_for(path: str | None) -> str | None` in the same file. It returns `"/parts/" + path` when `path` fully matches `^(rods|reels)/[a-z0-9-]+\.webp$`. Otherwise it returns `None` with a warning.
  - `PATH_RULE` (the compiled regex) is exported for Task 4.
  - `PartOut.purchase_url: str | None` (an after-validator runs `safe_purchase_url`).
  - `RodOut.image_url` and `ReelOut.image_url`: `str | None`, with `validation_alias="image_path"` and an after-validator running `image_url_for`.

- [ ] **Step 1: Write the failing tests.**
  - In `test_part_details.py`:
    - `test_purchase_url_check_rejects`: parametrized over `javascript:alert(1)` and `http://example.com`, on `Rod`, `Reel`, `FlyLine`, `Leader` and `Tippet`. Make the part with `make_part`, set the bad value and flush. `pytest.raises(OperationalError)` (or `IntegrityError`), with `e.orig.args[0] == 3819`.
    - `test_image_path_check_rejects`: parametrized over `../x.webp`, `rods/x.png`, `rods/X.webp` and `https://evil.example/x.webp` on a rod, plus `rods/x.webp` on a reel (wrong folder). Each raises error 3819.
    - `test_valid_values_are_accepted`: a rod with `https://shop.example/r` and `rods/lamson-liquid.webp`, then a flush. No error.
    - `test_safe_purchase_url`: `"https://a.example/x"` comes back unchanged. `"javascript:alert(1)"`, `"http://a.example"`, `" https://a.example"` and `""` each give `None`. `None` gives `None`.
    - `test_image_url_for`: `"reels/lamson-liquid-s.webp"` gives `"/parts/reels/lamson-liquid-s.webp"`. `"../x.webp"`, `"rods/x.png"`, `"rods/X.webp"`, `"lines/x.webp"` and `"rods/a/b.webp"` each give `None`.
  - In `test_parts.py`:
    - `test_rod_and_reel_have_links_and_images`: a rod with both values set gives `purchaseUrl == "https://shop.example/r"` and `imageUrl == "/parts/rods/x.webp"`. The same check runs for a reel.
    - `test_part_without_details_has_nulls`: a rod with no values gives `purchaseUrl is None` and `imageUrl is None`.
    - `test_small_parts_have_link_but_no_image_key`: for line, leader and tippet, `purchaseUrl` is present and `"imageUrl" not in item`.

- [ ] **Step 2: Run them to verify they fail**

Run: `uv run pytest tests/test_part_details.py tests/test_parts.py -q`
Expected: FAIL. The tests can't be collected because `app.parts.links` doesn't exist, and the model attributes are missing.

- [ ] **Step 3: Implement.**
  1. Migration 021.
  2. The model fields.
  3. `links.py`, using a module logger: `logging.getLogger(__name__)`.
  4. The schema fields. Use `Annotated[..., AfterValidator(...)]` so the validators are declared once.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `uv run ruff check . && uv run ruff format --check . && uv run pytest`
Expected: all pass. The existing `test_rod_shape`-style tests that compare whole objects must be updated to include the new keys. Change only those expectations.

- [ ] **Step 5: Commit**

```bash
git add api/migrations/021_part_links_and_images.sql api/app/parts/links.py api/app/parts/models.py api/app/parts/schemas.py api/tests/test_part_details.py api/tests/test_parts.py
git commit -m "feat(api): add purchase links and images to parts"
```

---

### Task 2: Published build fields

**Files:**
- Modify: `api/app/published/schemas.py` (`PartRefOut`, `RodRefOut`, plus a new `ImagePartRefOut`)
- Modify: `api/app/published/router.py` (`_part`, `_rod_ref`, detail parts mapping)
- Test: `api/tests/test_published.py`

**Interfaces:**
- Consumes: `safe_purchase_url` and `image_url_for` from Task 1.
- Produces (the JSON contract that Task 3 types against):
  - `PartRefOut { id, brand, name, price, purchase_url: str | None }`
  - `ImagePartRefOut(PartRefOut) { image_url: str | None }`, used for the `rod` and `reel` slots of `PublishedPartsOut`
  - `RodRefOut { brand, name, line_weight, image_url: str | None }`
  - Wire names are camelCase: `purchaseUrl`, `imageUrl`.

- [ ] **Step 1: Write the failing tests**
  - `test_detail_includes_links_and_images`: give the published build's rod and reel `purchase_url` and `image_path`, and its tippet a `purchase_url`.
    - `parts.rod.imageUrl == "/parts/rods/x.webp"` and `parts.reel.imageUrl == "/parts/reels/y.webp"`.
    - `parts.tippet.purchaseUrl == "https://shop.example/t"`.
    - `"imageUrl" not in parts.tippet`.
    - `parts.line.purchaseUrl is None`.
  - `test_list_rod_has_image_url`: the list item's `rod.imageUrl == "/parts/rods/x.webp"`. For a rod with no image, it's `None`.
  - The existing `test_list_query_count_does_not_grow_with_authors` must still pass unchanged.
  - Update `test_summary_shape` and `test_detail` to include the new keys.

- [ ] **Step 2: Run them to verify they fail**

Run: `uv run pytest tests/test_published.py -q`
Expected: FAIL with `KeyError`, or assertion errors on the missing keys.

- [ ] **Step 3: Implement.**
  - `_part` returns `ImagePartRefOut` for rods and reels and `PartRefOut` otherwise.
  - Pass the raw values through the Task 1 helpers. You can also reuse the same annotated types from `app/parts/schemas.py`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `uv run ruff check . && uv run ruff format --check . && uv run pytest`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add api/app/published api/tests/test_published.py
git commit -m "feat(api): include part links and images in published builds"
```

---

### Task 3: Images and Buy links in the frontend

**Files:**
- Create: `src/features/catalog/components/PartImage.tsx`
- Modify: `src/features/catalog/types/index.ts`, `components/PublishedCard.tsx`, `components/PublishedBuildPage.tsx`
- Modify: `src/features/builder/types/index.ts` (`Part.purchaseUrl`), `api/parts.ts` (the row types and `basePart`), `components/ComponentRow.tsx`

**Interfaces:**
- Consumes: the Task 2 contract and the Task 1 parts fields.
- Produces:
  - `PartImage({ src, alt, label, className }: { src: string | null; alt: string; label: 'Rod' | 'Reel'; className?: string })`
  - `Part.purchaseUrl: string | null`
  - The catalog types:
    - `PublishedRod.imageUrl: string | null`
    - `PublishedPart.purchaseUrl: string | null`
    - `PublishedPart.imageUrl?: string | null`

- [ ] **Step 1: Implement `PartImage`** as described in the spec ("Catalog feature").
  - It keeps a `failed` state, set by `onError`. When `!src || failed`, it shows the placeholder.
  - When the `src` prop changes, reset `failed` using the derived-state pattern, not an effect.

- [ ] **Step 2: Add the card banner and the build page images and Buy column.**
  - On the build page, image `alt` is `"{brand} {name}"`. A null part slot gives `src={null}`, and `alt` is the label.
  - The Buy column header is visually empty but has the screen-reader text "Buy".

- [ ] **Step 3: Add the builder's `purchaseUrl` mapping and `ComponentRow`'s Buy link.**
  - The link sits next to the selected part's name.

- [ ] **Step 4: Verify**

Run: `npm run build && npm run lint`
Expected: both pass. Then run the manual checks from the spec's "Testing" (frontend) section, steps 1–6. Seed the dev database by hand with one rod image and one link, using a temporary `.webp` dropped into `public/parts/rods/` and not committed. Afterwards, revert the dev data with `UPDATE … SET … = NULL`.

- [ ] **Step 5: Commit**

```bash
git add src/features/catalog src/features/builder
git commit -m "feat(web): show part images and Buy links"
```

---

### Task 4: The part-details tool and docs

**Files:**
- Create: `api/app/part_details.py`
- Create: `api/part_details_template.csv` (the header row, plus one example reel row pointing at `reels/lamson-liquid-s.webp`)
- Create: `public/parts/rods/.gitkeep`, `public/parts/reels/.gitkeep`
- Test: `api/tests/test_part_details_tool.py`
- Modify: `docs/database/schema-design.md`, `docs/database/seed-data-notes.md` (a new "Links and images" section, with a batch table that has columns Batch, Migration, Sources and Image credits), `CLAUDE.md` (the "API" section), and the spec (record this plan's deviations)

**Interfaces:**
- Consumes: `PATH_RULE` from Task 1.
- Produces:
  - `class PartDetailsError(Exception)`, with `errors: list[str]`. Each error starts with `line <n>:`, the CSV line number.
  - `build_sql(csv_path: Path, db: Session, parts_dir: Path) -> str` returns the migration text, or raises `PartDetailsError` listing every bad row.
  - `find_missing(db: Session) -> dict[str, list[str]]` maps each component to `"Brand Model"` strings, in sorted order. Rods and reels are listed when they lack a link or an image; the other three types when they lack a link.
  - `sql_str(value: str) -> str` returns a single-quoted MySQL literal, doubling `\` first and then `'`.
  - The CLI, run with `uv run python -m app.part_details`:
    - `build <csv> --name <label> [--out PATH]` writes `api/migrations/<NNN>_part_details_<label>.sql`. `NNN` is the highest existing number plus one, zero-padded to three digits.
    - `missing` prints the report.
    - Both use `make_engine(settings.DB_NAME)` and exit with code 1 after printing the errors from a `PartDetailsError`.

- [ ] **Step 1: Write the failing tests.** Use `tmp_path` for the CSV and a fake `parts_dir` (create the files the rows reference). Use `make_part`/`make_brand` for catalog rows, and the `db` fixture as the session.
  - `test_build_writes_one_update_per_row`: a reel row and a tippet row.
    - The SQL contains `UPDATE reels SET purchase_url = 'https://…', image_path = 'reels/a-b.webp' WHERE brand_id = (SELECT id FROM brands WHERE name = 'A') AND name = 'B';`.
    - It contains the tippet `UPDATE` with `purchase_url` only.
    - A row with an empty `image_file` doesn't set `image_path`.
  - `test_build_applies_to_every_size_row`: two reel rows with the same brand and name but different line weights.
    - Execute the generated SQL on `db.connection()`, using `exec_driver_sql` once per statement.
    - Both rows now have the values.
  - `test_build_refusals`: parametrized. Each case asserts `PartDetailsError` and that its `errors` contains the given substring.
    - `http://x` gives `"https://"`.
    - Image `reels/X.webp` gives `"image_file"`.
    - Image `rods/a.webp` on a reel row gives `"image_file"`.
    - A missing image file gives `"does not exist"`.
    - An unknown model gives `"not in the catalog"`.
    - An unknown component gives `"component"`.
    - An image on a tippet row gives `"only rods and reels"`.
    - A row with neither a link nor an image gives `"nothing to set"`.
  - `test_build_reports_every_bad_row`: two bad rows give two errors, at the correct line numbers (2 and 3).
  - `test_build_refuses_bad_header`: header `component,brand,model,url` gives `PartDetailsError`, with an error mentioning the expected header.
  - `test_sql_str_quotes`:
    - `sql_str("O'Neil")` is `"'O''Neil'"`.
    - `sql_str("a\\")` is `"'a\\\\'"`.
    - A model named `O'Neil` survives a round trip through `build_sql` and an executed `UPDATE`.
  - The Review Focus tests:
    - `test_build_accepts_excel_csv`: the file is written with `encoding="utf-8-sig"` and `\r\n` line endings, and it parses.
    - `test_build_trims_cells`: cells like `" Lamson "` and `" https://a.example/x "` match and are emitted trimmed.
    - `test_build_refuses_duplicate_rows`: the same component, brand and model on lines 2 and 4 gives an error naming both lines.
    - `test_build_refuses_long_url`: a 501-character `https://` URL gives an error mentioning `500`.
    - `test_build_matches_case_insensitively`: `lamson`/`liquid s` match a `Lamson`/`Liquid S` reel.
  - `test_find_missing`: one reel with a link and an image, one reel with only a link, and one tippet with nothing.
    - The first reel is not listed.
    - The second reel is listed.
    - The tippet is listed.
  - `test_next_migration_name`: for a directory holding `020_x.sql` and `021_y.sql` with label `batch1`, the result is `022_part_details_batch1.sql`. Expose a helper, `next_migration_path(migrations_dir: Path, label: str) -> Path`. The label must match `^[a-z0-9_]+$`.

- [ ] **Step 2: Run them to verify they fail**

Run: `uv run pytest tests/test_part_details_tool.py -q`
Expected: FAIL at collection, with `No module named 'app.part_details'`.

- [ ] **Step 3: Implement `app/part_details.py`.**
  - **Parsing:** use `csv.DictReader` over `open(path, encoding="utf-8-sig", newline="")`.
  - **Model check:** query the database once per row, with `select(func.count()).select_from(Model).join(Brand).where(Brand.name == brand, Model.name == model)`. These are bound parameters, so the check uses the database's own collation.
  - **Statement order:** emit the `UPDATE`s in CSV order, under a header comment naming the CSV file and the date.
  - **The CLI:** use `argparse`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `uv run ruff check . && uv run ruff format --check . && uv run pytest`
Expected: all pass.

- [ ] **Step 5: Write the docs.**
  - The columns and their CHECKs in `schema-design.md`.
  - The "Links and images" section in `seed-data-notes.md`, covering:
    - the workflow: fill in the CSV, drop the `.webp` files into `public/parts/`, run `build`, review the SQL, run `pnpm db:migrate`, then `missing`
    - the image rules: 800×600 WebP under 100 KB, and the naming rule
    - an empty batch table
  - Two lines in CLAUDE.md:
    - `public/parts/` holds the rod and reel images.
    - `app/part_details.py` turns `api/part_details_*.csv` into seed migrations.
  - This plan's four deviations, recorded in the spec under a "Changes during implementation" heading.

- [ ] **Step 6: Commit**

```bash
git add api/app/part_details.py api/part_details_template.csv api/tests/test_part_details_tool.py public/parts docs/database/schema-design.md docs/database/seed-data-notes.md CLAUDE.md docs/superpowers/specs/2026-11-18-part-details-design.md
git commit -m "feat(api): add the part-details CSV tool"
```

---

### Task 5: Batch 1 data (starts when the team's data arrives)

**Prerequisite:** the team provides `api/part_details_batch1.csv` and the `.webp` files under `public/parts/`. It covers:
- all 15 reel models (link and image)
- all 22 line, leader and tippet models (link)
- the five questionnaire rods, Redington `Classic Trout 376-4` and `Classic Trout 486-4`, and Sage `Classic R8 380-4`, `Classic R8 486-4` and `R8 Core 486-4` (link and image)

The team also provides the source and credit for each image. Until this arrives, Tasks 1–4 ship with the feature showing placeholders and no Buy buttons.

**Files:**
- Create: `api/migrations/<NNN>_part_details_batch1.sql` (generated)
- Add: `api/part_details_batch1.csv`, `public/parts/rods/*.webp`, `public/parts/reels/*.webp`
- Modify: `docs/database/seed-data-notes.md` (the batch 1 row: migration, sources, credits)

- [ ] **Step 1: Check the image files.** Each one must be WebP, at most 100 KB, and 800×600. Run `uv run python -c` with Pillow if it's available. If it isn't, check with `file` and `ls -l`. Report oversize or wrongly sized files back to the team rather than resizing them silently.

- [ ] **Step 2: Generate the migration**

Run: `cd api && uv run python -m app.part_details build part_details_batch1.csv --name batch1`
Expected: it writes `migrations/<NNN>_part_details_batch1.sql`. If it prints errors instead, send the list back to the team and stop.

- [ ] **Step 3: Apply it and confirm the coverage**

Run: `uv run python -m app.migrate && uv run python -m app.part_details missing`
Expected:
- No reel is listed.
- No line, leader or tippet is listed.
- The five questionnaire rods aren't listed.
- The other rods are listed.

- [ ] **Step 4: Run the full suite** (the test database applies the new migration too)

Run: `uv run pytest -q`
Expected: all pass.

- [ ] **Step 5: Check in the browser.** A build page for a questionnaire setup shows the rod and reel images and five Buy links, and its card shows the rod banner.

- [ ] **Step 6: Commit**

```bash
git add api/part_details_batch1.csv api/migrations/<NNN>_part_details_batch1.sql public/parts docs/database/seed-data-notes.md
git commit -m "feat(db): load part details batch 1"
```
