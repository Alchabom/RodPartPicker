# Setup Questionnaire — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-11-11-questionnaire-design.md`
**Branch:** `questionnaire` (from `main`)
**Date:** 2026-11-11

**How this plan works:** tasks that add behaviour are test first. Snippets appear only where a detail is easy to get wrong; they are not finished code.

**After every API task:** run `uv run ruff check . && uv run ruff format --check . && uv run pytest` (from `api/`), review, then commit.

**After every frontend task:** run `pnpm exec tsc -b && pnpm lint`, review, then commit.

**Staging:** stage files by name, never with `git add -A` or `git add .`.

---

# Phase A — API

## Task A.0 — Commit this plan

**Commit:** `docs: add setup questionnaire plan`

## Task A.1 — The pick table (test first)

**Files:** `api/app/questionnaire/__init__.py`, `api/app/questionnaire/rules.py`, `api/tests/test_questionnaire_rules.py`

The rules are pure Python and don't touch the database, so these tests run without a client.

1. **Types:**
   ```python
   Experience = Literal["low", "medium", "high"]
   Budget = Literal["low", "medium", "high"]

   @dataclass(frozen=True)
   class Answers:
       experience: Experience
       trout: bool
       only_rod: bool
       budget: Budget

   @dataclass(frozen=True)
   class Pick:
       component: Literal["rod", "reel", "line", "leader", "tippet"]
       key: dict  # natural key, see below
       reason: str
   ```
   `place` isn't part of `Answers`, because the schema only allows `small_creeks`. Add it to `Answers` when a second place is supported.
