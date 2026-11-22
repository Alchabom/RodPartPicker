# Guided Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the brand-first Builder table with guided steps: one part per screen in rig order, parts grouped by fit, progress rings, and a "Your rig is ready" summary that flags parts which no longer fit.

**Architecture:** The new pure helpers are `utils/steps.ts` (step order and "next empty step") and `utils/flags.ts` (warning → part). The step and summary components reuse the existing build providers, catalog, compatibility API, questionnaire, save and publish code. Routes become five static step paths per provider, plus an index that redirects to the rod step or shows the summary. Old `:component/:brand` links redirect.

**Tech Stack:** React 19, TypeScript, react-router, TanStack Query, Tailwind v4, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-22-guided-builder-design.md`

## Global Constraints

- Branch `oa-guided-builder` (off `main`). Never commit `skills-lock.json`, `.agents/skills/ui-taste/` or `.agents/skills/unslop/`.
- All new code lives in `src/features/builder`. Code outside the feature imports only from `@features/builder`.
- Rig order is `COMPONENTS` order: rod, reel, line, leader, tippet. Never hard-code a second copy.
- Copy, verbatim:
  - "Pick a rod first: everything else is matched to it."
  - "Not sure where to start? Answer 4 questions and we'll rig it for you."
  - "Fits your rig", "One weight up, for your fast rod", "Doesn't fit your rig", "Best match"
  - "Couldn't check what fits", "Couldn't check the rig"
  - "Your rig is ready", "Almost there", "<n> of 5 picked"
  - "Choose", "Selected", "Skip for now", "Back to <Part>", "Save this rig", "Start over", "Retake the questions"
- Tokens only: `belly`, `dorsal-band`, `negative`, `ink*`, `stone-*`, `hairline`. Don't use the deprecated alias block in new code.
- Nothing is ever removed from a build automatically. A failed compatibility call never blocks choosing.
- No `placeholderData` on compatibility queries.
- The React Compiler is on: no hand-written `useMemo`/`useCallback`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **`/builder?copy=<id>` with an empty draft.** The index must not redirect to the rod step while the copy intent runs (`CopyPublishedIntent` strips `?copy` right away). The fix: a mount-time `hadIntent` in Task 6. Tested there.
2. **A saved build whose id looks like a step** (`/builder/42` vs `/builder/rod`). The static step paths must win and `:buildId` must still match numbers. Tested in Task 6.
3. **Choosing the last empty step when an earlier one was skipped.** Choose must go back around to the skipped step, not straight to the summary. Tested in Task 1 and Task 3.
4. **The catalog has dropped a part an old saved build still references.** `getPart` returns undefined, so that step counts as empty and the summary shows "Choose", not a crash. Tested in Task 5.
5. **The questionnaire fails mid-way on the rod step.** The dialog shows its existing error, nothing is navigated, and the build stays cleared (as today). Tested in Task 4.

---

### Task 1: Step order and flags (pure helpers)

**Files:**
- Create: `src/features/builder/utils/steps.ts`, `src/features/builder/utils/flags.ts`
- Test: `src/features/builder/utils/steps.test.ts`, `src/features/builder/utils/flags.test.ts`

**Interfaces:**
- Produces (`steps.ts`):
  - `STEP_ORDER: ComponentType[]`, derived from `COMPONENTS`.
  - `nextStep(build: Build, from: ComponentType): ComponentType | 'summary'`: the first empty step after `from`, then goes back around to the first empty one before it; `'summary'` if none are empty. The caller passes the build *including* the part just chosen.
  - `stepAfter(type: ComponentType): ComponentType | 'summary'`: the next step in order (for Skip), `'summary'` after tippet.
  - `previousStep(type: ComponentType): ComponentType | undefined`
- Produces (`flags.ts`):
  - `interface BuildFlags { byPart: Partial<Record<ComponentType, string[]>>; buildWide: string[] }`
  - `flagsFromWarnings(warnings: BuildWarning[]): BuildFlags`
  - `NO_FLAGS: BuildFlags`

- [ ] **Step 1: Write the failing tests.**
  - `steps.test.ts`:
    - `nextStep({ rod: 'rod-1' }, 'rod')` → `'reel'`
    - `nextStep({ rod, reel, leader }, 'reel')` → `'line'`
    - `nextStep({ rod, reel, line, leader, tippet }, 'tippet')` → `'summary'`
    - **Going back around:** `nextStep({ rod, line, leader, tippet }, 'tippet')` → `'reel'`
    - `stepAfter('tippet')` → `'summary'`, and `stepAfter('reel')` → `'line'`
    - `previousStep('rod')` → `undefined`, and `previousStep('line')` → `'reel'`
  - `flags.test.ts`, each code maps as in the spec table:

    | Code | Expected |
    |---|---|
    | `ROD_REEL_WEIGHT` | `byPart.reel` |
    | `ROD_LINE_WEIGHT` | `byPart.line` |
    | `REEL_LINE_WEIGHT` | `byPart.line` |
    | `ROD_LEADER_WEIGHT` | `byPart.leader` |
    | `LEADER_TIPPET_SIZE` | `byPart.tippet` |
    | `WATER_MISMATCH` | `buildWide` |
    | `'NEW_CODE'` | `buildWide` |

    Also: two line warnings → `byPart.line` has both messages, in order. `[]` → equals `NO_FLAGS`.
- [ ] **Step 2: Run the tests and confirm they fail.** Run `pnpm vitest run src/features/builder/utils`. Expected: FAIL, modules not found.
- [ ] **Step 3: Implement both modules.** `flags.ts` keeps a `Record<string, ComponentType>` code map.
- [ ] **Step 4: Run the tests and confirm they pass.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "Add step order and warning-to-part flag helpers"`

