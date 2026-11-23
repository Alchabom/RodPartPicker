# Step layout design (UX polish sub-project 5)

Date: 2026-11-23 · Branch: `oa-questionnaire-button` (stacked on `oa-large-rivers`, PR #63) · Status: draft, awaiting review

## Purpose

The guided builder (`2026-11-22-guided-builder-design.md`) fixed the old table's info
dumping, but picking a part now feels clunky:

- Every **Choose** jumps to a new page, so you lose sight of your rig and can't change your
  mind on the same screen.
- Once a rod is picked, it's hard to get back to it or to any other step.
- Each new page opens with a progress bar, a heading, a "Your reel" line and brand chips
  above the list, so you scroll down after every pick.
- Part rows leave a wide empty gap between the photo and the price, while the specs are
  squeezed into one line.
- The questionnaire prompt (a full-width panel since `711e8e6`) sits above the rods, so
  you scroll past it every time.

Success: on every step you can see your whole rig, filter by brand from the side, compare
parts by their specs in columns, choose (and re-choose) without leaving the page, and move
on with one always-visible button. The list starts near the top of the screen.

Chosen in the visual companion as option C ("left column: your rig, then brands; Choose
stays on the page").

## Scope

- All five steps (`/builder/rod` … `/builder/tippet`, and the same under `/builder/:buildId`).
- The questionnaire's trigger and when it replaces the build, on the steps and on the
  summary's **Retake the questions**.
- Not changing: the summary page's layout, saved-build autosave, the fit groups (Fits your
  rig / One weight up / Doesn't fit), old-link redirects, the "pick a rod first" redirect and
  its note, and the API.

## Layout

```
┌──────────────────────── max-w-6xl ───────────────────────────────┐
│ [saved build name + Saving…]   (saved builds only, as now)       │
│ ┌ left column, sticky ┐  Choose a reel        Not sure? [Help me choose]
│ │ Your rig            │  Matched to your Sage R8 Core 590-4 · 5 wt│
│ │  Rod    R8 Core 590 │  Fits your rig (12)                      │
│ │ ▸Reel   —           │  [img] Liquid S   4–6 wt  Freshwater  $159 [Choose]
│ │  Line   —           │  [img] Remix S…   4–6 wt  Fresh + salt $269 [Choose]
│ │  Leader —           │  ▸ Doesn't fit your rig (3)              │
│ │  Tippet —           │                                          │
│ │ [Next: line]        │                                          │
│ │  Review rig · $1,259│                                          │
│ │ Brand               │                                          │
│ │  All brands         │                                          │
│ │  Lamson             │                                          │
│ │  Orvis              │                                          │
│ └─────────────────────┘                                          │
└──────────────────────────────────────────────────────────────────┘
```

A shared `StepLayout` frames every step, replacing the header, progress bar and links that
`RodStep` and `PartStep` each render today. Content is left aligned. The left column is
about 15rem wide and `position: sticky` below the site header; the list fills the rest.

### Left column

- **`RigColumn`** (new, replaces `BuildSteps`): `<nav aria-label="Your rig">` listing rod,
  reel, line, leader and tippet in order. Each row shows the part's short name (brand +
  model) or "—", links to its step, and has `aria-current="step"` when it's the step you're
  on. The steps after the rod are disabled until there's a rod, as in `BuildSteps` today
  (with the same "(pick a rod first)" screen-reader text). Each filled row has a small
  remove button named "Remove reel" (etc.).
- Under the parts: the **Next** button (see Behaviour), then **Review rig** with the running
  total, which goes to the summary (`basePath`).
- **`BrandRail`** (new, replaces `BrandChips`): `<nav aria-label="Brands">` with **All
  brands** and one link per brand, the same `?brand=` links (`replace`, `aria-current="page"`
  on the active one). Hidden when a part comes in only one brand, as now.

### Main column

- **Heading line:** `h1` "Choose a …", and under it "Matched to your …" (as now, from
  `MATCHED_TO`). On the right of the same line: muted "Not sure?" and a small primary
  (orange) button **Help me choose**, on every step. It replaces the full-width panel and
  the "Answer 5 questions" button from `711e8e6`/`89f9e95`.
- **Part rows** (`PartGroups`): a CSS grid so columns line up down the list: photo, name
  (with brand under it, and the **Best match** badge as now), the component's spec
  columns, price, Choose. The spec columns, from `COMPONENTS[].specColumns`:

  | Step | Columns |
  |---|---|
  | Reel | Line Wt, Water |
  | Line | Line Wt, Type, Head (gr) |
  | Leader | Length, X-Size, Test (lb) |
  | Tippet | X-Size, Material, Test (lb) |

  Each column has a visually hidden label for screen readers ("Line weight: 4–6 wt").
- **Rod step:** the same frame. The series rows stay as they are (open a series to see its
  size table), and the brand chips move to the rail.
- **Removed:** the five-ring progress bar, the "Your reel: … Remove" line, the **Back to …**
  link and **Skip for now** (the rig column and Next replace them).

## Behaviour

### Choose stays on the page

- **Choose** calls `selectPart` and nothing else: no navigation, no scroll. `useChoose` stops
  navigating.
- The chosen row's button reads **Selected** with a check, and is `aria-disabled` (not
  `disabled`) so keyboard focus stays on it.
