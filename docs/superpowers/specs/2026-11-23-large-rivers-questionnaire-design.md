# Large rivers questionnaire design

Date: 2026-11-23 · Branch: `oa-large-rivers` · Status: draft, awaiting review

## Purpose

The setup questionnaire (`2026-11-11-questionnaire-design.md`) only supports small creeks.
This adds the second place, **Large rivers**. Big rivers mean different fish and flies, so
the follow-up questions ask what you're targeting and what you'll throw, and the answers set
the rod weight and line type the way a fly shop would.

Success: a user who picks Large rivers answers five questions and gets a full five-part
setup with a reason for each part. Every setup passes `check_build` with no warnings, and
every part is a real product a shop would recommend for that fishing.

## Scope

- Large rivers becomes selectable; lakes and ponds, inland saltwater and deep saltwater stay
  "coming soon".
- Small creeks is unchanged: the same questions, picks and API parameters.
- New catalog products are added where the current catalog can't make an honest setup
  (musky lines and bite protection, a trout streamer sink tip, heavier trout leaders).
- Out of scope: other places, saving answers, species beyond the three targets.

## Question flow

The dialog keeps its shell: one question per screen, the "n of 5" counter and Back. Steps 1, 2
and 5 are shared; steps 3 and 4 depend on the place.

| # | Small creeks (unchanged) | Large rivers |
|---|---|---|
| 1 | Experience | Experience |
| 2 | Place | Place |
| 3 | Targeting trout? | "Big water, big fish. What are you targeting?" |
| 4 | Only place you'll use this rod? | "What will you mostly be throwing?" |
| 5 | Budget | Budget |

Large rivers answers:

| Q3 target | Q4 flies options |
|---|---|
| Trout | Dries and nymphs · Small to medium streamers · Large streamers |
| Smallmouth bass | Small to medium streamers · Large streamers and heavy topwater |
| Musky and other large predators | Unweighted streamers · Heavily weighted streamers · Some of both |

Answer values: `target` is `trout | smallmouth | predators`; `flies` is `dries_nymphs |
small_streamers | large_streamers | large_topwater | unweighted | weighted | both`. Valid
pairs:

- trout: `dries_nymphs`, `small_streamers`, `large_streamers`
- smallmouth: `small_streamers`, `large_topwater`
- predators: `unweighted`, `weighted`, `both`

Answering a question clears every answer after it, so going Back and changing the place or
the target never leaves a stale answer behind. The question wording is a first draft and
lives in `questions.ts`.

## Recommendation rules

- **Target + flies** set the rod weight and the line type.
- **Budget** sets the price tier of the rod, reel and (for floating trout and smallmouth
  lines) the line.
- **Experience** sets the rod action where the tier offers a choice: low and medium
  experience get medium action, high experience gets fast. Where a tier has one rod, every
  experience level gets it. Experience also changes the reason wording, as for creeks.

### Rod weight and line type

| Target | Flies | Rod | Line |
|---|---|---|---|
| Trout | Dries and nymphs | 9' 5wt | floating |
| Trout | Small to medium streamers | 9' 6wt | floating |
| Trout | Large streamers | 9' 7wt | sink tip |
| Smallmouth | Small to medium streamers | 9' 7wt | floating |
| Smallmouth | Large streamers and heavy topwater | 9' 8wt | floating |
| Predators | Unweighted streamers | 9' 10wt | heavy sink tip |
| Predators | Heavily weighted streamers | 9' 10wt | floating |
| Predators | Some of both | 9' 10wt | intermediate sink tip |

Unweighted musky flies need a sinking line to get down; heavily weighted flies sink on
their own, so a floating line keeps them out of snags.

### Rods

Two rods in a cell: the first is medium action (low and medium experience), the second fast
(high experience). All are 9' (108").

| Weight | Low budget | Medium budget | High budget |
|---|---|---|---|
| 5wt | Redington Classic Trout 590-4 $199.99 | Orvis Clearwater $298 / Redington EDC 590-4 $379.99 | Sage Classic R8 590-4 / Sage R8 Core 590-4 $1,100 |
| 6wt | Redington Classic Trout 690-4 $199.99 | Orvis Clearwater $298 / Redington EDC 690-4 $399.99 | Sage Classic R8 690-4 / Sage R8 Core 690-4 $1,100 |
| 7wt | Lamson Liquid $219 | Orvis Clearwater $298 / Redington EDC 790-4 $399.99 | Sage R8 Core 790-4 $1,100 |
| 8wt | Lamson Liquid $219 | Orvis Clearwater $298 / Redington EDC 890-4 $399.99 | Sage R8 Core 890-4 $1,100 |
| 10wt | Orvis Clearwater $298 | Lamson Liquid Max $319 | Orvis Helios D $1,198 |