---

### Task 2: `useBuildCheck`, `useChoose` and the `BuildSteps` progress bar

**Files:**
- Create: `src/features/builder/hooks/useBuildCheck.ts`, `src/features/builder/hooks/useChoose.ts`, `src/features/builder/components/BuildSteps.tsx`
- Test: `src/features/builder/components/BuildSteps.test.tsx`, `src/features/builder/hooks/useChoose.test.tsx`

**Interfaces:**
- Consumes: `flagsFromWarnings`, `NO_FLAGS`, `STEP_ORDER`, `nextStep` (Task 1); `checkBuild`, `compatibilityKeys` (`api/compatibility.ts`); `useBuildQuery`, `useBuild`, `useCatalog`.
- Produces:
  - `useBuildCheck(): { flags: BuildFlags; failed: boolean }`. This is today's `BuilderPage` check query, enabled when `selectedCount >= 2`. It returns `NO_FLAGS` when disabled, loading or failed, and logs failures with `console.error('Could not check the build', error)`.
  - `useChoose(type: ComponentType): (partId: string) => void`. It calls `selectPart(type, partId)`, then navigates to `${basePath}/${next}`, or to `basePath` when `nextStep({ ...build, [type]: partId }, type)` is `'summary'`.
  - `BuildSteps({ current }: { current: ComponentType | 'summary' })`. It renders `<nav aria-label="Build steps"><ol>` with five items.
    - Each item is a `<Link to={`${basePath}/${type}`}>`, or an `aria-disabled="true"` `<span>` when `type !== 'rod'` and there's no rod.
    - Each item has a ring and the part label.
    - `data-state` is `'picked' | 'empty' | 'flagged'`. A part is picked when `getPart(build[type])` exists, and flagged when `flags.byPart[type]` exists.
    - The current item gets `aria-current="step"`.

