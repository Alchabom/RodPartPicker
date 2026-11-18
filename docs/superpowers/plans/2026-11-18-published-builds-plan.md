# Published Builds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Signed-in users publish a saved build (a snapshot of its five parts, plus a title and write-up) to a public catalog at `/builds`. Anyone can browse it with filters, read a build, and open it in the Builder.

**Architecture:** Migration 020 adds `published_builds`. A new `app/published/` package serves two routers: public reads (`/api/published`), which return a joined read model with the total computed in SQL, and owner writes nested on the saved build (`/api/builds/{id}/published`), which go through the same ownership check as the builds routes. On the frontend, a new `catalog` feature holds the public pages. The builder gains publish controls, a `flushSave` on the saved-build context, and a `?copy=<id>` intent. The shared `formatPrice` and `publishedKeys` keep the two features from importing each other.

**Tech Stack:** FastAPI, SQLAlchemy 2, MySQL 8, pytest; React 19, TypeScript, react-router, `@tanstack/react-query` v5, shadcn (`dialog`, `alert-dialog`, `table`, `button` are already installed).

**Spec:** `docs/superpowers/specs/2026-11-18-published-builds-design.md`

**Who writes what:** Claude writes every task. Omar reviews each PR.

**After every API task:** from `api/`, run `uv run ruff check . && uv run ruff format --check . && uv run pytest`. All pass.
**After every web task:** from the repo root, run `npm run build && npm run lint`. Both pass, with no new lint warnings. Then run the task's manual checks in the browser (`npm run dev` plus `cd api && uv run fastapi dev app/main.py --port 3001`, with `EMAIL_BACKEND=console`). Record the results for the PR description.

**Branches:** everything is on `oa-published-builds`, which already holds the spec and this plan. If the diff goes over 500 lines, split it into a stack along the task boundaries: Tasks 1–2 (API), Task 3 (catalog pages), Task 4 (publishing), Task 5 (Open in Builder and docs). Stage files by name.

**Deviations from the spec** (made while planning; Task 5 updates the spec to match):
- `_get_owned_build` moves to `app/builds/ownership.py` as the public `get_owned_build`. The spec only said "a shared spot in `app/builds/`".
- The owner's query key is `buildKeys.published(id)` (`['builds', id, 'published']`), added to the existing `buildKeys`, not a separate keys object.
- `CopyPublishedIntent` fetches through `useQuery` with `publishedKeys.detail(id)`, so it shares a cache entry with the catalog's detail page.

## Global Constraints

- Title: whitespace stripped, 3–80 characters. Write-up: whitespace stripped, 1–4,000 characters. Plain text only.
- Publishing requires all five parts. 400 detail, exactly: `"Add all five parts before publishing"`.
- 409 details, exactly: `"Choose a display name first"` and `"Already published"`. Owner-route 404 details: `"Build not found"` (the existing helper) and `"Not published"`. Public detail 404: `"Published build not found"`.
- List order: `published_at DESC, id DESC`. Page size: 20. `page` ≥ 1, `weight` 1–15, `maxPrice` ≥ 0.
- `published_at` is set once at first publish and never changed by an update.
- Public responses never contain `userId`, `sourceBuildId` or an email.
- No SQL built from strings: no f-strings, `%`, concatenation or `text()` with user input in `app/published/`. Only SQLAlchemy expressions.
- No `dangerouslySetInnerHTML` in `src/features/catalog/` or in the builder's publish code. The write-up is shown with `whitespace-pre-line`.
- Never edit an applied migration. The new one is `api/migrations/020_published_builds.sql`, exactly as in the spec's "Data model".
- Query keys: `publishedKeys.all = ['published']`, `publishedKeys.list(params) = ['published', 'list', params]`, `publishedKeys.detail(id) = ['published', id]`, `buildKeys.published(id) = ['builds', id, 'published']`.
- Routes: `/builds`, `/builds/:id`, and the intent `/builder?copy=<id>`. A valid id matches `/^[1-9]\d*$/`.
- Copy, exactly: `"Publish"`, `"Update published build"`, `"Unpublish"`, `"Published · View"`, `"Add all five parts to publish"`, `"No builds match these filters"`, `"Clear filters"`, `"No builds published yet"`, `"No longer available"`, `"Open in Builder"`, `"Replace your current draft with {title}?"`, `"Replace"`, `"Keep my draft"`, `"That build is no longer published"`, `"Couldn't save your latest changes; retry before publishing"`, `"Try again"`.
- No hand-written `useMemo`, `useCallback` or `React.memo` (React Compiler).
- Features don't import from each other. Code shared between `builder` and `catalog` lives in `src/utils` or `src/lib`.
- pnpm is the package manager. This plan adds no dependencies.

