# Rod Series Implementation Plan

> **For agentic workers:** Work task by task, in order. Steps use checkbox (`- [ ]`) syntax for tracking. Each task is test-first: write the failing tests, see them fail, then implement.

**Goal:** Rods are grouped into series in the database. The API serves them grouped, and the builder's rod page lists a brand's series as collapsible rows with a photo, each opening to a large photo, a Buy link and its sizes.

**Architecture:**
- **Schema:** migration 024 adds `rod_series`, gives every rod a `series_id` and `size_code`, and moves the rod image and link onto the series.
- **API:** a new `app/rods/` package serves `GET /api/rods/series`. `/api/parts/rod`, published builds and the `part_details` tool read the image and link from the series.
- **Frontend:** a new `RodSeriesPage` and `RodSeriesRow` in the builder feature, routed at `rod/:brand`. Every other component keeps `BrandPartsPage`.

**Tech Stack:** FastAPI, SQLAlchemy 2, Pydantic 2, MySQL 8, pytest; React 19, TypeScript, TanStack Query, react-router, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-20-rod-series-design.md`

**After every API task:** from `api/`, run `uv run ruff check . && uv run ruff format --check . && uv run pytest`. All must pass, except `test_build_refuses_control_chars_in_file_name`, which always fails on Windows (it can't create a file name containing a newline) and passes on Linux.

**After every web task:** from the repo root, run `pnpm test && npm run build && npm run lint`. All must pass with no new warnings.

**Branch:** `oa-rod-series`, stacked on `oa-part-links` (PR #52), which holds migrations 022 and 023. If #52 merges first, rebase onto `main`. Stage files by name. PRs follow the spec: **PR 1 = Tasks 1–4** (data and API), **PR 2 = Tasks 5–7** (frontend).

**Deviations from the spec** (found while planning; Task 4 records them in the spec's "Changes during implementation"):
- **`PartImage` is already shared** in `@components/shop`, so nothing moves. The spec says this too, but its earlier chat draft did not.
- **Published query count.** Preloading `Rod.series` adds one `selectinload` query to the published list and detail. The existing test compares counts as authors grow, not an absolute number, so it still guards against N+1. The spec's "no extra queries" means "no per-row queries".
- **`part_details` needs one line for rods:** `MODELS["rod"]` becomes `RodSeries`. The tool already reads `brand_id`, `name`, `purchase_url` and `image_path` generically, and `RodSeries` has all four.

## Global Constraints

- Rod `id`s and `name`s never change. Saved builds, published builds and the questionnaire (`app/questionnaire/rules.py` picks rods by name) depend on them.
- Table and constraint names are exactly as in the spec: `rod_series`, `uq_rod_series_name`, `uq_rod_series_slug`, `fk_rod_series_brand`, `chk_rod_series_slug`, `chk_rod_series_purchase_url`, `chk_rod_series_image_path` and `fk_rods_series`.
- Slug rule: `^[a-z0-9]+(-[a-z0-9]+)*$`. Brand slugs come from `brand_slug(name)`: lowercase, every run of non-`[a-z0-9]` characters becomes one `-`, and leading and trailing `-` are trimmed. This must match `slugify` in `src/features/builder/api/parts.ts`.
- Wire names: `seriesId` and `sizeCode` on `/api/parts/rod` rows. The series response uses exactly the spec's keys (`id`, `slug`, `name`, `brand.{name,slug}`, `imageUrl`, `purchaseUrl`, `summary.*`, `sizes[].*`).
- Sort order: series by brand name, then series name. Sizes by line weight, then length, then id.
- Never edit an applied migration (022 and 023 included). Never build SQL from request input.
- No imports between features. No hand-written `useMemo`, `useCallback` or `React.memo`. No new dependencies. No `dangerouslySetInnerHTML`.
- The Buy link markup and guard are exactly the builder's existing ones: rendered only when `url?.startsWith('https://')`, with `target="_blank"`, `rel="noopener noreferrer"` and `aria-label={`Buy ${brand} ${series}`}`.

## Review Focus

- **Series assignment patterns.** `name LIKE 'R8 Core %'` must not catch another series, and the trailing space is what prevents that. → Task 1, `test_every_rod_is_in_its_series` checks every rod's series by name.
- **Dropping columns that CHECKs reference.** MySQL refuses to drop a column a CHECK uses, so the CHECKs go first. → Task 1, the migration's step order, which `pytest` exercises because the test database is migrated from scratch.
- **Links copied from 022.** No series may have had two different links among its rods. → Task 1, `test_series_links_match_migration_022`.
- **N+1 on the new endpoint.** → Task 3, `test_series_query_count_is_constant`.
- **Brand slug parity** between Python and TypeScript. → Task 3, `test_brand_slug` covers `Scientific Anglers` → `scientific-anglers`, and Task 6 asserts the page loads `?brand=sage` from the `/builder/rod/sage` URL.

---

### Task 1: Migration 024 and the models

**Files:**
- Create: `api/migrations/024_rod_series.sql`
- Modify: `api/app/parts/models.py`
- Test: `api/tests/test_rod_series.py` (new, migration section)

**Interfaces:**
- Produces the `RodSeries` model: `id`, `brand_id`, `name`, `slug`, `purchase_url: str | None`, `image_path: str | None`, `brand` relationship, and `rods` relationship (ordered by `line_weight, length_in, id`).
- `Rod` gains `series_id: int`, `size_code: str | None` and `series: Mapped[RodSeries]`. It loses `image_path`.
- `purchase_url` moves from `CatalogPart` onto `Reel`, `FlyLine`, `Leader` and `Tippet`.

- [ ] **Step 1: Write the failing tests** in `test_rod_series.py`. They read the seeded catalog the migrations load:
  - `test_there_are_twenty_series`: count is 20, and `(brand, name, slug)` equals the spec's table exactly.
  - `test_every_rod_is_in_its_series`: for every rod, the series matches the spec's mapping, checked by computing the expected series from `rods.name` in the test with an explicit dict for Lamson and Orvis and the prefixes for Redington and Sage. No rod has a NULL `series_id`.
  - `test_speedster_holds_both_lamson_rows`: `speedster` and `speedster with fighting butt` share the Speedster series.
  - `test_size_codes`: `R8 Core 590-4` → `590-4`, `EDC 690-4 FB` → `690-4 FB`, `Power R8 690-4FB` → `690-4FB`, `speedster with fighting butt` → `Fighting butt`, and any Orvis `Clearwater` row → `None`.
  - `test_series_links_match_migration_022`: R8 Core's `purchase_url` is `https://farbank.com/products/sage-r8-core-rod`, Clearwater's is `https://www.orvis.com/product/clearwater-fly-rod/25SP.html`, and every series has a link.
  - `test_rods_have_no_link_or_image_columns`: `SHOW COLUMNS FROM rods` has no `purchase_url` or `image_path`.
  - `test_series_checks_reject`: parametrized over a bad `purchase_url` (`javascript:alert(1)`, `http://example.com`), a bad `image_path` (`../x.webp`, `rods/x.png`, `rods/X.webp`, `reels/x.webp`) and a bad slug (`R8 Core`, `r8--core`). Each update and flush raises with `e.orig.args[0] == 3819`. Call `db.rollback()` inside the `pytest.raises` context's aftermath, following the existing `test_part_details.py` pattern.
  - `test_series_duplicates_reject`: a second series with the same brand and name, or the same brand and slug, raises 1062.