The high-budget 7wt and 8wt and every 10wt tier have only one rod, so experience changes
only their wording. The 10wt medium budget is fast for everyone and the low budget medium for
everyone.

### Reels

| Rod weight | Low | Medium | High |
|---|---|---|---|
| 5–6wt | Lamson Liquid S 4-6 $159 | Lamson Guru X 4-6 $309 | Lamson Litespeed F (sealed) 4-6 $599 |
| 7–8wt | Lamson Liquid S 6-8 $169 | Lamson Guru X 6-8 $359 | Lamson Litespeed F (sealed) 6-8 $639 |
| 10wt | Lamson Liquid S 8-10 $179 | Lamson Guru X 8-10 $379 | Orvis Ratio (sealed) 9-11 $598 |

### Lines

- **Floating, 5–7wt:** RIO Avid Trout-Gold on a low budget, RIO Elite Gold on medium and high.
- **Floating, 8wt:** RIO Elite Gold at every budget (the only freshwater 8wt line).
- **Trout, large streamers:** *new* RIO InTouch Streamertip 7wt at every budget.
- **Predators:** *new* 10wt lines at every budget: RIO Elite Pike/Musky (floating) for weighted
  flies, a heavy sink tip for unweighted flies, an intermediate sink tip for some of both.
- **Fast rods** with a floating Gold line get the creeks' note pointing to the recommended
  heavier lines in the Line section.

### Leader and tippet

The same at every budget. Each tippet is the leader's X size, which `tippet_suits_leader`
allows.

| Setup | Leader | Tippet |
|---|---|---|
| Trout, dries and nymphs | RIO Powerflex Plus Trout Leader 9' 5X | RIO Powerflex Strong 5X |
| Trout, small to medium streamers | *new* RIO Powerflex Plus Trout Leader 9' 2X | RIO Powerflex Strong 2X |
| Trout, large streamers (sink tip) | Scientific Anglers Absolute Streamer Leader 4' 10 lb | RIO Powerflex Strong 3X |
| Smallmouth | *new* RIO Powerflex Plus Trout Leader 9' 0X | RIO Powerflex Strong 0X |
| Predators | *new* heavy fluorocarbon musky leader | *new* wire bite tippet |

The short streamer leader keeps the fly down with a sink tip. Musky teeth cut nylon and
fluorocarbon, so the musky rig ends in wire.

### Reasons

Each pick has a reason next to it in `rivers.py`, in the creek reasons' style: why this weight
suits the target and flies, why the line type suits the flies, and, for budget upgrades, what
the extra money buys. Experience varies the rod wording (medium action helps you feel the
rod load; fast action pushes line into wind and turns over big flies).

## New catalog products

Names are a first pass. Exact models, specs, prices and links are checked when the CSV batch
is written; rows without a photo show the placeholder until the team adds one.

| Part | Product | Specs |
|---|---|---|
| Line | RIO InTouch Streamertip | 7wt, sink tip, with sink rate |
| Line | RIO Elite Pike/Musky | 10wt, floating |
| Line | 10wt intermediate sink tip (e.g. Scientific Anglers Sonar Titan Clear Tip) | 10wt, intermediate |
| Line | 10wt heavy sink tip (e.g. RIO InTouch Big Nasty Sink Tip) | 10wt, sink tip, with sink rate |
| Leader | RIO Powerflex Plus Trout Leader | 9' 2X and 9' 0X, 3-pack (new sizes of an existing product) |
| Leader | Heavy fluorocarbon musky leader | about 6', 40–60 lb, no X size |
| Tippet | RIO Knottable Wire (or similar) | about 30 lb, no X size |

Water tags: the freshwater lines and trout leaders are `fresh`; the musky leader and wire
tippet are `both` if the maker sells them for both. The build's water tags must not mix
`fresh` and `salt`, so no saltwater-only part is used.

## Data changes

New numbered migrations; applied migrations are never edited.

Numbers below assume nothing else lands first; use the next free numbers.

1. `028_nullable_tippet_x_size.sql`: `tippets.x_size_id` becomes NULL-able, matching what
   migration 010 did for leaders. The unique key `(brand_id, name, x_size_id, spool_yards)`
   stays; MySQL allows repeated NULLs in a unique key, so a wire tippet is identified by
   name and spool.
