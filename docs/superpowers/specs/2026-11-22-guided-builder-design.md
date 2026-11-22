# Guided builder: one part per step, grouped by fit

Sub-project 2 of the UX polish pass. It also absorbs sub-project 3 (compatibility display). Branch `oa-guided-builder`, off `main`, independent of PR #60. Approved in brainstorming on 2026-11-22.

## Why

Adding one part to a build today takes four screens: the Builder table → "Choose a Reel" → a brand dropdown → that brand's page → **Add** → back to the table. Brand comes first, but the catalog doesn't support that:

| Part | Items | Brands |
|---|---|---|
| Rods | 193 sizes in 20 series | 4 |
| Reels | 50 | 2 |
| Lines | 58 | 1 |
| Leaders | 13 | 3 |
| Tippets | 32 | 4 |

So for lines and reels, the brand step is pure overhead. On top of that:

- **Nothing shows progress, and nothing marks a finished build.**
- **Compatibility uses four overlapping signals:** a blue row tint, a gold "Fits build" badge, a gold "Recommended" badge in the same gold, and a blue banner. Build problems show in a separate "Check your build" box, away from the parts they're about.

## Goal

An angler who doesn't know brands goes from an empty build to five compatible parts in rig order. Each step shows what fits what they've already chosen, without a color code to learn. The flow ends on a clear "Your rig is ready". Changing an earlier part never silently breaks or deletes later work.

**Users:** anglers building a first or second fly setup.

**Success means:**
- one screen per part;
- whether a part fits is readable at a glance;
- a finished rig is recognizable;
- a part that no longer fits is easy to fix.

## Design

### 1. Routes and flow

| URL | Shows |
|---|---|
| `/builder/rod`, `/builder/reel`, `/builder/line`, `/builder/leader`, `/builder/tippet` | That part's step (draft) |
| `/builder/:buildId/rod` … `/tippet` | That part's step (saved build) |
| `?brand=<slug>` on a step | The brand filter |
| `/builder`, `/builder/:buildId` | **No rod:** `<Navigate replace>` to the rod step. **Otherwise:** the summary |
| `/builder/:component/:brand`, `/builder/:buildId/:component/:brand` (old links) | `<Navigate replace>` to the step with `?brand=` |

The step paths are **static segments** (five routes per provider), so they outrank the dynamic `:buildId`.

**Rod first, then free:**
- Opening any other step without a rod redirects (`replace`) to the rod step, which shows the note *"Pick a rod first: everything else is matched to it."*
- In the progress bar, the four other rings are disabled until a rod is chosen.
- After that, the rings are links, and any step can be opened or skipped.

**Moving between steps:**
- **Choose:** calls `selectPart`, then navigates to the next *empty* step after this one in rig order. If no step after it is empty, it goes back around to the first empty one. If all five are filled, it goes to the summary.
- **Each step also offers:** "← Back to <previous part>" (not on the rod step), and "Skip for now", which goes to the next step in rig order, or to the summary from the tippet.
- **On the summary:** **Change** on a part opens its step.

**Entry points:** the homepage's and header's links to `/builder` start an empty build at the rod step and resume an existing one at its summary.

**Unchanged:** `LocalBuildProvider` and `SavedBuildProvider`, autosave, the `?save=1` and `?copy=` intents, `basePath`. `CopyPublishedIntent` and `SaveDraftButton` move to the summary. `?save=1` lands on `/builder`, which is the summary whenever the draft has a rod.

### 2. A step screen

From top to bottom:

1. **`BuildSteps` progress bar:** five guide rings on a horizontal line, labeled Rod to Tippet.

   | Ring | Meaning |
   |---|---|
   | Filled `belly` | Picked |
   | Outlined `dorsal-band` | Empty |
   | `negative`-colored ring | Flagged (section 4) |
   | Heavier outline | The current step |

   Each ring is a link (`aria-current="step"` on the current one). The non-rod rings are disabled while there's no rod. It fits 390 px with the labels.

2. **Saved builds only:** a compact line with the build name and its save status ("Saved", "Saving…", or "Couldn't save" + **Retry**), reusing the existing state.

3. **Title:** "Choose a reel" (`h1`).

4. **Context line:** the parts this step is checked against, by name and key spec:

   | Step | Checked against |
   |---|---|
   | Reel | the rod |
   | Line | the rod and the reel |
   | Leader | the rod |
   | Tippet | the leader |

   Only parts already picked are named, e.g. "Matched to your Sage Foundation 590-4 · 5 wt". There's no context line on the rod step, or when nothing it depends on is picked yet.

5. **Your pick:** if this step already has a part, it shows as "Your reel: Lamson Guru X 4–6", with **Remove**.