## Review Focus

- **A title or write-up that's only whitespace** (`"   "`) has to be rejected (it's empty once trimmed), not stored as blank. → Task 1, `test_whitespace_only_text_is_422`.
- **Emoji in the write-up.** Python counts code points, but JS `.length` counts UTF-16 units, so a naive counter would block a valid 4,000-emoji write-up at 2,000. The counter and the client check must use `[...text].length`. → Task 4, manual check 4.
- **A page past the end** (`page=99`) should return 200 with an empty `items` list and the real `total`, not 404, so a stale link still shows "Page 99 of 2" with Previous enabled. → Task 2, `test_page_past_the_end_is_empty`; Task 3, manual check 3.
- **A `maxPrice` exactly equal to a total, or with cents** (`499.99`), must keep builds at or below it, inclusive. An empty value from the input (`maxPrice=`) must never be sent. → Task 2, `test_max_price_is_inclusive_with_cents`; Task 3, `parseCatalogParams`.
- **A malformed `?copy=` value** (`abc`, `0`, `-1`) must never reach the API, and should show the same "no longer published" notice without touching the draft. → Task 5, manual check 3.

---

### Task 1: Migration, model and owner routes

**Files:**
- Create: `api/migrations/020_published_builds.sql`
- Create: `api/app/builds/ownership.py`
- Modify: `api/app/builds/router.py` (remove `_get_owned_build`; import `get_owned_build`)
- Create: `api/app/published/__init__.py`, `api/app/published/models.py`, `api/app/published/schemas.py`, `api/app/published/router.py`
- Modify: `api/app/main.py` (include both new routers)
- Test: `api/tests/test_published.py`

**Interfaces:**
- Produces:
  - `get_owned_build(db: Session, build_id: int, user_id: int) -> Build` in `app/builds/ownership.py`. Same behavior as today: 404 `"Build not found"` for a missing build or someone else's.
  - `PublishedBuild` (in `app/published/models.py`): columns as in the migration, plus relationships `user` (→ `User`), and `rod`, `reel`, `fly_line`, `leader`, `tippet` (→ `Rod`, `Reel`, `FlyLine`, `Leader`, `Tippet`, each nullable).
  - Schemas: `PublishIn(title, writeup)` and `PublishedRefOut(id: int, title: str, writeup: str, updated_at: datetime)`, both `CamelModel`.
  - In `app/published/router.py`: `owner_router = APIRouter(prefix="/builds/{build_id}/published", tags=["published"])` and `public_router = APIRouter(prefix="/published", tags=["published"])` (empty until Task 2). Both are included in `app/main.py` after `builds_router`.
  - Test helpers at the top of `tests/test_published.py`, which Task 2 reuses:
    - `named` fixture: signs in with `login`, then `PUT /api/auth/me` `{"displayName": "TroutBum"}`, and returns the user JSON.
    - `make_full_build` fixture: `make_full_build(user_id, **overrides) -> Build`, a saved build with all five parts from `make_part`.
    - `make_published` fixture: `make_published(**columns) -> PublishedBuild`. It inserts a row directly, defaulting to a user with a display name, five fresh parts, title `"Test Publish {n}"` and write-up `"Write-up"`.