- [ ] **Step 2: Run the tests.** They fail (no table).
- [ ] **Step 3: Write `024_rod_series.sql`** in the spec's six steps:
  1. `CREATE TABLE rod_series` exactly as in the spec, then `ALTER TABLE rods ADD COLUMN series_id INT UNSIGNED NULL, ADD COLUMN size_code VARCHAR(40) NULL;`
  2. One `INSERT INTO rod_series (brand_id, name, slug) SELECT id, '<name>', '<slug>' FROM brands WHERE name = '<brand>';` per series. That's 20 statements, in the spec table's order.
  3. Assign rods, one `UPDATE` per series:
     ```sql
     UPDATE rods r JOIN rod_series s ON s.brand_id = r.brand_id AND s.slug = 'r8-core'
     SET r.series_id = s.id
     WHERE r.name LIKE 'R8 Core %';
     ```
     Lamson and Orvis use `r.name = '<exact>'` (Speedster: `r.name IN ('speedster', 'speedster with fighting butt')`, Superfine Graphite: `r.name = 'Superfine Grafite'`).
  4. Size codes:
     ```sql
     UPDATE rods r JOIN rod_series s ON s.id = r.series_id JOIN brands b ON b.id = s.brand_id
     SET r.size_code = TRIM(SUBSTRING(r.name, CHAR_LENGTH(s.name) + 2))
     WHERE b.name IN ('Redington', 'Sage');
     UPDATE rods SET size_code = 'Fighting butt' WHERE name = 'speedster with fighting butt';
     ```
     This works because each Redington and Sage series name equals its rods' name prefix exactly.
  5. Copy links and images:
     ```sql
     UPDATE rod_series s
     JOIN (SELECT series_id, MIN(purchase_url) AS url, MIN(image_path) AS img
           FROM rods GROUP BY series_id) r ON r.series_id = s.id
     SET s.purchase_url = r.url, s.image_path = r.img;
     ```
  6. Lock down:
     ```sql
     ALTER TABLE rods
       MODIFY series_id INT UNSIGNED NOT NULL,
       ADD CONSTRAINT fk_rods_series FOREIGN KEY (series_id) REFERENCES rod_series(id);
     ALTER TABLE rods DROP CHECK chk_rods_purchase_url, DROP CHECK chk_rods_image_path;
     ALTER TABLE rods DROP COLUMN purchase_url, DROP COLUMN image_path;
     ```
  - Head the file with a comment naming the spec, as 021 does.
