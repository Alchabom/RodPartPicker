# Build-Aware Highlights — Implementation Plan

**Spec:** "Revision: build-aware highlights" in `docs/superpowers/specs/2026-11-04-server-compatibility-design.md`, on `api-compatibility-fit`
**Date:** 2026-11-05
**Follows:** `2026-11-04-server-compatibility-plan.md`. This plan replaces its Task 2.4 and finishes its Phase 2.

**How this plan works:** tasks that add behaviour are test first. Snippets appear only where a detail is easy to get wrong; they are not finished code.

**After every API task:** run `uv run ruff check . && uv run ruff format --check . && uv run pytest` (from `api/`), review, then commit.

**After every frontend task:** run `pnpm exec tsc -b && pnpm lint`, review, then commit.

**Staging:** the working tree has unrelated `.agents/` deletions. Stage files by name, never with `git add -A` or `git add .`.

**Order:** Phase A's branch sits on `api-compatibility`, and Phase B's sits on Phase A's. PRs #12-#15 don't change.

---

# Phase A — API (`api-compatibility-fit`)

## Task A.0 — Save the frontend draft and switch branches

**Files:** `src/features/builder/api/compatibility.ts`, `src/features/builder/components/BuilderPage.tsx`, this plan

1. On `builder-compatibility`, commit the Task 2.3 draft as `feat(builder): show build compatibility warnings`. Task B.1 restyles it.
2. `git switch api-compatibility-fit`, which is now possible with a clean tree.
3. Commit this plan: `docs: add build-aware highlights plan`.

## Task A.1 — `passes_filter` and `conflicts` (test first)

**Files:** `api/app/compatibility/rules.py`, `api/tests/test_compatibility_rules.py`

1. **Tests:**
   - `passes_filter`: no `water` passes everything; a matching tag, `both` and the opposite tag; under `water=salt`, top weight 6 vs 7, and no top weight (leaders and tippets).
   - `conflicts`: a clash; no clash; nothing selected; a clash only between two other parts doesn't count; a part isn't checked against its own slot.
2. Give each `check_build` argument a default of `None`, so a pair can be passed by name. Existing positional calls still work.
3. Add both functions, keeping the old ones until Task A.3:
   ```python
   def passes_filter(part_water: str, top_weight: int | None, requested: str | None) -> bool: ...

   def conflicts(slot: str, part, selected: dict) -> bool:
       return any(
           check_build(**{slot: part, other_slot: other})
           for other_slot, other in selected.items()
           if other_slot != slot and other is not None
       )
   ```

**Pitfalls:**
- `slot` must match the `check_build` argument names: `rod`, `reel`, `line`, `leader`, `tippet`.
- `top_weight` is `line_weight` for rods and lines, `max_line_weight` for reels, and `None` for leaders and tippets, so they skip the minimum.

**Commit:** `feat(api): add build-aware compatibility rules`

## Task A.2 — Name the part in warnings (test first)

**Files:** `api/app/compatibility/rules.py`, `api/tests/test_compatibility_rules.py`

1. **Test:** one test that a reel warning's message contains the reel's name. Keep other tests on `code` only.
2. Update the messages to the spec's table.

**Pitfall:** the unsaved test objects have no `name`, so messages read "None is rated for...". That's harmless in tests, since nothing else checks the wording.

**Commit:** `feat(api): name the part in build warnings`

## Task A.3 — Whole-build `/parts` (test first)

**Files:** `api/app/compatibility/router.py`, `api/app/compatibility/rules.py`, `api/tests/test_compatibility.py`, `api/tests/test_compatibility_rules.py`

1. **Tests, added to `test_compatibility.py`:**
   - A 5X leader leaves 5X and 6X tippets in `tippet`, and a 4X and a 7X tippet out.
   - A `both` rod with a salt line leaves `fresh` reels out.
   - A selected reel doesn't exclude a different reel.
   - `water=salt` with a `fresh` rod leaves `salt` lines out.
   - An unknown ID for each of the five parts returns 400, and `reelId=0` returns 422.
   - **Consistency:** select a compatible rod, line and leader. For every ID in `reel` and `tippet`, `/check` with that part added returns no warnings.
2. **Router:** give `/parts` the same five ID parameters as `/check`, plus `water`. Load them into a dict once:
   ```python
   selected = {"rod": _load(db, Rod, rod_id), "reel": _load(db, Reel, reel_id), ...}
   ```
   Then each list keeps parts where `passes_filter(...)` is true and `conflicts(slot, part, selected)` is false.
3. A small `_fits(db, model, slot, ...)` helper keeps the five lists from repeating. Only `top_weight` differs between them.
4. Remove `rod_matches`, `reel_matches`, `line_matches`, `leader_matches` and `effective_water`, and their tests.
5. Rewrite the `/parts` tests that relied on them:
   - `test_parts_water_parameter_beats_the_rods_tag` keeps its `both` rod, so it can stay, but rename it.
   - `test_parts_with_no_filters_returns_everything` stays.