- [ ] **Step 1: Write the failing owner-route tests** in `tests/test_published.py`. `URL = "/api/builds/{}/published"`. Each test re-reads with `db.rollback()` where it checks a commit.
  - `test_publish_creates_snapshot`: `PUT` `{"title": "Creek setup", "writeup": "Small water."}` → 201. The body has `id`, `title == "Creek setup"`, `writeup == "Small water."` and `updatedAt`, and no `userId` or `sourceBuildId`. The row's five part ids equal the build's, with `user_id` = the signer and `source_build_id` = the build.
  - `test_publish_again_updates_and_keeps_published_at`: after the first `PUT`, set the row's `published_at = datetime(2026, 1, 1)` and commit. Change the build's `reel_id` to a new reel and commit. A second `PUT` with a new title → 200. The row has the new title and new `reel_id`, and `published_at == datetime(2026, 1, 1)`. Exactly one row exists for the build.
  - `test_editing_saved_build_leaves_snapshot`: publish, then `PUT /api/builds/{id}` with a different `rodId`. The published row's `rod_id` is unchanged.
  - `test_publish_missing_part_is_400`, parametrized over `rod_id, reel_id, fly_line_id, leader_id, tippet_id`: a build with that column None → 400 `"Add all five parts before publishing"`, and no row is created.
  - `test_publish_without_display_name_is_409`: uses `signed_in` (no name) → 409 `"Choose a display name first"`.
  - `test_publish_text_limits_are_422`, parametrized: title `"ab"`, title `"x" * 81`, write-up `""` and write-up `"x" * 4001` → 422. Then title `"x" * 80` with write-up `"x" * 4000` → 201.
  - `test_whitespace_only_text_is_422`: title `"   "` → 422, and write-up `"  \n "` → 422.
  - `test_get_my_published`: unpublished → 404 `"Not published"`. After publishing → 200 with the same `PublishedRefOut`.
  - `test_unpublish`: `DELETE` → 204 and the row is gone. A second `DELETE` → 404 `"Not published"`.
  - `test_other_users_build_is_404_on_owner_routes`, parametrized over get/put/delete: a build of `make_user(display_name="Other")` → 404 `"Build not found"`, and nothing changes.
  - `test_owner_routes_require_sign_in`, parametrized over get/put/delete on `/api/builds/1/published` → 401.
  - `test_owner_writes_need_origin`: with a no-header `TestClient` (as `bare_client` in `test_auth_origin.py`), `PUT` and `DELETE` → 403.
  - `test_deleting_saved_build_keeps_published`: publish, then `DELETE /api/builds/{id}` → 204. The published row still exists with `source_build_id is None`.
  - `test_deleting_user_deletes_published`: `make_published()`, then `db.delete(user)` and flush → the row is gone.

- [ ] **Step 2: Run them to verify they fail**

