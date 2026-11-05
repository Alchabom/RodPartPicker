# Server-Side Compatibility — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-11-04-server-compatibility-design.md`
**Date:** 2026-11-04
**Tooling:** uv, Python 3.14, MySQL running locally, pnpm for the frontend

**How this plan works:** each task names who writes it. Omar writes the rules, schemas, routers, `LineWeight` and test cases. Claude writes the migration and any fixture changes, and reviews everything. The frontend is paired. Snippets appear only where a detail is easy to get wrong; they are not finished code. Tasks that add behaviour are written test first: write the test, watch it fail, make it pass.

**After every API task:** run `uv run ruff check . && uv run ruff format --check . && uv run pytest` (from `api/`), ask Claude to review, then commit.

**After every frontend task:** run `pnpm exec tsc -b && pnpm lint`, ask Claude to review, then commit.

**Branches:** `api-compatibility` already exists, cut from `api-builds`, and holds the spec. Once `api-builds` merges, rebase it onto `main`. Cut `builder-compatibility` from `main` after PR 1 merges. Budget: under 500 lines per PR, not counting pure deletions.

**Staging:** the working tree has unrelated `.agents/` deletions. Stage files by name, never with `git add -A` or `git add .`.

---

# Phase 1 — API (`api-compatibility`, ~450 lines)

Most of these lines are tests. If the PR goes over budget, keep the tests and trim elsewhere rather than dropping boundary cases.

## Task 1.1 — Water retag migration (Claude)

**Files:** `api/migrations/015_water_tags.sql` (new), `api/tests/test_models.py`

1. **Test:** after migrating, exactly 16 tippets and 13 reels have `water = 'both'`, and every tippet still tagged `fresh` is 4X or finer.
2. The SQL from the spec, with a header comment in the same style as the other migrations.
3. Run `uv run python -m app.migrate` against the dev DB.

**Verify:** the test passes. Re-running the migrate command prints that the database is up to date.
**Commit:** `feat(db): tag strong tippets and sealed reels for salt`

## Task 1.2 — `LineWeight` model (Omar)

**Files:** `api/app/parts/models.py`, `api/tests/test_models.py`

1. Add `LineWeight` with `__tablename__ = "line_weights"`. The primary key is `weight_class`, not `id`. Map `grains_target`, `grains_min` and `grains_max`.
2. Add it to the `test_model_columns_match_table` parametrize list.
3. Update the comment at the top of `models.py`, which says `line_weights` isn't mapped.

**Pitfall:** don't inherit from `CatalogPart`. This table has no brand or `id`.

**Commit:** `feat(api): map the line_weights table`

## Task 1.3 — Matching rules (Omar, test first)

**Files:** `api/app/compatibility/__init__.py`, `api/app/compatibility/rules.py`, `api/tests/test_compatibility_rules.py`

1. **Tests:** the matching, water and recommendation cases listed under "Testing" in the spec. Build parts without a database: `Rod(line_weight=5, water="fresh", action="fast")` works unsaved, so these tests need no `db` fixture.
2. Constants: `SALT_MIN_WEIGHT = 7` and `HEAVY_LEADER_LB = 10`. The leader rule's 7 wt cutoff is a separate idea from the saltwater minimum, so give it its own name, such as `HEAVY_LEADER_MIN_ROD_WEIGHT = 7`.
3. Suggested functions:
   ```python
   def effective_water(rod: Rod | None, requested: str | None) -> str | None: ...
   def passes_water(part_water: str, water: str | None) -> bool: ...
   def is_heavy_leader(leader: Leader) -> bool: ...
   def reel_matches(reel, rod, water, requested) -> bool: ...
   def line_matches(line, rod, water, requested) -> bool: ...
   def leader_matches(leader, rod, water) -> bool: ...
   def is_recommended(line, rod, grains_max: int) -> bool: ...
   ```

**Pitfalls:**
- **Two different waters.** The saltwater minimum applies only when `requested == "salt"`, not when `effective_water` returns `salt` from the rod's tag. A `salt` 6-wt rod chosen directly must still show its matches, so these functions need both values.
- **Blank values.** `strength_lb`, `action` and `head_weight_grains` can be `None`. `None >= 10` raises `TypeError`, so check for `None` first.
- **No imports from `fastapi` or `app.db`.** `rules.py` may import the part models for type hints only. Pass `grains_max` in as a value, so the rules never query anything.

