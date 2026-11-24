# Step Layout — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-11-23-step-layout-design.md` (approved)
**Branch:** `oa-questionnaire-button` (stacked on `oa-large-rivers`, PR #63; wait for Omar's approval of #63 before opening this PR)
**Date:** 2026-11-23

**How this plan works:** behaviour tasks are test first. Snippets appear only where a detail is easy to get wrong; they are not finished code.

**After every task:** run `pnpm exec tsc -b && pnpm lint && pnpm test`, review, then commit. Stage files by name, never `git add -A` (`.env.example` has an unrelated local edit).

**Two notes found while planning:**

- `BuildSteps` is also rendered by `RigSummary` (`current="summary"`), and the spec leaves the summary unchanged, so `BuildSteps` stays for the summary. Only the steps drop it. `BrandChips` has no other user and is removed.
- `BuildSteps` shows a part that no longer fits as a red ring (`useBuildCheck().flags`). `RigColumn` keeps that: a flagged row gets the `negative` marker and screen-reader text "(doesn't fit)", so nothing is lost.

---

## Task 0 — Commit this plan

**Commit:** `docs: add step layout plan`

## Task 1 — Next-step helper (test first)

**Files:** `src/features/builder/utils/steps.ts`, `utils/steps.test.ts` (new or extended), `hooks/useChoose.ts`, `hooks/useChoose.test.tsx`.

1. `nextAction(build, from, getPart)` in `utils/steps.ts`, built on `nextStep`, returning `{ target: ComponentType | 'summary', label: string }`:
   - target: `nextStep(live, from)` where `live` drops ids the catalog no longer has (the filter `useChoose` does today).
   - label: `'Review rig'` when the target is the summary; otherwise `Next: line` if `live[from]` is set, else `Skip to line` (component label lower-cased).
2. `useChoose(type)` stops navigating: it only calls `selectPart`. Rename is not needed; update its doc comment.
3. Tests: labels and targets for a filled step, an empty step, a skipped earlier step (loops back), all five picked (Review rig), and a removed catalog part counting as empty. `useChoose.test.tsx`: Choose selects and does not navigate.

**Commit:** `feat(web): Choose stays on the step; next-step label and target`

## Task 2 — `BrandRail` (test first)

**Files:** `components/BrandRail.tsx`, `components/BrandRail.test.tsx`; delete `BrandChips.tsx` once Tasks 4–5 stop importing it (Task 5).

- Same props and link logic as `BrandChips` (`to(id)` keeps other search params, `replace`, `aria-current="page"`, hidden when `brands.length < 2`).
- `lg` and up: `<nav aria-label="Brands">` with a vertical list. Below `lg`: a labelled native `<select>` ("Brand") that calls `navigate(to(id), { replace: true })`. Render both and toggle with `hidden lg:block` / `lg:hidden` so each test can query its own.
- Tests: links keep other params; active link is marked; hidden for one brand; the select changes `?brand=`.

**Commit:** `feat(web): brand rail for builder steps`

## Task 3 — `RigColumn` (test first)

**Files:** `components/RigColumn.tsx`, `components/RigColumn.test.tsx`.

- Props: `current: ComponentType`.
- Uses `useBuild` (`build`, `basePath`, `removePart`), `useCatalog`, `useBuildCheck` (flags), `nextAction`.
- `lg` and up (`sticky top-20`, adjust to the site header height):
  - `<nav aria-label="Your rig"><ol>` of the five steps. Each row: a link to `${basePath}/${type}` (disabled `span` with "(pick a rod first)" when there's no rod and it isn't the rod, as in `BuildSteps`), label, short name or "—", `aria-current="step"` on `current`, flagged marker. Filled rows get a quiet icon button `aria-label="Remove reel"`; after removing, focus that row's link (keep refs by type).
  - Next button (primary) from `nextAction(build, current, getPart)`: navigates to `basePath` or `${basePath}/${target}`.
  - **Review rig** link to `basePath` with the total (`formatPrice`, sum of picked parts' prices, as `RigSummary` computes it).
  - A visually hidden `aria-live="polite"` region that announces "Reel: Lamson Liquid S" when `build[current]` changes after mount (not on first render).
- Below `lg`: a one-row bar of five small links (current underlined, filled ones with a check icon, no remove) and a fixed bottom Next bar (`fixed inset-x-0 bottom-0`, page gets `pb-20` on small screens).
- Tests: five rows and total; later steps disabled without a rod; `aria-current` on the current step; Remove calls `removePart` and focuses the link; Next label/target for filled and empty steps; flagged row has "(doesn't fit)"; the live region announces a new pick.

**Commit:** `feat(web): rig column with remove, next and review`

## Task 4 — `StepLayout`, and `PartStep` on it

**Files:** `components/StepLayout.tsx`, `components/PartStep.tsx`, `components/PartStep.test.tsx`, `components/PartGroups.tsx`.

1. `StepLayout({ current, title, matchedTo, brands, brand, children })`:
   - `<main className="mx-auto w-full max-w-6xl px-4 py-8 pb-24 lg:pb-8">`, `BuildHeader`, then a grid `lg:grid-cols-[15rem_1fr] lg:gap-10`.
   - Left: `RigColumn` then `BrandRail` (wrapped so the pair is sticky together on `lg`).
   - Right: heading line (`h1`, "Matched to …" under it; on the right "Not sure?" + `<Button size="sm">Help me choose</Button>` opening `QuestionnaireDialog`, `onRigged` → `navigate(basePath)`), then `children`.
   - The questionnaire state lives here, so every step gets it.
2. `PartStep` renders `StepLayout` + `PartGroups`. Remove the "Your …: Remove" line, Back and Skip links, `BuildSteps` and `BrandChips` imports.
3. `PartGroups` rows become a grid: `grid-cols-[auto_minmax(0,1.6fr)_repeat(var(--spec-cols),minmax(0,1fr))_auto_auto]` on `sm` and up (set `--spec-cols` from the component's columns), stacked below `sm`. Spec columns per the spec's table, chosen per component (a small map next to `PartGroups`, not `specColumns`, which the summary also uses). Each cell has an `sr-only` label. Selected button: `aria-disabled="true"` and a no-op click instead of `disabled`.
4. Tests (`PartStep.test.tsx`): Choose marks Selected, stays on the page (route unchanged) and keeps focus; reel rows show line weight and water; Help me choose opens the dialog; brand rail filters. Update tests that expected navigation after Choose.

**Commit:** `feat(web): steps share a layout with the rig column and spec columns`

## Task 5 — `RodStep` on the layout

**Files:** `components/RodStep.tsx`, `components/RodStep.test.tsx`, `components/RodSeriesRow.tsx`; delete `components/BrandChips.tsx`.

- `RodStep` renders `StepLayout` (title "Choose a rod", the `needsRod` status note under it) with the series rows. Drop the questionnaire panel and "Answer 5 questions" button (now in `StepLayout`), the picked line, `BuildSteps`, `BrandChips`.
- `RodSeriesRow`: Selected uses `aria-disabled` like `PartGroups`.
- Tests: choosing a size stays on `/builder/rod`; the rig column's Next reads "Next: reel" and goes to `/builder/reel`; the needs-rod note still shows; replace the panel test with a Help me choose test.

**Commit:** `feat(web): rod step on the shared layout`

## Task 6 — Questionnaire replaces the build only when finished (test first)

**Files:** `components/QuestionnaireDialog.tsx`, `QuestionnaireDialog.test.tsx`, `components/RigSummary.tsx`, `RigSummary.test.tsx`.

- First question shows "Your answers replace your current build." (a `DialogDescription` under the counter on step 0 only).
- Nothing calls `clearBuild` before opening: remove it from `StepLayout`'s trigger (never added) and from **Retake the questions** in `RigSummary`. `loadRecommendation` already replaces all five parts and notes.
- Tests: the note shows on question 1; closing early leaves the build (`clearBuild` and `loadRecommendation` not called); finishing calls `loadRecommendation`; Retake no longer calls `clearBuild`.

**Commit:** `feat(web): the questionnaire replaces the build when it finishes`

## Task 7 — Docs

- `CLAUDE.md`: in the guided builder paragraph, say Choose stays on the step and Next moves on; the left column is `RigColumn` + `BrandRail`.
- Mark the spec's status approved.

**Commit:** `docs: step layout`

## Verification

1. `pnpm test && npm run build && npm run lint && pnpm check:contrast`.
2. Manual, with `pnpm dev` and the API (dev DB already has 028–029):
   - Desktop: rod → choose a size (stays, Selected, rig column updates) → Next: reel → choose → change your mind → Remove from the rig column → Skip to line → Review rig.
   - Scroll a long list: the rig column and Next stay in view.
   - Help me choose: close halfway (build unchanged); finish (build replaced, lands on summary).
   - 390px: compact rig row, brand select, bottom Next bar not covering the last row.
   - Keyboard only: tab through the rig column, Choose keeps focus, Remove moves focus.
3. Open the PR to `main` after #63 merges (rebase onto main first), with the usual description and attribution.