6. **Brand chips:** one per brand that has parts for this component, plus "All brands". They're shown only when there's more than one brand, so lines have none. Selecting a chip sets `?brand=`; "All brands" clears it.

7. **The parts, grouped by fit.** The groups are only shown when compatibility applies, i.e. when another part is picked and this step isn't the rod.
   - **Fits your rig (n):** open. These are `matches` that aren't heavier lines.
   - **Lines only, One weight up, for your fast rod (n):** open. These are `heavierLines`, cheapest first (unpriced last), as today.
   - **Doesn't fit your rig (n):** collapsed behind a disclosure button (`aria-expanded`). These are `notCompatible`, and they can still be chosen.
   - **Anything in neither set** goes into the first group, as today's main table does.
   - **Recommended lines** (`recommendedLines`) carry one small **Best match** label (the existing `recommended` badge variant). No other part gets a label.
   - **Without compatibility** (rod step, nothing else picked) it's one plain list.

   **Each row:**
   - the photo (`PartPhotoButton`);
   - the name;
   - a spec line: the brand plus the component's first `specColumns`, joined with " · ", as `ComponentRow`'s subtitle does today;
   - the price;
   - **Choose**, or a disabled **Selected** for the current pick.

8. **While compatibility loads:** skeleton rows in the groups' place. **If it fails:** one plain list with a quiet "Couldn't check what fits" line, and choosing still works. There's no `placeholderData`, so the previous selection's groups never show for the next one.

9. **Footer:** "← Back to <previous>" and "Skip for now".

**The rod step:**
- It has the same progress bar and chips (rods have 4 brands). Its body is today's `RodSeriesPage` list: series rows that open to their size tables, grouped by brand under "All brands", with **Add** renamed **Choose** and following the Choose rule above.
- Above the chips, one quiet line: *"Not sure where to start? Answer 4 questions and we'll rig it for you."* It opens the existing `QuestionnaireDialog`. On success, `loadRecommendation` fills all five parts and the app navigates to the summary.
- Rods are never grouped by fit, as today.

### 3. The summary (`/builder`, `/builder/:buildId`)