**Commit:** `feat(api): add compatibility matching rules`

## Task 1.4 — Build warning rules (Omar, test first)

**Files:** `api/app/compatibility/rules.py`, `api/tests/test_compatibility_rules.py`

1. **Tests:** each of the six warning codes firing, not firing, and not firing when one of its parts is missing. For `LEADER_TIPPET_SIZE`: the same size, one finer, one heavier, and a leader with no X-size.
2. `check_build(rod, reel, line, leader, tippet) -> list[BuildIssue]`, where each argument can be `None`. `BuildIssue` is a small dataclass in `rules.py` with `code` and `message`, so the rules don't depend on Pydantic. Avoid the name `Warning`, which is a Python built-in.
3. Keep the codes as constants, or a `StrEnum`, so a typo can't create a new code.

**Pitfalls:**
- **X-size direction.** `x_sizes` IDs rise as tippet gets finer (5X = 9, 6X = 10). The rule is `tippet.x_size_id in (leader.x_size_id, leader.x_size_id + 1)`.
- **`WATER_MISMATCH` ignores `both`.** It fires only if the selected tags contain both `fresh` and `salt`, so collect the tags into a set and check for those two.

**Commit:** `feat(api): add build warning rules`

## Task 1.5 — `GET /api/compatibility/parts` (Omar, test first)

**Files:** `api/app/compatibility/schemas.py`, `api/app/compatibility/router.py`, `api/app/main.py`, `api/tests/test_compatibility.py`

1. **Tests:**
   - The response has `rod`, `reel`, `line`, `leader`, `tippet` and `recommendedLine`.
   - With a weight-5 rod, an inserted matching reel is `in` the list and a non-matching one is `not in` it. Seeded parts also appear, so never assert the whole list.
   - An unknown `rodId` returns 400 with the spec's `detail`.
   - `water=both`, `water=lake` and `rodId=0` each return 422.
   - With no parameters, `recommendedLine` is empty.
2. `CompatibleParts(CamelModel)`: five `list[int]` fields and `recommended_line: list[int]`.
3. The router uses `prefix="/compatibility"`. Type `water` as `Literal["fresh", "salt"] | None`, so FastAPI returns the 422 for you. `rodId` needs `Query(alias="rodId", gt=0)`.
4. In the handler: load the rod if there is one, load each part table with `db.scalars(select(X)).all()`, then filter with the rules. Load `line_weights` into a `{weight_class: grains_max}` dict once, not once per line.

**Pitfall:** `CamelModel` handles JSON keys, not plain query parameters, so each camelCase query name needs its own alias. Without it, FastAPI silently expects `rod_id` and ignores `rodId`. The test with an unknown `rodId` catches this.

**Commit:** `feat(api): serve compatible parts from the API`

## Task 1.6 — `GET /api/compatibility/check` (Omar, test first)

**Files:** `api/app/compatibility/schemas.py`, `api/app/compatibility/router.py`, `api/tests/test_compatibility.py`

1. **Tests:**
   - A mismatched rod and line returns 200 with `ROD_LINE_WEIGHT` in the codes.
   - A compatible build returns `{"warnings": []}`.
   - No parameters returns `{"warnings": []}`.
   - An unknown ID for each of the five parts returns 400.
   - `reelId=0` returns 422.
2. `BuildWarning(CamelModel)` with `code` and `message`, and `BuildCheck(CamelModel)` with `warnings: list[BuildWarning]`.
3. A small helper keeps the five lookups from repeating:
   ```python
   def _load(db, model, part_id):
       if part_id is None:
           return None
       part = db.get(model, part_id)
       if part is None:
           raise HTTPException(status_code=400, detail="Referenced part does not exist")
       return part
   ```
   Task 1.5 can use it for the rod too.

**Verify:** try both endpoints by hand in `/docs`, using a seeded salt rod and a seeded fresh rod.
**Commit:** `feat(api): check builds for compatibility warnings`

## Task 1.7 — Docs and PR 1 (paired)

**Files:** `docs/database/schema-design.md`, `docs/superpowers/specs/2026-10-19-fastapi-backend-design.md`

1. Rewrite §7 of `schema-design.md` to match the spec. Say why the line head check was removed.
2. Add a note under "PR 3: Compatibility" in the 10-19 spec saying the 11-04 spec replaces it.
3. Open PR 1. **The description must include the "For review" item from the spec** for Omar's teammate: heavy leaders (10 lb and up) only match rods of 7 wt and up, and why.