2. **Tests:**
   - `recommend(answers)` returns five picks, one per component, in order rod, reel, line, leader, tippet, each with a non-empty reason. Parametrize over all 36 answer combinations (`itertools.product`).
   - The tables in the spec, one test per row (6 rows), checking each rod, reel and line key.
   - High experience + high budget + not only rod gives `R8 Core 486-4`. Low and medium experience with the same answers give `Classic R8 486-4`.
   - Every combination gives the same leader and tippet keys (7.5' 5X Powerflex Plus Trout Leader 3-pack, Powerflex Plus 5X).
   - `trout=False` adds the panfish and small bass note to the rod reason; `trout=True` doesn't.
   - Medium budget: the rod or reel reason says the budget went to the reel and line.
   - The R8 Core 486 line reason mentions a heavier line.
   - Not only rod: the tippet reason mentions 4X for bigger fish.
3. **Natural keys**, matching the catalog's unique columns:
   - rod: `brand`, `name`, `line_weight`, `length_in`
   - reel: `brand`, `name`, `min_line_weight`, `max_line_weight`
   - line: `brand`, `name`, `line_weight`
   - leader: `brand`, `name`, `length_ft`, `x_size`, `pack_count`
   - tippet: `brand`, `name`, `x_size`
4. **The picks**, with names exactly as seeded:

   | | Rod | Reel | Line |
   |---|---|---|---|
   | 3wt, low | Redington `Classic Trout 376-4` (3, 90) | Lamson `Liquid S` (2, 4) | RIO `Avid Trout-Gold` 3 |
   | 3wt, medium | Redington `Classic Trout 376-4` | Lamson `Guru X` (2, 4) | RIO `Avid Trout-Gold` 3 |
   | 3wt, high | Sage `Classic R8 380-4` (3, 96) | Lamson `Litespeed F (sealed)` (2, 4) | RIO `Avid Trout-Gold` 3 |
   | 4wt, low | Redington `Classic Trout 486-4` (4, 102) | Lamson `Liquid S` (2, 4) | RIO `Avid Trout-Gold` 4 |
   | 4wt, medium | Redington `Classic Trout 486-4` | Lamson `Guru X` (2, 4) | RIO `Elite Gold` 4 |
   | 4wt, high | Sage `Classic R8 486-4` (4, 102); high experience: Sage `R8 Core 486-4` (4, 102) | Lamson `Litespeed F (sealed)` (2, 4) | RIO `Elite Gold` 4 |

   Leader: RIO `Powerflex Plus Trout Leader`, `Decimal("7.5")`, `5X`, pack of 3. Tippet: RIO `Powerflex Plus`, `5X`.
5. **Reasons:** one short sentence or two per part, in a fly-shop voice. Base text by part and budget, then the experience-, trout- and only-rod-specific sentences from the spec.

**Pitfalls:**
- `length_ft` is a `DECIMAL`, so compare it with `Decimal("7.5")`, not `7.5`.
- Keep the reason strings next to their picks in one table, not spread across `if` branches. Wording changes should be one-line edits.

**Commit:** `feat(api): add questionnaire pick rules`

## Task A.2 — `GET /api/questionnaire/recommend` (test first)

**Files:** `api/app/questionnaire/schemas.py`, `api/app/questionnaire/router.py`, `api/app/main.py`, `api/tests/test_questionnaire.py`

These tests use the migrated test database, which already holds the seeded catalog, so the picks resolve to real rows.

1. **Tests:**
   - All 36 combinations return 200 and five parts. Each `part_id` exists in its table (`db.get(Model, part_id)`), and each reason is non-empty.
   - **Consistency:** for all 36, `GET /api/compatibility/check` with the returned IDs (`rodId`, `reelId`, `flyLineId`, `leaderId`, `tippetId`) returns no warnings.
   - Spot check: low experience, trout, only rod, low budget returns the `Classic Trout 376-4` rod's ID.
   - `place=large_rivers` returns 422, as does a missing `budget` or `experience=expert`.
   - A pick missing from the catalog returns 500. Monkeypatch one rod key to a name that doesn't exist.
2. **Schemas:** `RecommendedPart` (`component`, `part_id: int`, `reason: str`) and `Recommendation` (`parts: list[RecommendedPart]`). Also an `AnswersQuery` model with `experience`, `place: Literal["small_creeks"]`, `trout: bool`, `only_rod: bool` and `budget`. `only_rod` takes the alias `onlyRod`, matching the camelCase query names in `compatibility`.
3. **Router:** `router = APIRouter(prefix="/questionnaire", tags=["questionnaire"])`. Take the answers with `Annotated[AnswersQuery, Query()]`. For each pick, build a `select` that joins `Brand` (and `XSize` for leaders and tippets) and filters on the key. `scalar_one_or_none()`; if it's `None`, log the missing key and raise `HTTPException(500, "Recommended part is missing from the catalog")`.
4. Register the router in `app/main.py` next to the others.

**Pitfalls:**
- FastAPI parses `true`/`false` (and `1`/`0`) into `bool`, so the frontend must send those, not `yes`/`no`.
- Use `scalar_one_or_none()`, not `first()`. If a key ever matches two rows, the error should surface in tests, not silently pick one.
- The origin check applies only to write methods, so this GET needs no `Origin` header in tests.

**Verify:** by hand in `/docs`, low experience + only rod + low budget returns the Redington 376.
**Commit:** `feat(api): recommend a small-creek setup`

---

# Phase B — Frontend (all in `src/features/builder/`)

## Task B.1 — shadcn `Dialog`

**Files:** `src/components/ui/dialog.tsx` (generated), `package.json` and `pnpm-lock.yaml` if the CLI changes them

1. `pnpm dlx shadcn@latest add dialog`. The project uses the `radix-nova` style and already depends on `radix-ui`, so it should add no packages.
2. Read the generated file. Leave it as generated, like the other `ui/` files.

**Commit:** `feat(ui): add the shadcn dialog`

## Task B.2 — Reasons in the build state

**Files:** `hooks/buildContext.ts`, `hooks/BuildProvider.tsx`, `types/index.ts`

1. Add `export type BuildNotes = Partial<Record<ComponentType, string>>` and `RecommendedPart { component: ComponentType; partId: Part['id']; reason: string }` to `types/index.ts`.
2. `BuildContextValue` gains `notes: BuildNotes` and `loadRecommendation: (parts: RecommendedPart[]) => void`.
3. `BuildProvider`:
   - A second state, `notes`, loaded from and saved to `rpp:notes:v1` the same way as the build, with the same `try`/`catch`. When loading, keep only entries whose key is a component type and whose value is a string.
   - `selectPart` and `removePart` also delete that component's note. `clearBuild` also clears `notes`.
   - `loadRecommendation` sets the build and notes to exactly the given parts, replacing both.

**Pitfalls:**
- `selectPart` drops the note even when the same part is picked again. That's fine, and simpler than comparing IDs.
- Don't add `useMemo`/`useCallback`; the React Compiler handles it.

**Commit:** `feat(builder): keep a reason for each part in the build`

## Task B.3 — API client and question data

**Files:** `api/questionnaire.ts`, `utils/questions.ts`

1. `api/questionnaire.ts`:
   ```ts
   export interface Answers {
     experience: Level
     place: 'small_creeks'
     trout: boolean
     onlyRod: boolean
     budget: Level
   }
   export async function getRecommendation(answers: Answers, signal?: AbortSignal): Promise<RecommendedPart[]>
   ```
   Build the query with `URLSearchParams` (booleans as `'true'`/`'false'`). Map each part to `partId: \`${component}-${part_id}\``.
2. `utils/questions.ts`: the five questions as data, with each question's `id`, its `title`, an optional `reaction` line shown above it, and its `options` (`value`, `label`, optional `description`, optional `comingSoon`). Use the wording from the spec's question table. The four unsupported places have `comingSoon: true`.

**Commit:** `feat(builder): add questionnaire questions and API client`

## Task B.4 — `QuestionnaireDialog`

**Files:** `components/QuestionnaireDialog.tsx`

1. Props: `open`, `onOpenChange`.
2. State: `step` (0-4), `answers` (partial), and `status` (`'asking' | 'loading' | 'error'`). Reset all three whenever the dialog opens.
3. Each screen shows the step counter ("2 of 5"), the reaction line, the title and the options as full-width outline buttons with the label and description. `comingSoon` options are disabled and show a "Coming soon" badge. Picking an option stores the answer and moves to the next step. Back is hidden on step 0.
4. After the last answer: `status = 'loading'` ("Building your setup…"), then `getRecommendation`. On success, call `loadRecommendation` and `onOpenChange(false)`. On failure, `status = 'error'` with "Couldn't get a recommendation" and a Try again button that retries with the same answers.
5. Cancel the request with an `AbortController` if the dialog closes while loading, and don't set state after an abort (the same pattern as `BuilderPage`'s check).