2. `029_large_river_parts.sql`: seed migration inserting the products above.
3. Links and images through the usual `api/part_details_*.csv` batch and
   `app/part_details.py` (a numbered migration it generates).

### A tippet with no X size

- `app/compatibility/rules.py`: `tippet_suits_leader` passes when the tippet has no X size;
  `is_light_tippet_for_rod` returns False when it has none.
- The tippet model and API schemas allow a missing X size; the frontend's tippet specs show
  the strength (e.g. "30 lb") when there's no X size, as leaders already do.
- Any other code that reads a tippet's X size handles `None` (found while implementing).
- The questionnaire's `_find` matches a key value of `None` with `IS NULL`.

## Architecture

### API: `api/app/questionnaire/`

- `rules/` replaces `rules.py`:
  - `common.py`: `Level`, `Component`, `Pick`, `_join`.
  - `creeks.py`: the current `rules.py` moved without changes; its `Answers` is renamed
    `CreekAnswers`.
  - `rivers.py`: `RiverAnswers(experience, target, flies, budget)` and the tables above:
    rod weight and line type from `(target, flies)`, rod from `(weight, budget, fast)`, reel
    from `(weight band, budget)`, line, then leader and tippet, each with its reason.
  - `__init__.py`: `recommend(answers)` dispatches on the answers' type and re-exports the
    names callers use, so `from app.questionnaire import rules` keeps working.
- `schemas.py`: `AnswersQuery` gets `place: Literal["small_creeks", "large_rivers"]`, optional
  `trout`, `only_rod`, `target` and `flies`, and a `model_validator` requiring `trout` and
  `only_rod` (and neither river field) for creeks, or `target` and a `flies` value valid for
  that target (and neither creek field) for rivers.
- `router.py`: builds `CreekAnswers` or `RiverAnswers` from the query; otherwise unchanged
  apart from the `IS NULL` match in `_find`.

Errors:

- A missing or extra answer for the place, or a flies value that doesn't belong to the
  target: 422.
- A pick missing from the catalog: 500 with a log line naming the part, as today.

### Frontend: `src/features/builder/`

- `api/questionnaire.ts`: `Answers` becomes a union discriminated by `place`:
  `{ place: 'small_creeks', trout, onlyRod, experience, budget }` or
  `{ place: 'large_rivers', target, flies, experience, budget }`; `getRecommendation` sends
  the fields of whichever it gets.
- `utils/questions.ts`: `SHARED_QUESTIONS` (experience, place), `FOLLOW_UPS` per place,
  `BUDGET`, and `FLIES_BY_TARGET`. `questionsFor(draft)` returns the current five-question
  list; the flies question's options come from the draft's target. Large rivers loses
  `comingSoon`.
- `components/QuestionnaireDialog.tsx`: walks `questionsFor(draft)` instead of the fixed
  list, clears later answers when one changes, and `toAnswers` builds the right union member.
- The tippet spec line shows strength when there's no X size.
- CLAUDE.md: the note about picks keying on names points to `app/questionnaire/rules/`.

## Testing

API:

- `test_questionnaire_rules.py`: all 72 river combinations (3 experience × 8 target/flies
  pairs × 3 budget) return five picks with non-empty reasons; spot checks match
  the tables (trout + dries gives a 5wt with the 9' 5X leader; predators + unweighted gives
  the heavy sink tip; high experience + medium budget + trout dries gives the Redington EDC
  590-4; low experience + high budget + 7wt gives the R8 Core 790-4). Creek tests are
  unchanged.
- `test_questionnaire.py`: every river combination resolves to catalog rows and passes
  `check_build` with no warnings; 422 for creeks with `target`, rivers with `trout`,
  smallmouth with `unweighted`, and a missing `flies`. The 36 creek combinations still pass.
- Compatibility tests: a wire tippet suits any leader and isn't flagged light on a 10wt rod.
- Migration test: the new parts and the NULL tippet size load.

Frontend (Vitest):

- Picking Large rivers shows the target question; each target shows its own flies options.
- Going Back and changing the target clears the flies answer.
- The last answer sends the river query and loads the five parts.

Before the PR: `uv run pytest`, `pnpm test`, `npm run build`, `npm run lint`,
`pnpm check:contrast`, and a browser pass through a trout, a smallmouth and a musky path.