**Commit:** `docs: update compatibility rules`
**Open PR 1.**

---

# Phase 2 — Frontend (`builder-compatibility`, ~150 lines)

Run the FastAPI server for everything in this phase. Express doesn't have these routes.

## Task 2.1 — API client

**Files:** `src/features/builder/api/compatibility.ts` (new)

1. `fetchCompatibleParts(rodId: number, signal?)` calls `apiFetch` with `/compatibility/parts?rodId=...` and `{ signal }`. It returns a `Set<number>` per component, plus a set for recommended lines.
2. `checkBuild(ids, signal?)` takes `{ rodId?, reelId?, flyLineId?, leaderId?, tippetId? }`, builds the query with `URLSearchParams`, and returns the warnings.

**Pitfall:** the frontend's component name is `line`, but the query parameter is `flyLineId`.

**Commit:** with Task 2.2.

## Task 2.2 — Parts page highlights

**Files:** `src/features/builder/components/BrandPartsPage.tsx`

1. Add `tippet` to `ROD_MATCHED`.
2. Fetch in a `useEffect` on `rod?.dbId` with an `AbortController`, following `BuilderLayout`. On failure, skip the error if `controller.signal.aborted`, otherwise `console.error` it and show no highlights.
3. Store the rod ID with the result, and derive what's current:
   ```ts
   const compatible = result?.rodId === rod?.dbId ? result?.parts : undefined
   ```
   This stops the previous rod's highlights showing while the new request runs, with no `setState` call needed to clear them.
4. Replace `fitsRod` with `compatible?.[component.type]?.has(part.dbId) ?? false`.
5. Add the "Recommended" badge for lines in the recommended set.
6. Show the "N of M" banner only when `compatible` is loaded.

**Pitfall:** the early `return <NotFound />` sits above where `rod` is computed. The `useEffect` must go **above** that return, or oxlint's `rules-of-hooks` fails. Move the `rod` calculation up too, and guard against `component` being undefined. Don't add `useMemo` or `useCallback`; the React Compiler handles that.

**Verify:** with a 5-wt fresh rod selected, reels, lines, leaders and tippets highlight according to the spec. Mirage Big Game isn't highlighted. The DevTools Network tab shows one request per rod change.
**Commit:** `feat(builder): highlight compatible parts from the API`

## Task 2.3 — Build page warnings

**Files:** `src/features/builder/components/BuilderPage.tsx`

1. Map the build to IDs through `getPart`, so stale `localStorage` IDs drop out, and count the selected parts.
2. Build the query string first and use that string as the `useEffect` dependency. An object would change on every render and refetch forever.
3. Skip the request with fewer than two parts. Use the same pattern as Task 2.2: store the query string with the result, and show warnings only when it matches the current one.
4. Render a panel below the table with one line per warning, using each `message`. Show nothing when there are no warnings or the request failed. Don't disable any button.

**Verify:**
- A 5-wt rod with a 6-wt line shows the warning, and swapping the line clears it.
- A fresh rod with a salt line shows `WATER_MISMATCH`.
- Stopping the API leaves the page working, with no panel.

**Commit:** `feat(builder): show build compatibility warnings`

## Task 2.4 — Remove the old rules and open PR 2

**Files:** `src/features/builder/utils/compatibility.ts` (delete), `src/features/builder/types/index.ts`, `src/features/builder/api/parts.ts`

1. Delete `utils/compatibility.ts`.
2. Remove `lineWeight` and `lineWeightRange` from `Part`, and stop setting them in `parts.ts`. Keep the row fields; the spec columns still use them.

**Verify:**
- `grep -rn "fitsRod\|NON_TROUT" src` finds nothing.
- `pnpm build` passes.
- Do a full browser pass with a fresh rod, a salt rod and a `both` rod. Check results against the spec, not `main`, because some differences are intended.

**Commit:** `refactor(builder): remove client-side compatibility rules`
**Open PR 2.**

---

# Not in this plan

- **Avid Trout-Gold 7-wt head weight:** Omar checks it against the product listing. If it's a typo, it needs its own migration (`016`).
- **The questionnaire:** its own spec, after PR 2.
- **Express cutover:** still its own PR.