- [ ] **Step 1: Write the failing tests.** Mock `useBuild`, `useCatalog` and `useBuildCheck`, as in `BrandPartsHighlights.test.tsx`.
  - `BuildSteps.test.tsx`:
    - `it('marks picked, empty and flagged parts')`: build `{ rod, reel }`, flags `{ byPart: { reel: ['x'] } }` → rod is `picked`, reel is `flagged`, line is `empty`.
    - `it('points the current step')`: `current="line"` → that link has `aria-current="step"`.
    - `it('locks every step but the rod until a rod is picked')`: build `{}` → only Rod is a link; the others are `aria-disabled="true"` and not links.
    - `it('links each step under the build path')`: `basePath='/builder/42'` → the Reel link's `href` is `/builder/42/reel`.
    - `it('treats a part the catalog no longer has as empty')`: build `{ reel: 'reel-999' }`, and `getPart` returns undefined for it → `empty`.
  - `useChoose.test.tsx`, rendered via a tiny harness component in a `MemoryRouter` with a location display:
    - Choosing the reel with build `{ rod }` → `selectPart('reel', id)` is called and the location is `/builder/line`.
    - Choosing the tippet with build `{ rod, reel, line, leader }` → `/builder`.
- [ ] **Step 2: Run the tests and confirm they fail.** Run `pnpm vitest run src/features/builder`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - **Ring styles:**
    - picked: `bg-belly border-belly`
    - empty: `border-dorsal-band`
    - flagged: `border-negative border-2`
    - current: a 2px ring offset
  - **The connecting line:** `belly`, 2px.
  - **Layout:** labels under the rings at `text-xs`; the whole bar fits 390px.