- [ ] **Step 4: Update the models.** Add `RodSeries`, change `Rod` and move `purchase_url` off `CatalogPart`. Add the comment "Rods get their link and image from their series" on `Rod`.
- [ ] **Step 5: Run the migration tests.** They pass. Other suites fail until Task 2, which is expected; note which ones.

### Task 2: Existing rod readers follow the series

**Files:**
- Modify: `api/tests/conftest.py` (`make_part`, plus a new `make_rod_series` fixture)
- Modify: `api/app/parts/schemas.py`, `api/app/parts/router.py`
- Modify: `api/app/published/router.py`
- Modify: `api/app/part_details.py`
- Test: `api/tests/test_parts.py`, `api/tests/test_published.py`, `api/tests/test_part_details.py`, `api/tests/test_part_details_tool.py`

**Interfaces:**
- `make_rod_series(brand=None, **columns) -> RodSeries` fixture, with defaults `name="Test Series N"` and `slug="test-series-n"`.
- `make_part(Rod, ...)` with no `series`/`series_id` creates a series for the rod's brand. A test that needs a link or image on a rod sets it on `rod.series`.
- `RodOut` adds `series_id: int` and `size_code: str | None`. Its `purchase_url` uses `validation_alias=AliasPath("series", "purchase_url")` and its `image_url` uses `AliasPath("series", "image_path")`, with the same after-validators.
- `PartOut` keeps `purchase_url` for the other four types.

