# Large Rivers Questionnaire — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-11-23-large-rivers-questionnaire-design.md` (approved)
**Branch:** `oa-large-rivers` (spec committed as `cdc52ce`)
**Date:** 2026-11-23

## Context

The setup questionnaire only supports small creeks. This adds **Large rivers**: a target →
flies follow-up that sets rod weight and line type (trout 5/6/7wt, smallmouth 7/8wt, musky
10wt with three line types), with experience picking rod action and budget picking the tier.
The catalog lacks musky lines, a freshwater streamer sink tip, heavier trout leaders and any
bite protection, so real products are added, and `tippets.x_size_id` becomes nullable for a
wire bite tippet.

**Correction to the spec (found while planning):** `check_build` warns `ROD_LEADER_WEIGHT`
when a leader ≥ 10 lb (`HEAVY_LEADER_LB`) is on a rod under 7wt. A 9' 2X leader (~11 lb) on
the 6wt trout-streamer rig would warn, so that rig uses a **9' 3X Powerflex Plus leader +
Powerflex Strong 3X tippet** instead. Task 0 updates the spec. New products become: 9' 3X and
9' 0X Powerflex Plus leaders.

**How this plan works:** behaviour tasks are test first. After every API task run
`uv run ruff check . && uv run ruff format --check . && uv run pytest` in `api/`
(`test_build_refuses_control_chars_in_file_name` always fails on Windows); after every
frontend task run `pnpm exec tsc -b && pnpm lint && pnpm test`. Stage files by name, never
`git add -A` (`.env.example` has an unrelated local edit). Commit after each task.

---

## Task 0 — Commit this plan, fix the spec

- Copy this plan to `docs/superpowers/plans/2026-11-23-large-rivers-questionnaire-plan.md`.
- Spec: 2X → 3X for trout small/medium streamers (leader/tippet table and new-products table),
  with a one-line note on the heavy-leader rule.
- Commit: `docs: add large rivers questionnaire plan`

## Phase A — Data

### Task A.1 — Nullable tippet X size (test first)

**Files:** `api/migrations/028_nullable_tippet_x_size.sql`, `api/app/parts/models.py`,
`api/app/parts/schemas.py`, `api/app/parts/router.py`, `api/app/compatibility/rules.py`,
`api/app/compatibility/router.py` (check only), tests.

- Migration: `ALTER TABLE tippets MODIFY x_size_id TINYINT UNSIGNED NULL;` (mirror the leader
  line in `010_allow_unknown_specs.sql`; keep the FK and `uq_tippets`).
- `Tippet.x_size_id: Mapped[int | None]`, `x_size: Mapped[XSize | None]` (copy `Leader`, models.py:100-105).
- `TippetOut.x_size: str | None` (copy `LeaderOut`, schemas.py:70).
- `list_tippets`: `.outerjoin(Tippet.x_size)` and order NULL sizes last (copy `list_leaders`).
- `rules.tippet_suits_leader`: return True when `tippet.x_size_id is None`;
  `is_light_tippet_for_rod`: False when None.