- [ ] **Step 4: Run the tests and confirm they pass.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "Add the build steps progress bar and the choose-then-advance hook"`

---

### Task 3: `PartStep` and `PartGroups`

**Files:**
- Create: `src/features/builder/components/PartStep.tsx`, `src/features/builder/components/PartGroups.tsx`
- Test: `src/features/builder/components/PartStep.test.tsx`

**Interfaces:**
- Consumes: `BuildSteps`, `useChoose`, `stepAfter`, `previousStep`; `fetchCompatibleParts`, `compatibilityKeys`; `useBuildQuery`; `PartPhotoButton`; `getComponentInfo`; `formatPrice`; the `recommended` `Badge` variant.
- Produces:
  - `PartStep({ type }: { type: Exclude<ComponentType, 'rod'> })`
  - `PartGroups({ component, parts, compatible, status, selectedId, onChoose })`, where:
    - `component: ComponentInfo`
    - `parts: Part[]`
    - `compatible: CompatibleParts | undefined`
    - `status: 'off' | 'loading' | 'error' | 'ready'`
    - `selectedId: string | undefined`
    - `onChoose: (partId: string) => void`

**Behavior:**
- **Compatibility:** `status` is `'off'` when no *other* part is picked. Otherwise the query is today's `compatibilityKeys.parts(query)` / `fetchCompatibleParts`.
- **`?brand=`** comes from `useSearchParams`, and the parts come from `getParts(type, brand ?? 'all')`.
- **Chips** show only when `getBrandsFor(type).length > 1`. Each chip is a link that sets or clears `?brand` with `replace`.
- **Context line:** "Matched to your " + the depended-on parts' names joined with " and ", from this map:

  | Step | Depends on |
  |---|---|
  | reel | rod |
  | line | rod, reel |
  | leader | rod |
  | tippet | leader |

  Use only the parts that are picked. The rod's entry gets " · <Line Wt>". Omit the line when none are picked.
- **Your pick:** `getPart(build[type])` → "Your <label>: <name>", plus **Remove** (`removePart`).
- **Groups:**

  | Group | Contents | Default |
  |---|---|---|
  | Fits your rig | everything not in `notCompatible` and not in `heavierLines` | open |
  | One weight up, for your fast rod | `heavierLines`, lines only, sorted cheapest first, unpriced last | open |
  | Doesn't fit your rig | `notCompatible` | closed; a `<button aria-expanded>` toggles it |

  Each group heading carries its count. A group with no parts isn't rendered.
- **`'off'`:** one plain list, no headings.
- **`'loading'`:** five `data-testid="part-row-skeleton"` rows.
- **`'error'`:** the plain list, with "Couldn't check what fits" above it.
- **Rows:** a `<ul>` of `<li>`s containing:
  - the `PartPhotoButton`;
  - the name, plus a **Best match** badge when `recommendedLines` has it;
  - the spec line `[brand name, ...component.specColumns.slice(0, 2).map(c => part.specs[c])].join(' · ')`;
  - the price;
  - **Choose** (`aria-label="Choose <brand> <name>"`), or a disabled **Selected**.
- **Footer:**
  - "← Back to <previous label>" links to `${basePath}/${previousStep}`.
  - "Skip for now" links to `${basePath}/${stepAfter}`, or `basePath` when that's the summary.

- [ ] **Step 1: Write the failing tests** in `PartStep.test.tsx`. Mock `useBuild`, `useCatalog`, `useBuildQuery` and `fetchCompatibleParts`, and render at `/builder/line` in a `MemoryRouter` with a location display.
  - `it('groups lines by fit with counts, and keeps the misfits collapsed but choosable')`:
    - `matches.line` is {1,2}, `notCompatible.line` is {3}, and part 4 is neutral.
    - "Fits your rig (3)" lists 1, 2 and 4.
    - "Doesn't fit your rig (1)" is collapsed (`aria-expanded="false"`, part 3 not shown).
    - Click it → part 3 shows, with a **Choose** button.
  - `it('shows the heavier-line group cheapest first')`
  - `it('labels only recommended lines Best match')`
  - `it('names what the step is matched to')` → "Matched to your R8 Core 590-4 · 5 wt"
  - `it('hides brand chips when the part has one brand')` / `it('filters by ?brand=')`
  - `it('shows one plain list when fit does not apply')`: render `PartGroups` directly with `status="off"` → no group headings, and every part is listed. In the real app a part step always has a rod, so `'off'` is a safety net.
  - `it('falls back to a plain list when the check fails')` → "Couldn't check what fits", and Choose still works.
  - `it('chooses a part and moves to the next empty step')` → the location is `/builder/leader`.
  - `it('skips and goes back')` → Skip goes to `/builder/leader`; "Back to Reel" goes to `/builder/reel`.
  - `it('shows your pick with Remove')`
  - Port the 3 photo assertions from `BrandPartsPage.test.tsx` (a photo on each reel and leader row; the missing-photo label).
- [ ] **Step 2: Run the tests and confirm they fail.** Run `pnpm vitest run src/features/builder/components/PartStep.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** `PartGroups` (pure rendering from props) and `PartStep` (data and layout). The page wrapper is `<main className="mx-auto w-full max-w-5xl px-4 py-10">`. The `h1` is "Choose a <label lowercased>".
- [ ] **Step 4: Run the tests and confirm they pass.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "Add the part step: parts grouped by fit, brand chips, choose and skip"`

---

### Task 4: `RodStep`

**Files:**
- Create: `src/features/builder/components/RodStep.tsx`
- Move: `RodSeriesPage.test.tsx` → `RodStep.test.tsx`, adapted.
- Modify: `RodSeriesRow.tsx`: the size button's label becomes **Choose**, and its `aria-label` "Add …" becomes "Choose …".

**Interfaces:**
- Consumes: `BuildSteps`, `useChoose('rod')`, `fetchRodSeries`, `rodSeriesKeys`, `RodSeriesRow`, `QuestionnaireDialog`.
- Produces: `RodStep(): JSX.Element`.

**Behavior:**
- **Body:** the body of `RodSeriesPage`: series rows, the build's series open, grouped by brand under "All brands", the error with Try again, and "no rods" for an unknown brand.
- **Brand:** read from `?brand=`, defaulting to `'all'`, instead of `useParams`.
- **Chips:** from `getBrandsFor('rod')`.
- **Choosing a size:** `useChoose('rod')`.
- **The note:** when `location.state?.needsRod` is set, show "Pick a rod first: everything else is matched to it." (`role="status"`).
- **The questionnaire link:** a `variant="link"` button above the chips reading "Not sure where to start? Answer 4 questions and we'll rig it for you."
  - It runs `clearBuild()` and opens the `QuestionnaireDialog`.
  - Add an optional `onRigged?: () => void` prop to `QuestionnaireDialog`, called after `loadRecommendation`. `RodStep` passes `() => navigate(basePath)`.
- **Removed:** the "Back to your build" link.

- [ ] **Step 1: Adapt and add tests.**
  - **Ported cases:** keep every existing case from `RodSeriesPage.test.tsx`, changing the URL from `/builder/rod/sage` to `/builder/rod?brand=sage` and "Add" to "Choose".
  - **Changed case:** "adds a size and goes back to the build" becomes `it('chooses a size and moves on to the reel')` → the location is `/builder/reel`.
  - **New cases:**
    - `it('explains why it opened when a later step needed a rod')`: render with `state: { needsRod: true }` → the note shows.
    - `it('rigs a whole setup from the questions and lands on the summary')`: mock `getRecommendation` to resolve five parts, answer the dialog → the location is `/builder`.
    - `it('stays put and shows the error when the questions fail')`: mock a rejection → the dialog's error shows and the location is unchanged.
- [ ] **Step 2: Run the tests and confirm they fail.** Run `pnpm vitest run src/features/builder/components/RodStep.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement `RodStep`,** then delete `RodSeriesPage.tsx` and its test once `RodStep` covers them. `AppRoutes` still imports `RodSeriesPage` until Task 6, so keep exporting a temporary alias, `export { RodStep as RodSeriesPage }`, from the barrel until Task 6.
- [ ] **Step 4: Run the tests and confirm they pass.** Run `pnpm vitest run src/features/builder`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "Turn the rod series page into the rod step, with the questionnaire path"`

---

### Task 5: `RigSummary`

**Files:**
- Create: `src/features/builder/components/RigSummary.tsx`
- Modify:
  - `BuildHeader.tsx`: keep only the saved build's name input, status and Retry; drop the questionnaire and Clear buttons and the draft's "Your Build" `h1`.
  - `SaveDraftButton.tsx`: the label becomes "Save this rig" ("Saving…" while pending).
- Test: `src/features/builder/components/RigSummary.test.tsx`

**Interfaces:**
- Consumes: `BuildSteps`, `useBuildCheck`, `nextStep`, `BuildHeader`, `SaveDraftButton`, `PublishControls`, `CopyPublishedIntent`, `QuestionnaireDialog`, `PartImage` (`@components/shop`), `formatPrice`, `COMPONENTS`.
- Produces: `RigSummary(): JSX.Element`.

**Behavior:**
- **States:** `picked` is the parts for which `getPart(build[type])` exists. `complete` means 5 picked and no `flags.byPart` entries.
- **Order on the page:**
  1. `CopyPublishedIntent`, drafts only
  2. `BuildHeader`, saved only
  3. `BuildSteps current="summary"`
  4. The heading:
     - "Your rig is ready" when `complete`
     - "Almost there" when any flag exists (per part or build-wide)
     - "<n> of 5 picked" otherwise
  5. The subline when complete: "Five parts, matched to a <Line Wt> wt <rod name>."
  6. **Banner** (only when flags exist): `role="alert"`, every per-part message then the build-wide ones, as a list.
  7. **The rig:** an `<ol aria-label="Your rig">` down a vertical `belly` line with `dorsal-band` ring markers; flagged parts get `border-negative` rings.
     - **A picked part shows:** its `PartImage`; its name; the questionnaire note (`notes[type]`) or the spec line; its flag messages plus a link "Find a <label lowercased> that fits" to the step; its price, linked to `purchaseUrl` when it starts with `https://` (`target="_blank" rel="noopener noreferrer"`); and a **Change** link to the step.
     - **An empty part shows:** an outlined ring, the label and a **Choose a <label lowercased>** link.
  8. The total (today's sum).
  9. **Primary action:**
     - If not complete, a primary link "Continue: choose a <next empty label>" to the next empty step (`nextStep(build, 'tippet')` handles going back around).
     - **Draft:** `SaveDraftButton`, secondary when not complete.
     - **Saved build:** `PublishControls`.
  10. **Quiet actions:**
      - "Start over": `clearBuild()`, then navigate to `${basePath}/rod`.
      - "Retake the questions": `clearBuild()` and open the `QuestionnaireDialog`, with `onRigged` staying on the summary.
- **If `useBuildCheck` failed:** a quiet "Couldn't check the rig" line under the heading.

- [ ] **Step 1: Write the failing tests** (mock the hooks as before).
  - `it('celebrates a complete rig')` → the heading "Your rig is ready", 5 Change links and the total.
  - `it('counts an incomplete rig and points to the next part')`: build `{ rod, reel }` → "2 of 5 picked", and "Continue: choose a line" links to `/builder/line`.
  - `it('treats a part missing from the catalog as empty')`
  - `it('flags a part that no longer fits and links to its step')`: flags `byPart.reel` → the heading "Almost there", the message in the banner and under the reel, and "Find a reel that fits" links to `/builder/reel`.
  - `it('shows build-wide warnings only in the banner')`
  - `it('offers Save this rig on a draft and the Rack controls on a saved build')`
  - `it('starts over at the rod step')`
  - `it('says so when the rig check fails')`
  - `it('shows the questionnaire note in place of the spec line')`
- [ ] **Step 2: Run the tests and confirm they fail.** Run `pnpm vitest run src/features/builder/components/RigSummary.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** `RigSummary`, the `BuildHeader` trim and the `SaveDraftButton` label. Wrap the page in `<main className="mx-auto w-full max-w-3xl px-4 py-10">`.
- [ ] **Step 4: Run the tests and confirm they pass.** Run `pnpm vitest run src/features/builder`. Expected: PASS. `BuilderPage` still compiles (it uses `BuildHeader`).
- [ ] **Step 5: Commit.** `git commit -m "Add the rig summary: ready, incomplete and flagged states"`

---

### Task 6: Routes, the step page, redirects and removing the old builder

**Files:**
- Create: `src/features/builder/components/StepPage.tsx` (exports `StepPage`, `BuilderIndex` and `StepRedirect`)
- Modify:
  - `src/routes/AppRoutes.tsx`
  - `src/features/builder/index.ts`
  - `src/components/ui/badge.tsx`: remove the `fit` variant.
  - `src/styles/index.css`: remove `--fit` and `--color-fit`, and update the comment above them.
- Delete:
  - `BuilderPage.tsx`, `ComponentRow.tsx`, `BrandMenu.tsx`, `BrandPartsPage.tsx`
  - `BrandPartsPage.test.tsx`, `BrandPartsHighlights.test.tsx`
- Test: `src/routes/rodRoute.test.tsx` → rename it to `src/routes/builderRoutes.test.tsx` and rewrite it.

**Interfaces:**
- Produces:
  - `StepPage({ type }: { type: ComponentType })`: for `type !== 'rod'` with no rod (via `getPart`), `<Navigate to={`${basePath}/rod`} replace state={{ needsRod: true }} />`. Otherwise `RodStep` or `PartStep`.
  - `BuilderIndex()`: keeps `const [hadIntent] = useState(() => searchParams.has('copy') || searchParams.has('save'))`. Without a rod and without `hadIntent`, it renders `<Navigate to={`${basePath}/rod`} replace />`. Otherwise it renders `RigSummary`.
  - `StepRedirect()`: reads `:component` and `:brand`. A known component goes to `<Navigate to={`${basePath}/${component}?brand=${brand}`} replace />`; anything else gets `NotFound` with a "Back to your build" link to `basePath`.
- Barrel exports: `BuilderIndex`, `StepPage`, `StepRedirect`, `BuilderLayout`, `MyBuildsPage`, `LocalBuildProvider`, `SavedBuildProvider`, `useBuild`, and the types. Remove `BuilderPage`, `BrandPartsPage` and the `RodSeriesPage` alias.

**Routes,** under each provider (`LocalBuildProvider` at `builder`, `SavedBuildProvider` at `builder/:buildId`):

```tsx
<Route index element={<BuilderIndex />} />
{STEP_ORDER.map((type) => <Route key={type} path={type} element={<StepPage type={type} />} />)}
<Route path=":component/:brand" element={<StepRedirect />} />
```

Import `STEP_ORDER` through the barrel: export it from `index.ts`.

- [ ] **Step 1: Write the failing tests.**
  - **`builderRoutes.test.tsx`:**
    - **Mocks:** `@features/builder`'s `BuilderLayout`, `LocalBuildProvider` and `SavedBuildProvider` render `<Outlet />`. The real `StepPage`, `BuilderIndex` and `StepRedirect` are kept. `@/features/builder/components/RodStep`, `PartStep` and `RigSummary` are mocked with text markers ("Rod step", "Part step: <type>", "Summary"). `useBuild` and `useCatalog` are mocked per case.
    - A location display renders `pathname + search` and `JSON.stringify(state)`.
    - `/builder` with no rod → "Rod step" at `/builder/rod`.
    - `/builder` with a rod → "Summary".
    - `/builder?copy=5` with no rod → still the summary, even after the param is stripped (simulate by rendering the index, then navigating with `replace` to `/builder`).
    - `/builder/reel` with no rod → `/builder/rod` with `needsRod` state.
    - `/builder/reel/lamson` → `/builder/reel?brand=lamson`, and `/builder/rod/sage` → `/builder/rod?brand=sage`.
    - `/builder/42` → the saved build's index (under `SavedBuildProvider`); `/builder/42/line` → the line step.
    - `/builder/42/rod/sage` → `/builder/42/rod?brand=sage`.
    - `/builder/bogus/thing` → the NotFound text.
  - **`AppRoutes.test.tsx`:** the existing case still passes.
- [ ] **Step 2: Run the tests and confirm they fail.** Run `pnpm vitest run src/routes src/features/builder`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** `StepPage.tsx`, the routes and the barrel; delete the old files; remove the `fit` variant and tokens. Run `grep -rn "bg-fit\|border-fit\|variant=\"fit\"\|--fit\b" src` and expect nothing.
- [ ] **Step 4: Run the full suite and static checks.** Run `pnpm test && pnpm lint && pnpm build && pnpm check:contrast`. Expected: all pass, and lint has no new warnings in `src/`.
- [ ] **Step 5: Commit.** `git commit -m "Route the builder through guided steps; remove the brand-first table"`

---

### Task 7: Docs, browser verification, hand-back

**Files:**
- Modify:
  - `docs/builds/saved-builds.md`: the routes section.
  - `CLAUDE.md`: in the "Builder persistence" paragraph, replace the description of `/builder` with the guided steps (`/builder/<part>`, the summary at `/builder`, rod first).

- [ ] **Step 1: Update both docs.** Then run `grep -rn "BrandPartsPage\|BuilderPage\|RodSeriesPage" docs CLAUDE.md`, and fix any stale mentions in current docs. Leave dated specs and plans as they are.
- [ ] **Step 2: Browser pass in Chrome** at 1440px and 390px, with the API and dev server running. Confirm each of these:
  1. From an empty draft, `/builder` opens the rod step.
  2. Choosing a rod size moves to Reel, and the context line names the rod.
  3. Grouped reels show; "Doesn't fit" opens.
  4. Choosing through to the tippet ends on "Your rig is ready" with five parts on the line.
  5. Change the rod to an 8 wt → "Almost there", with red rings on the reel and line, and "Find a reel that fits" works.
  6. The questionnaire from the rod step lands on a full summary.
  7. Signed in: save the draft, then the steps show "Saved" while picking, and **Post to the Rack** opens the dialog. Don't submit the publish dialog.
  8. An old link `/builder/reel/lamson` redirects.
  9. `/builder?copy=<an existing Rack id>` loads that build into the summary.
  10. At 390px, the progress bar and the rows fit without horizontal scroll.
- [ ] **Step 3: Commit the docs** (and any fixes from the browser pass): `git commit -m "Document the guided builder routes"`
- [ ] **Step 4: Hand back.** Report what you checked, with screenshots, and anything not checked.