- [ ] **Step 1: Write the failing tests.**
  - `test_parts.py`: rods return `seriesId` and `sizeCode`; setting `rod.series.purchase_url` and `image_path` shows up on every rod in that series; `/api/parts/rod` stays one query (count statements as in `test_published.py`'s `count_statements`).
  - `test_published.py`: the rod's `purchaseUrl` and `imageUrl` in detail and list come from its series.
  - `test_part_details.py` and `test_part_details_tool.py`: rod rows now name a series (`rod,Sage,R8 Core,...`). `build` writes `UPDATE rod_series SET ...`, an unknown series is refused, and `find_missing()["rod"]` lists series names. Update the existing rod cases that assumed rod-level columns.
- [ ] **Step 2: Run the tests** and see them fail.
- [ ] **Step 3: Update `conftest.py`.** Add `make_rod_series`, and change `make_part` to create a series when the model is `Rod` and none was given.
- [ ] **Step 4: Update the parts API.** Change the schemas, then in `list_rods` add `.join(Rod.series)` and `contains_eager(Rod.series)`. Keep the order (`Brand.name, Rod.name, Rod.line_weight, Rod.length_in`).
- [ ] **Step 5: Update published builds.** In `LOAD_PARTS`, change the rod entry to load both `Rod.brand` and `Rod.series`:
  ```python
  selectinload(PublishedBuild.rod).options(selectinload(Rod.brand), selectinload(Rod.series)),
  ```
  In `_part`, read the rod's link and image from `part.series` (the reel keeps its own). In `_rod_ref`, use `rod.series.image_path`.
- [ ] **Step 6: Update `part_details`:** `MODELS["rod"] = RodSeries`. Check that `_model_exists`, `_update_sql` and `find_missing` work unchanged against it, since they only touch `brand_id`, `name`, `purchase_url`, `image_path` and `__tablename__`.
- [ ] **Step 7: Run the whole API suite.** Everything passes (except the known Windows test), including `test_list_query_count_does_not_grow_with_authors` and the questionnaire and compatibility suites, untouched.

### Task 3: `GET /api/rods/series`

**Files:**
- Create: `api/app/rods/__init__.py`, `api/app/rods/schemas.py`, `api/app/rods/router.py`
- Modify: `api/app/main.py` (include the router under `/api`)
- Test: `api/tests/test_rod_series.py` (endpoint section)

**Interfaces:**
- `brand_slug(name: str) -> str` in `app/rods/schemas.py`.
- Schemas (all `CamelModel`): `BrandRefOut(name, slug)`, `RodSeriesSummaryOut(size_count, min_line_weight, max_line_weight, min_length_in, max_length_in, min_price, max_price)`, `RodSizeOut(id, size_code, line_weight, length_in, action, pieces, water, price)`, and `RodSeriesOut(id, slug, name, brand, image_url, purchase_url, summary, sizes)`. Floats for prices, as in `app/parts/schemas.py`. `image_url` and `purchase_url` pass through `image_url_for` and `safe_purchase_url`.
- `GET /api/rods/series?brand=<slug>` returns `list[RodSeriesOut]`.

- [ ] **Step 1: Write the failing tests.**
  - `test_brand_slug`: `Sage` → `sage`, `Scientific Anglers` → `scientific-anglers`, `  Odd & Co.  ` → `odd-co`.
  - `test_series_are_grouped_and_sorted`: against the seeded catalog, brand names are non-decreasing, series names sort within a brand, and sizes sort by `(lineWeight, lengthIn, id)`.
  - `test_brand_filter`: `?brand=sage` returns 6 series, all with brand slug `sage`, and `?brand=nope` returns `[]` with 200.
  - `test_summary_matches_sizes`: for every series, `sizeCount == len(sizes)` and the min/max fields equal the sizes' extremes. R8 Core reports 19 sizes, 3–9 wt, 102–120 in.
  - `test_size_ids_match_parts`: every `sizes[].id` appears in `/api/parts/rod` with the same `seriesId`.
  - `test_series_image_and_link`: a series made with `make_rod_series(image_path="rods/x.webp", purchase_url="https://a.example")` returns `/parts/rods/x.webp` and the link, and one with neither returns `null` for both.
  - `test_series_query_count_is_constant`: statements for `/api/rods/series` are the same before and after adding three series with two rods each.
- [ ] **Step 2: Run them.** They fail (404).
- [ ] **Step 3: Implement.** In `router.py`:
  1. If `brand` is given, load `select(Brand)`, keep the ids whose `brand_slug(name) == brand`, and return `[]` if there are none.
  2. Load series: `select(RodSeries).join(RodSeries.brand).options(contains_eager(RodSeries.brand))`, filtered by those brand ids when given, ordered by `Brand.name, RodSeries.name`.
  3. Load rods: `select(Rod).where(Rod.series_id.in_(ids)).order_by(Rod.series_id, Rod.line_weight, Rod.length_in, Rod.id)`, grouped in Python by `series_id`.
  4. Build each `RodSeriesOut`, computing the summary from its sizes.
  - Use explicit queries, not lazy relationship access, so the count stays fixed.
- [ ] **Step 4: Register the router** in `app/main.py` next to the parts router, and run the suite.

### Task 4: Docs (end of PR 1)

**Files:**
- Modify: `docs/database/schema-design.md`, `docs/database/seed-data-notes.md`, `CLAUDE.md`, `docs/superpowers/specs/2026-11-20-rod-series-design.md`

- [ ] **Step 1:** In `schema-design.md`, add `rod_series` to the "What lives where" table and the ER diagram (`brands ||--o{ rod_series : makes`, `rod_series ||--o{ rods : groups`). Add a decision row explaining why the rod link and image moved there.
- [ ] **Step 2:** In `seed-data-notes.md`, the workflow says rod rows name a **series**, and the image rules say rod images are `rods/<brand slug>-<series slug>.webp`.
- [ ] **Step 3:** In `CLAUDE.md` under "API", add a line for `app/rods/` (`GET /api/rods/series`, with rods grouped into series in `rod_series` that owns the rod link and image).
- [ ] **Step 4:** In the spec, add "Changes during implementation" listing this plan's deviations and anything else that changed.
- [ ] **Step 5:** Run the full API check, commit, push and open **PR 1** against `oa-part-links` (or `main` if #52 has merged).

### Task 5: Frontend data and shared formatters

**Files:**
- Create: `src/features/builder/api/rodSeries.ts`
- Create: `src/features/builder/utils/format.ts`, holding `formatLength`, `WATER_LABELS` and `capitalize`, moved out of `api/parts.ts`
- Modify: `src/features/builder/api/parts.ts` (import them from `../utils/format`)
- Test: `src/features/builder/utils/format.test.ts`

**Interfaces:**
- `format.ts` exports `formatLength(inches: number): string` (`108` → `9'0"`), `WATER_LABELS` and `capitalize(value: string | null): string`.
- `rodSeries.ts` exports the types `RodSeries`, `RodSize` and `RodSeriesSummary` (matching the API), `rodSeriesKeys = { list: (brand: string) => ['rodSeries', brand] as const }`, and `fetchRodSeries(brand: string, signal?: AbortSignal): Promise<RodSeries[]>`. It calls `apiFetch('/rods/series')` for `all`, otherwise `/rods/series?brand=<encodeURIComponent(brand)>`.
- `formatSeriesSummary(summary: RodSeriesSummary): string` in `rodSeries.ts` returns the spec's line, such as `19 sizes · 3–9 wt · 8'6"–10'0" · $1,100`. Equal ends collapse (`5 wt`, `$550`), and `1 size` is singular. It uses `formatPrice` from `@utils/formatPrice`.

- [ ] **Step 1: Write failing tests** for `formatLength` (`108`, `102`, `138`) and `formatSeriesSummary` (a range, a collapsed weight and price, and one size).
- [ ] **Step 2: Implement.** Move the formatters with no change in behavior, so `parts.ts` output is unchanged.
- [ ] **Step 3: Run the web checks.**

### Task 6: `RodSeriesRow` and `RodSeriesPage`

**Files:**
- Create: `src/features/builder/components/RodSeriesRow.tsx`, `src/features/builder/components/RodSeriesPage.tsx`
- Modify: `src/features/builder/index.ts` (export `RodSeriesPage`)
- Test: `src/features/builder/components/RodSeriesPage.test.tsx`

**Interfaces:**
- `RodSeriesRow` props: `{ series: RodSeries; open: boolean; onToggle: () => void; selectedPartId: string | undefined; onAdd: (partId: string) => void }`.
- `RodSeriesPage` takes no props. It reads `:brand` from the URL and uses `useBuild()` for `build`, `basePath` and `selectPart`.

- [ ] **Step 1: Write the failing tests.** Mock `../api/rodSeries` the way `BuilderLayout.test.tsx` mocks `../api/parts`, and render inside `QueryClientProvider`, a `MemoryRouter` at `/builder/rod/sage`, and a test `BuildContext` provider.
  - It requests the `sage` brand and renders one row per series, named, with its summary line.
  - Rows start closed. Clicking a row's header sets `aria-expanded="true"` and shows its sizes table.
  - With `build.rod = 'rod-51'`, the series containing size 51 starts open, and that row shows a disabled "Selected" button.
  - Clicking Add on size 52 calls `selectPart('rod', 'rod-52')` and navigates to `basePath`.
  - `imageUrl: null` shows the "Rod" placeholder (`role="img"`, name `Rod`), and `purchaseUrl: null` shows no Buy link. With a link, the Buy link has `rel="noopener noreferrer"` and `target="_blank"`.
  - A rejected fetch shows "Couldn't load rods." and a Try again button, and clicking it calls the fetcher again.
  - An empty array shows "We don't have any rods for that brand."
  - For `all`, rows are grouped under one heading per brand.
- [ ] **Step 2: Implement `RodSeriesRow`** to the spec:
  - the header is a `<button>` with `aria-expanded` and `aria-controls`
  - closed: `PartImage` (168×96), the name and the summary
  - open: `PartImage` (360×270) plus the Buy link, and the sizes table built from `@/components/ui/table`
  - Add and Selected buttons as in `BrandPartsPage`
  - on phones, photos go full width and the table sits in an `overflow-x-auto` wrapper
- [ ] **Step 3: Implement `RodSeriesPage`:**
  - `useQuery({ queryKey: rodSeriesKeys.list(brand), queryFn: ({ signal }) => fetchRodSeries(brand, signal) })`
  - open state is a `Set<number>` in `useState`, initialized with the id of the series containing `build.rod` (derived once from the first successful data, without an effect, using the derived-state pattern `PartImage` uses)
  - loading skeleton, error with Try again (`refetch`), and `NotFound` for empty
  - the title is `"{brand name} rods"`, or `"All rods"`
  - on Add: `selectPart('rod', \`rod-${id}\`)` then `navigate(basePath)`
- [ ] **Step 4: Run the web checks.**

### Task 7: Route, manual check, end of PR 2

**Files:**
- Modify: `src/routes/AppRoutes.tsx`
- Test: `src/routes/AppRoutes.test.tsx`

- [ ] **Step 1: Write failing tests** in `AppRoutes.test.tsx`: `/builder/rod/sage` renders `RodSeriesPage`, and `/builder/reel/lamson` still renders `BrandPartsPage`. Mock both pages to marker elements, following the file's existing pattern.
- [ ] **Step 2: Add `<Route path="rod/:brand" element={<RodSeriesPage />} />`** beside `:component/:brand` in both the `LocalBuildProvider` group and the `:buildId` group.
- [ ] **Step 3: Run the web checks**, then run the spec's manual script (8 steps) with the API and dev server running, at desktop and phone width.
- [ ] **Step 4:** Update the spec's "Changes during implementation" if anything changed. Then commit, push and open **PR 2** against PR 1's branch.
