# Setup questionnaire design

Date: 2026-11-11 · Branch: `questionnaire` · Status: awaiting review

## Purpose

New fly anglers often don't know which rod, reel, line, leader and tippet to buy. The
questionnaire asks a few friendly questions and fills the Builder with a full setup that a
fly shop employee would agree with, with a short reason for each part. This kind of fly-shop
advice is what sets RodPartPicker apart from ordinary online shopping.

Success: a user answers five questions and gets a setup on the normal Builder page. Each part
shows why it was picked, and the user can change any part just as if they had built the
setup themselves.

## Scope

- Only **small creeks** is supported. The other four places (large rivers, lakes and ponds,
  inland saltwater, deep saltwater) are shown but disabled, labeled "coming soon".
- Every experience level and budget is supported for small creeks.
- Recommendations use only parts already in the catalog.
- Out of scope: other places, follow-up questions about species, saving answers, accounts.

## User flow

1. On the Builder page, the user clicks **"Click here to get a setup tailored to you"**.
   This clears the current build and opens the questionnaire dialog. Closing the dialog early
   leaves the build cleared.
2. The dialog shows one question per screen with a step counter ("2 of 5") and a Back button.
   Picking an answer moves to the next question.

| # | Question | Answers |
|---|---|---|
| 1 | What is your experience level? | **Low:** you've never cast a fly rod, or only a few times. **Medium:** you've fished a few seasons and are comfortable casting. **High:** you're an experienced caster. |
| 2 | Where do you want to fish? | Small creeks · Large rivers *(coming soon)* · Lakes and ponds *(coming soon)* · Inland saltwater *(coming soon)* · Deep saltwater *(coming soon)* |
| 3 | "Nice choice, small creeks are so much fun and typically have the prettiest fish. Are you targeting trout?" | Yes · No |
| 4 | "Awesome! Is this the only place you'll use this rod?" | Yes, only small creeks · No, I'll fish other water too |
| 5 | "Nice. What is your budget?" | **Low:** you're new to fishing and don't want to spend a lot just to learn. **Medium:** this is something you want to invest in more. **High:** you want the nicest gear possible; you're really into fly fishing. |

The experience descriptions are a first draft; the budget descriptions are the team's.

3. After the budget answer, the dialog shows "Building your setup…" while it fetches the
   recommendation. On success it loads the five parts with their reasons into the build and
   closes. On failure it shows "Couldn't get a recommendation" with a Try again button, and the
   build stays empty.
4. The user is on the normal Builder page. Each recommended part shows its reason. Changing or
   removing a part drops that part's reason. "Clear build" drops all of them. Compatibility
   highlights and warnings work as usual.

## Recommendation rules

Each answer maps to one part of the setup:

- **Only rod?** sets the rod weight and length, and the tippet.
- **Budget** sets the price tier.
- **Experience** sets the rod action where the catalog allows it (only high experience with a
  high budget on the 4wt branch), and the wording of the reasons everywhere else.
- **Trout?** changes only the reasons. If the answer is no, the reasons add that this light
  setup also suits panfish and small bass in creeks.

### Only small creeks: 3wt, 5X tippet