**Pitfalls:**
- `recommended` is still built from the highlighted lines, and only runs when `selected["rod"]` exists.
- The rods list no longer filters on the rod's own tag, because a component ignores its own slot. A fresh rod's `rod` list now holds every rod that fits the *other* parts.

**Verify:** by hand in `/docs`, a 5X leader returns 8 tippets.
**Commit:** `feat(api): highlight only parts that fit the whole build`

## Task A.4 — Docs and PR

**Files:** `docs/database/schema-design.md`

1. Rewrite the "Matching" part of §7 with the rule from the spec. Keep the warning table.
2. Push `api-compatibility-fit`, and open a PR based on `api-compatibility`.
3. **The description must say** it removes functions added in #13, and why: warnings became the single definition of compatible, so highlights can't drift from them, and the team expects to revisit that definition.
4. Add the new PR to the stack list on #12-#15.

**Commit:** `docs: describe build-aware highlights`
**Open the PR.**

---

# Phase B — Frontend (`builder-compatibility`)

## Task B.0 — Move the branch

1. `git switch builder-compatibility`, then `git rebase api-compatibility-fit`. This branch hasn't been pushed, so rebasing is safe.

**Verify:** `git log --oneline api-compatibility-fit..HEAD` shows only the two frontend commits.

## Task B.1 — shadcn `Alert`

**Files:** `src/components/ui/alert.tsx` (generated), `src/features/builder/components/BuilderPage.tsx`, `package.json` if the CLI changes it

1. `pnpm exec shadcn add alert`.
2. Replace the `<section>` in `BuilderPage` with `Alert`, `AlertTitle` and `AlertDescription`, using the default variant. Keep the `TriangleAlert` icon and the list of messages. Remove the amber classes.

**Pitfall:** read the generated file before committing. `badge.tsx` imports `cn` from `"cn"`, so check what the CLI writes and that `pnpm build` still passes.

**Verify:** in the browser, the panel matches the page's theme.
**Commit:** `feat(builder): use the shadcn alert for build warnings`

## Task B.2 — Whole-build highlights

**Files:** `src/features/builder/api/compatibility.ts`, `src/features/builder/components/BrandPartsPage.tsx`, `src/features/builder/components/BuilderPage.tsx`, `src/features/builder/hooks/useBuildQuery.ts` (new)

1. Move the `ids` and `query` calculation out of `BuilderPage` into `useBuildQuery()`, which returns `{ query, selectedCount }`. Both pages need it.
2. `fetchCompatibleParts(query, signal)` takes the query string instead of a rod ID.
3. In `BrandPartsPage`:
   - Work out `hasOtherParts`: any component other than this one has a selected part.
   - Fetch in a `useEffect` on `query` and `hasOtherParts`, storing `query` with the result, as `BuilderPage` does.
   - Remove `ROD_MATCHED` and the `rod` variable.
   - Change the banner to "N of M {components} match your build and are highlighted below."
   - Change the badge to "Fits build".

**Pitfall:** the hooks stay above the early `return <NotFound />`, and `component` can be undefined there, so guard `hasOtherParts`.

**Verify:**
- A 5X leader selected: the tippet page highlights 5X and 6X only.
- A 3X tippet selected: no 5X leader is highlighted. The three leaders with no X-size can still be highlighted, because `LEADER_TIPPET_SIZE` skips them.
- A line selected with no rod: the rod and reel pages highlight.
- A `both` rod with a salt line: `fresh` reels aren't highlighted.
- Only a rod selected: the rod page shows no highlights, and the other pages do.

**Commit:** `feat(builder): highlight parts that fit the whole build`

## Task B.3 — Remove the old rules and open the PR

**Files:** `src/features/builder/utils/compatibility.ts` (delete), `src/features/builder/types/index.ts`, `src/features/builder/api/parts.ts`

Same as Task 2.4 in the earlier plan:

1. Delete `utils/compatibility.ts`.
2. Remove `lineWeight` and `lineWeightRange` from `Part`, and stop setting them in `parts.ts`. Keep the row fields; the spec columns still use them.

**Verify:**
- `grep -rn "fitsRod\|NON_TROUT" src` finds nothing.
- `pnpm build` passes.
- Full browser pass with a fresh rod, a salt rod and a `both` rod, checking results against the spec.

**Commit:** `refactor(builder): remove client-side compatibility rules`
**Open the frontend PR,** based on `api-compatibility-fit`. It needs the FastAPI server running.

---

# Not in this plan

- **Avid Trout-Gold 7-wt head weight:** still needs checking against the product listing.
- **The questionnaire:** its own spec. The `water` parameter is ready for it.
- **Express cutover:** still its own PR.
- **Redefining compatible:** the team expects to revisit this. After this plan, that means changing `check_build`.