- The rig column's row updates, and a polite live region in the column announces
  "Reel: Lamson Liquid S".
- Choosing another part in the same step replaces it. Rod sizes in the series tables work
  the same way.

### Next

- Lives in the sticky rig column, so it's always on screen.
- Label: **Next: line** when this step has a part, **Skip to line** when it doesn't. When
  the next destination is the summary, **Review rig**.
- Destination: the existing rule (`nextStep` in `utils/steps.ts`, used by `useChoose`
  today): the next empty step, looping back to any skipped, then the summary. A part the
  catalog no longer has counts as empty, as now.
- The new step opens at the top (`ScrollManager`); the one-line heading keeps the list high.

### Remove

- The rig column's remove button calls `removePart(type)`. Focus moves to that row's link.
- Removing the rod disables the later steps' links, as today. On a later step, the existing
  `StepPage` redirect sends you to the rod step with its note.

### Help me choose

- Opens the questionnaire dialog. It no longer clears the build on click.
- The first question shows a short note: "Your answers replace your current build."
- When the recommendation loads, `loadRecommendation` replaces all five parts and their
  reasons (as now), and you land on the summary. Closing the dialog early leaves the build
  as it was.
- **Retake the questions** on the summary follows the same rule: no clear on click.

## Phones (below the `lg` breakpoint)

- The left column folds into a compact bar under the heading:
  - **Rig:** one row of five small links (same targets), the current one underlined, filled
    steps marked with a check. Remove lives on the summary on phones.
  - **Brand:** a native `<select>` labelled "Brand" instead of the list.
- **Next** becomes a bar fixed to the bottom of the screen, so it's in thumb reach without
  scrolling. The page gets bottom padding so the bar never covers the last row.
- Part rows: the spec columns stack under the name; price and Choose stay on the right.

## Accessibility

- Landmarks: "Your rig" and "Brands" navs; one `h1` per step; the fit groups keep their `h2`s.
- Live region announces each pick; remove buttons are named per part; focus is kept on
  Choose → Selected and moved to the row link after Remove.
- All new controls use the standard focus ring. No new motion apart from the existing
  chevron.
- Contrast: only existing tokens (`ink`, `ink-2`, `hairline`, `stone-card`, `primary`), so
  `pnpm check:contrast` stays green.

## Components and files (`src/features/builder`)

- New: `components/StepLayout.tsx`, `components/RigColumn.tsx`, `components/BrandRail.tsx`.
- Changed: `RodStep.tsx`, `PartStep.tsx`, `PartGroups.tsx` (grid rows), `RodSeriesRow.tsx`
  (Selected stays focusable), `QuestionnaireDialog.tsx` (note, no clear),
  `RigSummary.tsx` (Retake doesn't clear), `hooks/useChoose.ts` (no navigation; a
  `useNextStep` helper gives Next's label and target).
- Removed: `BuildSteps.tsx` and `BrandChips.tsx` with their tests, once nothing imports them.

## Testing (Vitest)

- `RigColumn`: lists the five parts and total; later steps disabled until there's a rod;
  current step marked; Remove clears a part and moves focus; Next's label and target follow
  the next-empty-step rule (including Skip and Review rig).
- `BrandRail`: links keep other search params; hidden for one brand; `<select>` on phones
  changes `?brand=`.
- `PartStep`: Choose marks Selected, stays on the page and announces the pick; spec columns
  per component; Help me choose opens the dialog without clearing.
- `RodStep`: choosing a size stays on the page; Next goes to the reel step.
- `QuestionnaireDialog`: shows the replace note; closing early leaves the build; finishing
  loads the recommendation and lands on the summary.
- Updated: tests that expected Choose to navigate; `BuildSteps.test.tsx` replaced.
- Before the PR: `pnpm test`, `npm run build`, `npm run lint`, `pnpm check:contrast`, and a
  browser pass at desktop and 390px.