Run: `uv run pytest tests/test_published.py -q`
Expected: FAIL (collection error: `app.published` doesn't exist).

- [ ] **Step 3: Write migration 020** exactly as in the spec's "Data model", with its header comment.

- [ ] **Step 4: Move the ownership check.** Create `get_owned_build` in `app/builds/ownership.py` and switch `app/builds/router.py`'s four call sites to it. `tests/test_builds.py` must still pass unchanged.

- [ ] **Step 5: Implement the model, `PublishIn`/`PublishedRefOut` and the three owner routes.**
  - **`PublishIn`:** `Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=80)]` for the title, and `1`–`4000` for the write-up.
  - **`GET`:** `get_owned_build`, then select the `PublishedBuild` by `source_build_id`. 404 `"Not published"` if there isn't one.
  - **`PUT`:**
    - `get_owned_build`. If any of the five part ids is None → 400. If `db.get(User, user_id).display_name` is None → 409 `"Choose a display name first"`.
    - Find an existing row by `source_build_id`: update its title, write-up and five part ids and return 200. Otherwise add a new row (owner from `CurrentUserId`) and return 201.
    - Set the status with an injected `Response` (`response.status_code = 201`). Declare `status_code=200` on the decorator.
    - On commit, an `IntegrityError` whose `e.orig.args[0] == 1062` → rollback, then 409 `"Already published"`.
    - `db.refresh` before returning, so `updated_at` is current.
  - **`DELETE`:** `get_owned_build`, then the row or 404 `"Not published"`, then delete and commit. Status 204.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `uv run ruff check . && uv run ruff format --check . && uv run pytest`
Expected: everything passes, including the existing `test_builds.py` and `test_models.py`.

- [ ] **Step 7: Commit**

```bash
git add api/migrations/020_published_builds.sql api/app/builds/ownership.py api/app/builds/router.py api/app/published api/app/main.py api/tests/test_published.py
git commit -m "feat(api): publish saved builds as snapshots"
```

---

### Task 2: Public list and detail routes

**Files:**
- Modify: `api/app/published/schemas.py`, `api/app/published/router.py`
- Test: `api/tests/test_published.py` (add a "Public" section)

**Interfaces:**
- Consumes: `PublishedBuild`, `public_router`, and the `make_published` and `named` fixtures from Task 1.
- Produces (the JSON contract that Task 3 and Task 5 type against). All fields are camelCase:
  - `RodRefOut { brand: str, name: str, line_weight: int }`
  - `PartRefOut { id: int, brand: str, name: str, price: float | None }`
  - `PublishedSummaryOut { id, title, author: str, rod: RodRefOut | None, total_price: float, published_at: datetime }`
  - `PublishedPartsOut { rod, reel, line, leader, tippet: PartRefOut | None }`. Note that the slot is `line`, not `fly_line`.
  - `PublishedBuildOut(PublishedSummaryOut) { writeup: str, updated_at: datetime, parts: PublishedPartsOut }`
  - `PublishedPageOut { items: list[PublishedSummaryOut], page: int, page_size: int, total: int }`
  - `GET /api/published?page&weight&maxPrice` → `PublishedPageOut`. `GET /api/published/{id}` → `PublishedBuildOut`, or 404 `"Published build not found"`.

- [ ] **Step 1: Write the failing public-route tests.** Use `make_published(published_at=...)` for the ordering tests, and `make_part(Rod, line_weight=..., price=...)` and similar for the filters.
  - `test_list_newest_first_with_id_tiebreak`: three rows (Jan 1; Feb 1; Feb 1). The ids come back as `[tie, new, old]`.
  - `test_list_pages_of_20`: 21 rows. Page 1 has 20 items with `total == 21` and `pageSize == 20`. Page 2 has 1 item.
  - `test_page_past_the_end_is_empty`: 2 rows, `page=99` → 200, `items == []`, `total == 2`, `page == 99`.
  - `test_filter_by_weight`: a 5wt rod build and a 3wt rod build. `weight=5` returns only the first.
  - `test_max_price_is_inclusive_with_cents`: builds with totals 499.99 and 500.00, with prices set so the sums are exact. `maxPrice=499.99` returns only the first, and `maxPrice=500` returns both.
  - `test_total_counts_missing_part_as_zero`: a build whose leader `price` is None (the factory default), and another whose reel row was deleted (`db.delete(reel)` then flush, so `SET NULL`). Each `totalPrice` is the sum of the remaining prices, and the `maxPrice` filter uses that sum.
  - `test_bad_list_params_are_422`, parametrized: `page=0`, `weight=0`, `weight=16`, `weight=abc`, `maxPrice=-1`, `maxPrice=1 OR 1=1` → 422.
  - `test_summary_shape`: an item is exactly `{id, title, author, rod: {brand, name, lineWeight}, totalPrice, publishedAt}`, with `author` = the display name.
  - `test_detail`: returns the summary fields plus `writeup`, `updatedAt`, and `parts` with all five slots as `{id, brand, name, price}`.
  - `test_detail_removed_part_is_null`: delete the rod row → `parts.rod is None`, `rod is None`, and the total skips it. The `weight=5` filter now leaves it out.
  - `test_detail_unknown_is_404` → 404 `"Published build not found"`.
  - `test_public_routes_hide_private_ids`: for both routes, the raw response text contains none of `userId`, `sourceBuildId`, `user_id`, `source_build_id` or `@example.com`.
  - `test_public_routes_need_no_sign_in`: a fresh `client` with no login gets 200 on both.
  - `test_sql_injection_text_is_stored_verbatim`: publish through the owner route with title `"x'); DROP TABLE builds; --"`. `GET /api/published/{id}` returns that exact title, and `GET /api/builds` still returns 200 with the build in it.
  - `test_script_text_is_returned_verbatim`: write-up `"<script>alert(1)</script>"` comes back from the detail route as that exact string.

- [ ] **Step 2: Run them to verify they fail**

Run: `uv run pytest tests/test_published.py -q -k "list or page or filter or price or detail or public or injection or script or summary or total"`
Expected: FAIL with 404s (the routes don't exist).

- [ ] **Step 3: Implement both routes on `public_router`.**
  - **Query parameters:** `page: Annotated[int, Query(ge=1)] = 1`, `weight: Annotated[int | None, Query(ge=1, le=15)] = None`, and `max_price: Annotated[Decimal | None, Query(alias="maxPrice", ge=0)] = None`.
  - **One shared base select:** `PublishedBuild` joined to `User`, LEFT OUTER JOINed to `Rod`, `Reel`, `FlyLine`, `Leader` and `Tippet` on their FK columns. The total is `func.coalesce(Rod.price, 0) + ...` over all five, labeled `total_price`.
  - **Filters:** `weight` is `Rod.line_weight == weight`. `maxPrice` is `total_expr <= max_price`.
  - **The count** is `select(func.count()).select_from(base.subquery())`. The page is `base.order_by(PublishedBuild.published_at.desc(), PublishedBuild.id.desc()).limit(20).offset((page - 1) * 20)`.
  - **Brand names** load with `selectinload` on each part relationship, chained to `.selectinload(<Part>.brand)`, so a page costs a fixed number of queries.
  - **Building the response:** a small `_summary(row, total) -> PublishedSummaryOut` and `_part(part) -> PartRefOut | None` map the ORM objects. The detail route reuses the base select with `.where(PublishedBuild.id == id)`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `uv run ruff check . && uv run ruff format --check . && uv run pytest`
Expected: everything passes.

- [ ] **Step 5: Commit**

```bash
git add api/app/published api/tests/test_published.py
git commit -m "feat(api): list and read published builds"
```

---

### Task 3: Catalog pages

**Files:**
- Move: `src/features/builder/utils/formatPrice.ts` → `src/utils/formatPrice.ts`. Update the four builder imports (`ComponentRow`, `BuilderPage`, `BrandPartsPage`, `MyBuildsPage`) to `@utils/formatPrice`.
- Create: `src/lib/publishedKeys.ts`
- Create: `src/features/catalog/index.ts`, `types/index.ts`, `api/published.ts`, `utils/params.ts`, `components/PublishedListPage.tsx`, `components/CatalogFilters.tsx`, `components/PublishedCard.tsx`, `components/PublishedBuildPage.tsx`
- Modify: `src/routes/AppRoutes.tsx` (two routes, plus the navbar link to `/builds`)

**Interfaces:**
- Consumes: the JSON contract from Task 2.
- Produces:
  - `src/lib/publishedKeys.ts`:
    ```ts
    export type CatalogParams = { page: number; weight?: number; maxPrice?: number }
    export const publishedKeys = {
      all: ['published'] as const,
      list: (params: CatalogParams) => ['published', 'list', params] as const,
      detail: (id: number) => ['published', id] as const,
    }
    ```
  - `catalog/types`: `Slot = 'rod' | 'reel' | 'line' | 'leader' | 'tippet'`, plus `PublishedRod`, `PublishedPart`, `PublishedSummary`, `PublishedBuild` (with `parts: Record<Slot, PublishedPart | null>`) and `PublishedList`. They mirror Task 2's schemas, with `publishedAt`/`updatedAt` as `string`.
  - `catalog/api/published.ts`: `listPublished(params: CatalogParams, signal?: AbortSignal): Promise<PublishedList>` (omits undefined params from the query string) and `getPublished(id: number, signal?: AbortSignal): Promise<PublishedBuild>`.
  - `catalog/utils/params.ts`: `parseCatalogParams(search: URLSearchParams): CatalogParams`. `page` is an integer ≥ 1, else 1. `weight` is an integer 1–15, else undefined. `maxPrice` is a finite number ≥ 0, else undefined (so `""`, `abc` and `-1` all mean "no filter").
  - The barrel exports `PublishedListPage` and `PublishedBuildPage`.

- [ ] **Step 1: Move `formatPrice` and add `publishedKeys`.** Run `npm run build`. It passes, and no file imports `../utils/formatPrice` anymore.

- [ ] **Step 2: Add the types, the API client and `parseCatalogParams`.**

- [ ] **Step 3: Implement `PublishedListPage`, `CatalogFilters` and `PublishedCard`** as in the spec's "/builds" section.
  - Changing a filter sets the URL param, deleting it when it's "Any" or empty, and deletes `page`.
  - The price input is controlled locally and writes to the URL on blur or Enter.
  - Use `useQuery({ queryKey: publishedKeys.list(params), queryFn: ({ signal }) => listPublished(params, signal), placeholderData: keepPreviousData })`.
  - Pages = `Math.max(1, Math.ceil(total / pageSize))`. Previous is disabled at page 1, and Next when `page >= pages`.
  - Empty state: `"No builds match these filters"` plus `"Clear filters"` when a filter is set, or `"No builds published yet"` when none is.

- [ ] **Step 4: Implement `PublishedBuildPage`** as in the spec's "/builds/:id" section.
  - A malformed `:id` (failing `/^[1-9]\d*$/`) or an `ApiError` 404 renders `<NotFound message="Build not found" backTo="/builds" backLabel="Completed Builds" />`.
  - The parts table uses the shadcn `Table` with the slot labels Rod, Reel, Line, Leader and Tippet. A null part shows `"No longer available"`. The total is `totalPrice` through `formatPrice`.
  - The write-up is `<p className="whitespace-pre-line">{build.writeup}</p>`.
  - `"Open in Builder"` is a `Link` to `` `/builder?copy=${id}` ``.

- [ ] **Step 5: Add the routes and the navbar link.** `builds` and `builds/:id` are top-level children of `Layout`. The `#completed-builds` anchor becomes `<Link to="/builds">`.

- [ ] **Step 6: Verify**

Run: `npm run build && npm run lint`
Expected: both pass. Then the manual checks, with two or more builds published through Task 1's route (curl, or the API docs page while signed in):
1. `/builds` lists them newest first, and the navbar link goes there.
2. A weight filter and a max price narrow the list and stay after a reload. `/builds?weight=abc` shows the unfiltered list.
3. `/builds?page=99` shows the empty state with "Page 99 of 1" and Previous enabled.
4. `/builds/:id` shows the parts, total, author and date. A write-up with line breaks keeps them, and `<b>hi</b>` shows as literal text.
5. `/builds/99999` and `/builds/abc` show Not found. Signed out, both pages still load.

- [ ] **Step 7: Commit**

```bash
git add src/utils/formatPrice.ts src/features/builder src/lib/publishedKeys.ts src/features/catalog src/routes/AppRoutes.tsx
git commit -m "feat(web): browse published builds at /builds"
```

---

### Task 4: Publishing from the builder

**Files:**
- Modify: `src/features/builder/hooks/buildContext.ts` (add `flushSave` to the saved variant)
- Modify: `src/features/builder/hooks/SavedBuildProvider.tsx`
- Modify: `src/features/builder/api/builds.ts` (`buildKeys.published`)
- Create: `src/features/builder/api/publish.ts`
- Create: `src/features/builder/components/PublishControls.tsx`, `src/features/builder/components/PublishDialog.tsx`
- Modify: `src/features/builder/components/BuildHeader.tsx` (render `<PublishControls />` in saved mode)

**Interfaces:**
- Consumes: the owner routes from Task 1, and `publishedKeys.all` from Task 3.
- Produces:
  - `flushSave: () => Promise<void>` on the `kind: 'saved'` context.
  - `buildKeys.published: (id: number) => ['builds', id, 'published'] as const`.
  - In `api/publish.ts`:
    - `PublishedRef { id: number; title: string; writeup: string; updatedAt: string }` and `PublishInput { title: string; writeup: string }`.
    - `getMyPublished(buildId: number, signal?: AbortSignal): Promise<PublishedRef | null>`. It maps an `ApiError` 404 to `null`.
    - `publishBuild(buildId: number, input: PublishInput): Promise<PublishedRef>` and `unpublishBuild(buildId: number): Promise<void>`.
    - Task 5 adds to this file.

- [ ] **Step 1: Add `flushSave`.**
  - In `SavedBuildEditor`, switch to `const { mutate, mutateAsync, isPending, isError } = useMutation(...)`.
  - `flushSave` is `async () => { cancelPending(); setLastSent(inputJson); await mutateAsync(input) }`. It always sends the current build once. That's safe because the `PUT` is a full replace, and the mutation `scope` queues it behind any save already in flight, so when it resolves, the server holds the latest build. It rejects if that save fails.
  - Add it to the context value and the type.

- [ ] **Step 2: Add `buildKeys.published` and `api/publish.ts`.**

- [ ] **Step 3: Implement `PublishDialog`.**
  - **Props:** `{ open: boolean; onOpenChange(open: boolean): void; buildId: number; initial: { title: string; writeup: string }; mode: 'publish' | 'update' }`.
  - **Form:** a title `<input maxLength={80}>`, and a `<textarea rows={8}>` styled like the inputs in `DisplayNameForm` (there's no shadcn textarea). Under the textarea, the counter `` `${[...writeup].length} / 4000` ``.
  - **Client check:** trimmed title length 3–80, and trimmed write-up `[...s].length` 1–4000. Show inline messages, and don't send the request if either fails.
  - **Submit:**
    1. `try { await flushSave() } catch { show "Couldn't save your latest changes; retry before publishing"; return }`
    2. Then `publishBuild`.
    3. On success: invalidate `buildKeys.published(buildId)` and `publishedKeys.all`, then close.
    4. On an `ApiError` 409 with detail `"Already published"`: invalidate `buildKeys.published(buildId)` (the controls switch to update mode) and show the message.
    5. Other errors show the API's `detail` string when it's a string, else `"Something went wrong, try again"`.

- [ ] **Step 4: Implement `PublishControls`**, rendered only when `kind === 'saved'`.
  - Load the state with `useQuery({ queryKey: buildKeys.published(id), queryFn: ({ signal }) => getMyPublished(id, signal) })`.
  - **`null` (not published):** a `"Publish"` button. It's disabled when `!COMPONENTS.every((c) => build[c.type])`, with the hint `"Add all five parts to publish"`.
  - **A `PublishedRef`:** a `"Published · View"` link to `/builds/{ref.id}`, an `"Update published build"` button (opens the dialog in update mode, with `initial` from the ref) and an `"Unpublish"` button.
  - **Unpublish:** an `AlertDialog` modeled on `MyBuildsPage`'s delete. On success, invalidate the same two keys.
  - When publishing for the first time, the dialog's `initial.title` is the build's `name`.

- [ ] **Step 5: Verify**

Run: `npm run build && npm run lint`
Expected: both pass. Then the manual checks:
1. On a four-part saved build, Publish is disabled and shows the hint. Add the fifth part, and it enables.
2. Publish. The build appears first on `/builds`, and the header shows Published · View, Update published build and Unpublish.
3. Change the reel and click Update within a second. `/builds/:id` shows the new reel (`flushSave`). Its place in the list doesn't change.
4. A write-up of 4,000 emoji is accepted, and the counter reads 4000 / 4000. A title of two characters shows the inline message and sends no request (check the Network tab).
5. Stop the API, change a part, and click Update. The flush-failure message shows, and nothing is published. Start the API again, then Retry, then Update: it works.
6. Unpublish and confirm. The build is gone from `/builds`, and the header shows Publish again.
7. Regression: autosave status, rename, and My Builds delete still work.

- [ ] **Step 6: Commit**

```bash
git add src/features/builder
git commit -m "feat(web): publish, update and unpublish saved builds"
```

---

### Task 5: Open in Builder, and docs

**Files:**
- Modify: `src/features/builder/api/publish.ts` (add the public fetch)
- Create: `src/features/builder/components/CopyPublishedIntent.tsx`
- Modify: `src/features/builder/components/BuilderPage.tsx` (render it when `kind === 'draft'`)
- Create: `docs/builds/published-builds.md`
- Modify: `docs/database/schema-design.md`, `CLAUDE.md`, `docs/superpowers/specs/2026-11-18-published-builds-design.md` (record this plan's three deviations)

**Interfaces:**
- Consumes: `publishedKeys.detail` (Task 3), `GET /api/published/{id}` (Task 2), and the draft context's `build`, `clearBuild` and `selectPart`.
- Produces:
  - `PublicBuildParts { title: string; parts: Record<ComponentType, { id: number } | null> }`.
  - `getPublicBuildParts(id: number, signal?: AbortSignal): Promise<PublicBuildParts>`, calling `apiFetch('/published/{id}')`.

- [ ] **Step 1: Add `getPublicBuildParts`.**

- [ ] **Step 2: Implement `CopyPublishedIntent`.**
  1. On mount, read `copy` once into state: `useState(() => searchParams.get('copy'))`. An effect removes `copy` from the URL with `replace`.
  2. If the value fails `/^[1-9]\d*$/`, show the notice right away and never query.
  3. Otherwise run `useQuery({ queryKey: publishedKeys.detail(id), queryFn: ({ signal }) => getPublicBuildParts(id, signal) })`. 4xx responses aren't retried, per the app's query client.
  4. When the data arrives, apply it once (track a `handled` state). If the draft is empty, apply right away. Otherwise open the `AlertDialog` `"Replace your current draft with {title}?"`, with `"Replace"` / `"Keep my draft"`.
  5. Applying means `clearBuild()`, then `selectPart(slot, `${slot}-${part.id}`)` for each non-null part.
  6. An `ApiError` 404, or an invalid id, shows a dismissible `Alert`: `"That build is no longer published"`.

- [ ] **Step 3: Verify**

Run: `npm run build && npm run lint`
Expected: both pass. Then the manual checks:
1. Signed out with an empty draft, click Open in Builder on `/builds/:id`. The draft fills with the five parts, and the URL is `/builder`. Reload: the draft persists.
2. With a non-empty draft, open another build. The dialog asks first. Keep my draft leaves the draft alone, and Replace swaps it in and clears any "Why:" notes.
3. `/builder?copy=99999`, `/builder?copy=abc` and `/builder?copy=0` each show the notice, and the draft is untouched. For `abc` and `0`, the Network tab shows no `/api/published` request.
4. StrictMode check: in dev, one copy makes exactly one request and applies once.
5. Run the full manual script from the spec's "Testing" section, steps 1–9.

- [ ] **Step 4: Write the docs.**
  - `docs/builds/published-builds.md`, in the style of `saved-builds.md`: the snapshot model, the routes table, the "Untrusted text" rules and the four flows.
  - The `published_builds` table and its decisions in `schema-design.md`.
  - In CLAUDE.md:
    - Add the `catalog` feature (`/builds`, `/builds/:id`) and `?copy=` to the "Architecture" section.
    - Add `app/published/` (public plus owner routers, and `get_owned_build` in `app/builds/ownership.py`) to the "API" section.
  - Record this plan's three deviations in the spec.

- [ ] **Step 5: Commit**

```bash
git add src/features/builder docs/builds/published-builds.md docs/database/schema-design.md CLAUDE.md docs/superpowers/specs/2026-11-18-published-builds-design.md
git commit -m "feat(web): open a published build in the builder"
```