**Pitfalls:**
- The trout answer is stored as a boolean, but the options are data; map `'yes'`/`'no'` to `true`/`false` in one place.
- Give the dialog a `DialogTitle` on every screen (Radix warns without one). The question title can be it.

**Commit:** `feat(builder): add the setup questionnaire dialog`

## Task B.5 — Button and reasons on the Builder page

**Files:** `components/BuilderPage.tsx`, `components/ComponentRow.tsx`

1. `BuilderPage`: add a **"Click here to get a setup tailored to you"** button (default variant, with a `Sparkles` icon) next to Clear build. On click, `clearBuild()` then open the dialog. On narrow screens the header buttons should wrap rather than overflow.
2. `ComponentRow`: read `notes` from `useBuild()`. When the row has a part and a note, show `Why: {note}` under the subtitle in `text-xs text-muted-foreground`, limited to a readable width (`max-w-prose`).

**Commit:** `feat(builder): open the questionnaire from the Builder page`

## Task B.6 — Run it

Start the API and `pnpm dev`, and check by hand:

1. Low experience, trout, only rod, low budget: the Redington 376, Liquid S, Avid Trout-Gold 3wt, the leader and 5X tippet load, each with a reason, and no "Check your build" warning.
2. High experience, no trout, other water too, high budget: the R8 Core 486 with the heavier-line note, and the panfish note.
3. Change the reel: its reason disappears, the others stay. Refresh: the reasons survive. Clear build: all reasons disappear.
4. Stop the API, run the questionnaire: the error and Try again show. Start the API, Try again works.
5. Close the dialog halfway: the build stays empty.
6. Phone width: the dialog and the header buttons fit without horizontal scroll.

Fix anything found, committing each fix separately.

## Task B.7 — Docs and PR

**Files:** `README.md`

1. Replace the README's "A questionnaire … is planned" sentence with a short description of what it does now, and that only small creeks is supported.
2. Push `questionnaire` and open a PR into `main`. In the description, list the catalog gaps from the spec (no mid-priced short rods, one 3wt line, only 5X leaders), so whoever adds rods knows the picks to revisit.

**Commit:** `docs: describe the setup questionnaire`
**Open the PR.**