| Budget | Rod | Reel | Line |
|---|---|---|---|
| Low | Redington Classic Trout 376-4 (7'6", medium) $199.99 | Lamson Liquid S 2-4 $149 | RIO Avid Trout-Gold 3wt $69 |
| Medium | Redington Classic Trout 376-4 $199.99 | Lamson Guru X 2-4 $309 | RIO Avid Trout-Gold 3wt $69 |
| High | Sage Classic R8 380-4 (8', medium) $1,100 | Lamson Litespeed F 2-4 (sealed) $579 | RIO Avid Trout-Gold 3wt $69 |

### Other water too: 8'6" 4wt, 4X tippet

| Budget | Rod | Reel | Line |
|---|---|---|---|
| Low | Redington Classic Trout 486-4 (medium) $199.99 | Lamson Liquid S 2-4 $149 | RIO Avid Trout-Gold 4wt $69 |
| Medium | Redington Classic Trout 486-4 $199.99 | Lamson Guru X 2-4 $309 | RIO Elite Gold 4wt $129 |
| High | Sage Classic R8 486-4 (medium) $1,100; **high experience:** Sage R8 Core 486-4 (fast) $1,100 | Lamson Litespeed F 2-4 (sealed) $579 | RIO Elite Gold 4wt $129 |

### Leader and tippet (every combination)

- **Leader:** RIO Powerflex Plus Trout Leader, 7.5' 5X (3-pack) $19.99
- **Tippet:** RIO Powerflex Plus 5X $7.99 when this is the only place they'll fish; RIO
  Powerflex Plus 4X when they'll fish other water too

### Notes on the picks

- **Medium budget:** the catalog has no mid-priced 3wt or 8'6" 4wt (Redington EDC and Sage
  Foundation only come in 9' 4wt). Medium budgets get the low-price Redington rod and spend
  the difference on a better reel, and on the 4wt branch a better line. The reason says: "On
  small creeks the line and reel matter more than the rod, so we put your budget there."
  Revisit when more rods are added.
- **3wt line:** RIO Avid Trout-Gold is the only 3wt line in the catalog, so every 3wt setup uses it.
- **Fast R8 Core 486:** keeps the standard 4wt Elite Gold. Its reason mentions that fast rods
  often cast better with a slightly heavier line, and points to the recommended heavier lines
  in the Line section (the existing fast-rod rule).
- **Short rod:** the 7'6" 376 is picked over the 8'6" 386 because tight creek cover favors a
  shorter rod.

### Open issue: 4X tippet on a 5X leader

The existing `LEADER_TIPPET_SIZE` rule warns unless the tippet is the leader's size or one
size finer, so a 4X tippet on a 5X leader triggers a warning. Every leader in the catalog is
5X. The "other water too" setups therefore contradict the test that every recommended build
passes `check_build` with no warnings. This needs a decision before planning.

## Architecture

The questionnaire only exists on the Builder page, so its frontend code lives in the
`builder` feature (co-location rule). No other feature is involved, so no feature imports
another. The rules live in the API, matching how compatibility moved server-side.

### API: `api/app/questionnaire/`

- `schemas.py`
  - `Answers`: `experience: Literal["low", "medium", "high"]`, `place: Literal["small_creeks"]`,
    `trout: bool`, `only_rod: bool`, `budget: Literal["low", "medium", "high"]`.
  - `RecommendedPart`: `component` (rod/reel/line/leader/tippet), `part_id` (database id),
    `reason: str`.
  - `Recommendation`: `parts: list[RecommendedPart]`, always five, one per component.
- `rules.py`: the rule table as plain Python. Each pick identifies its part by natural key
  (brand plus name and specs such as line weight, length, X-size and pack count), not by
  database id, so reseeding doesn't break it. The reason text sits next to each pick;
  experience and trout vary the wording.
- `router.py`: `GET /api/questionnaire/recommend` with the answers as query parameters. It
  resolves each pick to a row and returns the `Recommendation`. It's a GET because it only
  reads; this also keeps it outside the origin check on write methods. The router is
  registered in `app/main.py`.

Errors:

- Invalid or missing answers, or a `place` other than `small_creeks`: 422 from FastAPI validation.
- A pick that no longer exists in the catalog: 500, with a log message naming the missing part.

### Frontend: `src/features/builder/`

- `components/ui/dialog.tsx`: added with the shadcn CLI (`pnpm dlx shadcn@latest add dialog`).
- `components/BuilderPage.tsx`: adds the "Click here to get a setup tailored to you" button
  next to "Clear build". Clicking it calls `clearBuild()` and opens the dialog.
- `components/QuestionnaireDialog.tsx`: holds the step state and answers, renders the current
  question, Back button, step counter, loading and error states, and calls the API after the
  last answer.
- `utils/questions.ts`: question text, answer labels, descriptions, reaction lines and which
  places are "coming soon", so wording changes don't touch the component.
- `api/questionnaire.ts`: `getRecommendation(answers, signal)` calls the endpoint and maps each
  part to the Builder's id format (`${component}-${part_id}`).
- `hooks/buildContext.ts` and `hooks/BuildProvider.tsx`:
  - `notes: Partial<Record<ComponentType, string>>`, the reason per component.
  - `loadRecommendation(parts)` sets all five parts and notes at once.
  - `selectPart` and `removePart` drop that component's note; `clearBuild` drops all notes.
  - Notes persist under their own localStorage key (`rpp:notes:v1`), so the existing
    `rpp:build:v2` format is unchanged. Notes whose component has no part are ignored when
    loading.
- `components/ComponentRow.tsx`: when the component has a note, shows it in small muted text
  under the part's specs, prefixed "Why:". Rows without a note are unchanged.

## Testing

API (`api/tests/test_questionnaire.py`):

- All 36 answer combinations (3 experience × 2 trout × 2 only rod × 3 budget) return five
  parts, one per component, each existing in the catalog with a non-empty reason.
- The picks match the tables above. Spot checks: low budget + only rod gives the Redington 376,
  the 7.5' 5X leader and 5X tippet; not only rod gives an 8'6" 4wt and 4X tippet; high
  experience + high budget + not only rod gives the R8 Core 486.
- Every recommended build passes `check_build` with no warnings.
- Trout = no adds the panfish and small bass note.
- A `place` other than `small_creeks`, or a missing answer, returns 422.

Frontend (no test runner): `pnpm build` and `pnpm lint` pass, then a manual run through:

- low experience, only rod, low budget
- high experience, other water too, high budget
- the API stopped (error state and Try again)
- changing a recommended part (its reason disappears) and Clear build (all reasons disappear)