**Complete and nothing flagged:**
- The progress bar.
- **Saved builds:** the name input, the save status and Retry (today's `BuildHeader` content).
- The heading **"Your rig is ready"** and the line "Five parts, matched to your <weight> wt <brand> <rod name>."
- **The rig on its line:** the five parts down a vertical `belly` line with `dorsal-band` guide-ring markers, the homepage's motif without its scroll animation. Each part shows:
  - its photo;
  - its name;
  - its spec line, or the questionnaire's note for that part if there is one;
  - its price, linking to the seller when there's an `https://` purchase URL (the current "Buy" link);
  - **Change**, which opens the step.
- The total, using today's sum.
- **One primary action:**
  - **Draft:** **Save this rig** (`SaveDraftButton`, including the sign-in round trip).
  - **Saved build:** the existing `PublishControls`, unchanged: **Post to the Rack**, or **Update on the Rack** once posted.
- **Quiet actions:**
  - **Start over:** today's Clear build. It then goes to the rod step.
  - **Retake the questions:** clears the build and opens the questionnaire, as the header button does today.

**Incomplete:**
- The heading becomes **"<n> of 5 picked"**.
- Empty parts sit on the line as outlined rings with a **Choose a <part>** link.
- The primary action becomes **Continue: choose a <next empty part>**.
- Save and publish stay available as secondary actions.

### 4. Flagged parts

**The check:** `/compatibility/check` runs as today. `flagsFromWarnings(warnings)` maps each warning to the later part of its pair, in rig order:

| Warning code | Part flagged |
|---|---|
| `ROD_REEL_WEIGHT` | reel |
| `ROD_LINE_WEIGHT` | line |
| `REEL_LINE_WEIGHT` | line |
| `ROD_LEADER_WEIGHT` | leader |
| `LEADER_TIPPET_SIZE` | tippet |
| `WATER_MISMATCH` | none (build-wide) |

Unknown codes are build-wide too.

**A flagged part:**
- Gets the `negative` ring in the progress bar and on the summary line.
- Shows the API's message under it.
- Shows **Find a <part> that fits**, which opens its step.

**The summary with flags:** the heading becomes **"Almost there"**, and one banner under it lists every message: the per-part ones and the build-wide ones. A rig is only "ready" when all five are picked and nothing is flagged.

**Nothing is removed automatically.**

**If the check fails:** no flags show, and a quiet "Couldn't check the rig" line appears. Nothing is blocked.

### 5. What goes away

- **Components:** `BuilderPage`'s table, `ComponentRow`, `BrandMenu`, `BrandPartsPage` and the "Check your build" alert.
- **The header button:** "Click here to get a setup tailored to you". The questionnaire now opens from the rod step and the summary.
- **Styles:**
  - The `fit` badge variant, the `--fit` / `--color-fit` tokens and the `bg-fit` / `border-fit` uses.
  - The `recommended` variant and its tokens **stay**, for Best match.

## Units

All of these are in `src/features/builder`.

**New units:**

| Unit | Job |
|---|---|
| `utils/steps.ts` | `STEP_ORDER`; `nextStep(build, from)` (the next empty step after `from`, wrapping; `'summary'` when full); `previousStep(type)` |
| `utils/flags.ts` | `flagsFromWarnings(warnings)` → `{ byPart: Partial<Record<ComponentType, string[]>>, buildWide: string[] }` |
| `hooks/useBuildCheck.ts` | Runs `/compatibility/check` (today's `BuilderPage` query) and returns the flags. Used by `BuildSteps` and `RigSummary` |
| `components/BuildSteps.tsx` | The progress bar |
| `components/StepPage.tsx` | The route element: reads the component from the route, applies rod-first, and renders `RodStep` or `PartStep` |
| `components/PartStep.tsx` | Context line, your pick, chips, groups, footer |
| `components/PartGroups.tsx` | Groups the parts by fit and renders the rows |
| `components/RodStep.tsx` | Today's `RodSeriesPage` body, wired to chips and Choose |
| `components/RigSummary.tsx` | The summary and its states |
| `components/StepRedirect.tsx` | Sends old `:component/:brand` links to the step with `?brand=` |

**Changed:**
- `src/routes/AppRoutes.tsx`: the new routes.
- `BuildHeader`: trimmed to the saved build's name and status, and reused on the summary.
- `features/builder/index.ts`: exports `StepPage`, `RigSummary` and `StepRedirect` in place of `BuilderPage`, `BrandPartsPage` and `RodSeriesPage`.
- `components/ui/badge.tsx` and `src/styles/index.css`: the `fit` removal.

**Docs:** update `docs/builds/saved-builds.md` and CLAUDE.md's "Builder persistence" paragraph with the new routes.

## Testing

All tests are Vitest.

- **`steps.ts`:**
  - The next empty step after the current one.
  - Wrapping around to a skipped step.
  - `'summary'` when full.
  - `previousStep` of the rod is undefined.
- **`flags.ts`:**
  - Each code maps to its part as in the table.
  - `WATER_MISMATCH` and unknown codes are build-wide.
  - Two warnings on one part both appear.
- **Routes:**
  - `/builder` goes to `/builder/rod` when there's no rod, and shows the summary otherwise.
  - `/builder/reel` with no rod redirects to the rod step and shows the note.
  - `/builder/reel/lamson` goes to `/builder/reel?brand=lamson`.
  - The saved-build equivalents work under `/builder/42`.
  - `/builder/42` is still the saved build and not a step.
- **`BuildSteps`:**
  - The five rings show their states.
  - `aria-current` is on the current step.
  - The non-rod rings are disabled without a rod.
  - A flagged part gets its ring.
- **`PartStep` / `PartGroups`** (mocked compatibility):
  - The group counts, with "Doesn't fit" collapsed and its parts choosable once open.
  - Neutral parts go into "Fits".
  - The line-only heavier group, sorted.
  - Best match only on recommended lines.
  - Chips hidden with one brand; `?brand=` filters.
  - Skeletons while loading; the plain list and its note on failure.
  - Choose goes to the next empty step, or the summary.
  - Skip and Back.
- **`RodStep`:**
  - The questionnaire link opens the dialog, and success goes to the summary.
  - Choose on a size follows the Choose rule.
- **`RigSummary`:**
  - Complete, incomplete ("2 of 5 picked" + Continue) and flagged ("Almost there", the banner, Find a … that fits).
  - The draft shows **Save this rig**; the saved build shows the publish controls.
  - **Start over** goes to the rod step.
- **Existing tests:** the questionnaire, save, publish, copy and rod-series tests move to their new homes and still pass. Delete the tests for the removed components.
- **Static checks:** `pnpm lint`, `pnpm build` and `pnpm check:contrast` pass.
- **Manual pass in Chrome:**
  - Build a full rig from empty.
  - Change the rod to 8 wt, then fix the flags.
  - Resume from the homepage.
  - A saved build: autosave visible on a step, then publish.
  - The questionnaire.
  - 390 px.

## Out of scope

- "Why it fits" explanations, which would need the API's rules to explain fits as well as problems.
- Filters beyond brand (weight, water, price).
- Header and navigation changes (sub-project 4).
- Other changes to the compatibility rules or API responses. **One was added during the build:** with a leader selected, `/compatibility/parts` now marks tippets that aren't the leader's X size or one finer as not compatible (`rules.tippet_suits_leader`), so the tippet step never lists one that `/compatibility/check` then flags. It used to highlight every tippet on a light rod and never mark one as not compatible.