- Tests: compatibility unit tests for a no-size tippet (suits a 5X leader; not light on a
  10wt); a parts-route test that a no-size tippet lists with `xSize: null` (insert the row in
  the test's rolled-back session).

### Task A.2 — Seed the new products

**Files:** `api/migrations/029_large_river_parts.sql`, `docs/database/seed-data-notes.md`.

- Research exact models, specs, prices and purchase links on the web (header comment cites
  sources, as `023_powerflex_strong.sql` does):
  - Lines: RIO InTouch Streamertip 7wt (sink_tip, sink rate); RIO Elite Pike/Musky 10wt
    (floating); a 10wt intermediate sink tip; a 10wt heavy sink tip (sink rate). `type`
    `sink_tip`/`intermediate` rows need `sink_rate_ips` (`chk_fly_lines_sink`);
    `head_weight_grains` if published.
  - Leaders: RIO Powerflex Plus Trout Leader 9' 3X and 9' 0X (3-pack, strengths from RIO's chart).
  - Leader: heavy fluorocarbon musky leader (~6', 40–60 lb, `x_size_id` NULL).
  - Tippet: wire bite tippet (~30 lb, `x_size_id` NULL, spool yards).
- Water tags `fresh`, or `both` where the maker sells it for both; never `salt`.
- Insert with brand/x_size lookups by name (`SELECT id FROM brands WHERE name = ...`);
  add any missing brand first.
- If a product can't be confirmed, stop and ask the user for a substitute before writing it.
- Images: none now; the placeholder shows. Note in seed-data-notes that photos go in a later
  `part_details_*.csv` batch.
- Verify: `uv run python -m app.migrate` on the dev DB; `uv run pytest` (re-migrates the test DB).

## Phase B — API rules

### Task B.1 — Split `rules.py` into a package (no behaviour change)

**Files:** `api/app/questionnaire/rules/{__init__,common,creeks}.py`, delete `rules.py`.

- `common.py`: `Level`, `Component`, `Pick`, `_join`.
- `creeks.py`: current rules moved verbatim; `Answers` → `CreekAnswers`.
- `__init__.py`: re-export so `rules.recommend`, `rules.Pick`, etc. keep working;
  `recommend(answers)` dispatches on type (rivers added in B.2).
- Update imports in `schemas.py`, `router.py`, `tests/test_questionnaire_rules.py`
  (`Answers` → `CreekAnswers`). Existing tests must pass unchanged otherwise.

### Task B.2 — River picks (test first)

**Files:** `api/app/questionnaire/rules/rivers.py`, `rules/__init__.py`,
`api/tests/test_questionnaire_rules.py`.

- Types: `Target = Literal["trout","smallmouth","predators"]`,
  `Flies = Literal[...]`, `FLIES_BY_TARGET: dict[Target, tuple[Flies, ...]]` (single source for
  valid pairs, reused by the schema), `RiverAnswers(experience, target, flies, budget)`.
- Tables as data: `(target, flies) → (weight, line_kind)`; `RODS[(weight, budget)] →
  (medium_rod, fast_rod | None)`; `REELS[(band, budget)]`; lines; `LEADERS[(target, flies)]`.
  Natural keys use the `_rod/_reel/_line` helper shape from creeks (rod keys include
  `length_in=108`; note Lamson's rod name is lowercase `liquid` / `liquid max`).
- `fast = experience == "high" and fast_rod is not None`; fast + floating Gold line adds the
  heavier-line note.
- Reasons: one string per pick in the creek style (weight for target/flies, line type for
  flies, budget upgrade, experience wording for rod action; musky leader/wire explains teeth).
- Tests: all 72 combinations give five picks in order with non-empty reasons; one test per
  rod-weight row of the spec table; spot checks (trout+dries → 5wt + 9' 5X leader/5X tippet;
  trout+small streamers → 6wt + 3X/3X; trout+large streamers → 7wt Streamertip + SA streamer
  leader + 3X; predators+unweighted → heavy sink tip + wire; high exp + medium budget + 5wt →
  EDC 590-4; low exp + high budget + 7wt → R8 Core 790-4).

### Task B.3 — Schema, router and `_find` (test first)

**Files:** `api/app/questionnaire/schemas.py`, `router.py`, `api/tests/test_questionnaire.py`.

- `AnswersQuery`: `place: Literal["small_creeks","large_rivers"]`; optional `trout`,
  `only_rod`, `target`, `flies`; `model_validator(mode="after")` enforcing the per-place fields
  and `flies in FLIES_BY_TARGET[target]`, raising `ValueError` (FastAPI turns it into 422).
- `router.recommend`: build `CreekAnswers` or `RiverAnswers`.
- `_find`: for a key value of `None`, `where(column.is_(None))`; for `x_size: None`, filter
  `model.x_size_id.is_(None)` instead of joining `XSize`.
- Tests: parametrize all 72 river queries → real catalog rows and `check_build` with no
  warnings (reuse the existing helpers at `test_questionnaire.py:49-64`); 422 for creeks +
  target, rivers + trout, smallmouth + unweighted, missing flies; the 36 creek tests unchanged.

## Phase C — Frontend (`src/features/builder`)

### Task C.1 — Tippets without an X size

**Files:** `api/parts.ts` (+ its test if present).
- `TippetRow.xSize: string | null`; `toTippet` uses `orNone(row.xSize)` like `toLeader`
  (parts.ts:135-152) and shows strength when present. Test: a null-size tippet maps without
  crashing and shows its strength.

### Task C.2 — Answers union and branching questions (test first)

**Files:** `api/questionnaire.ts`, `utils/questions.ts`, `components/QuestionnaireDialog.tsx`,
new `components/QuestionnaireDialog.test.tsx` (or `utils/questions.test.ts`).

- `Answers` discriminated by `place`; `getRecommendation` sends only that member's fields.
- `questions.ts`: `SHARED_QUESTIONS`, `FOLLOW_UPS: Record<Place, Question[]>`, `BUDGET`,
  `FLIES_BY_TARGET` (values match the API), `questionsFor(draft)` returning five questions
  (place unanswered → creek follow-ups as placeholder count). `Question.id` widens to the
  union's keys. Large rivers loses `comingSoon`. Wording from the spec.
- Dialog: walk `questionsFor(draft)`; on answer, drop every key after the current step;
  `toAnswers` builds the right member.
- Tests: picking Large rivers shows the target question; each target shows its flies options;
  Back + changing target clears flies; the final answer calls the API with the river query
  (mock `getRecommendation`); the creek path still sends `trout`/`onlyRod`.

### Task C.3 — Docs

- CLAUDE.md: the questionnaire note points to `app/questionnaire/rules/` (creeks and rivers).
- `api/README.md` / docs that mention `rules.py`, if any (grep).

## Verification

1. `cd api && uv run python -m app.migrate && uv run pytest` — all pass except the known
   Windows test.
2. `pnpm test && npm run build && npm run lint && pnpm check:contrast`.
3. Manual: `uv run fastapi dev app/main.py --port 3001` + `pnpm dev`; from the rod step open
   the questionnaire and run trout/dries/low, smallmouth/topwater/medium, musky/both/high.
   Each lands on the summary with five parts, reasons, no knots/warnings; the musky tippet
   shows "30 lb" style specs; Back-and-change clears the flies answer; creeks still works.
4. Open the PR to `main` with the usual description and attribution.
