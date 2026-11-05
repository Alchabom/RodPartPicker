# Server-Side Compatibility Design

**Date:** 2026-11-04
**Replaces:** "PR 3: Compatibility" in `2026-10-19-fastapi-backend-design.md`
**Updates:** §7 of `docs/database/schema-design.md`

## Goal

Move compatibility decisions from the browser into the FastAPI API, and extend them from rod matching to whole-build checks. The API also exposes the water filter that the planned questionnaire will use.

## Success criteria

- Every compatibility rule exists once, in `api/app/compatibility/rules.py`.
- `src/features/builder/utils/compatibility.ts` is deleted, and no part IDs are hardcoded anywhere.
- The parts page highlights matches from the API, and the build page shows warnings from the API.
- A mismatch never blocks a user from adding or saving a part (decision D9 in the schema doc).
- If a compatibility request fails, the builder still works, without highlights or warnings.
- `uv run pytest`, `pnpm exec tsc -b` and `pnpm lint` pass.
- Each PR is under 500 lines, excluding pure deletions.

## Out of scope

- **The questionnaire.** It gets its own spec. This spec only provides the API it will call.
- Calling `/api/builds` from the frontend. The current build stays in `localStorage`.
- A check endpoint for saved builds. Nothing in the frontend uses saved builds yet.
- Filling catalog gaps (see "Known catalog gaps").
- Removing Express. That stays a separate cutover PR.

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Structure | One rules module, two read endpoints | Highlighting and build warnings stay separate but share the same rules |
| HTTP method | `GET` for both endpoints | Both only read data, and their inputs are a few optional values |
| Check input | Part IDs, not a build ID | An in-progress build lives in `localStorage` and has no saved ID |
| Where rules run | Python, not SQL | Each rule exists once. The catalog is a few hundred rows, so loading it per request is fine |
| Line head weight | No warning | 49 of 58 lines are above the AFTMA range, so a warning would be noise. Heavy lines are a recommendation instead |
| Heavy lines | Recommended for fast rods only; a normal match on any other rod | Ruling them out would leave some `both` rods with no line. Heavy does not mean saltwater |
| `is_trout` flag | Dropped | Water tags and leader strength replace it |
| Leader weight | Heavy leaders match only rods of 7 wt and up | Water alone would show them as fitting a 3-wt trout rod |
| Mismatch response | `200` with warnings | A mismatch is advice, not an error |

## Rules

### Water

Each part's `water` column is `fresh`, `salt` or `both`. Water matching works from these tags and does not depend on the `water` query parameter.

The **effective water** for a request is:

1. the `water` query parameter, if sent;
2. otherwise the selected rod's tag, if it is `fresh` or `salt`;
3. otherwise nothing, so no water filter applies. This covers a `both` rod, or no rod, with no parameter.

A part **passes water** if there is no effective water, its tag equals the effective water, or its tag is `both`.

The parameter is needed only where the rod's tag can't answer the question: when no rod is selected, when the rod is `both`, and to apply the saltwater minimum below.

### Matching

| Part | With a rod selected | With no rod selected |
|---|---|---|
| Rod | Passes water | Passes water |
| Reel | Rod weight within `min_line_weight`–`max_line_weight`, and passes water | Passes water |
| Line | `line_weight` equals the rod's, and passes water | Passes water |
| Leader | Passes water, and not a heavy leader on a rod under 7 wt | Passes water |
| Tippet | Passes water | Passes water |

**Saltwater minimum:** with `water=salt` sent as a parameter, rods and lines must also be 7 wt or above, and reels must have `max_line_weight >= 7`. It does not apply when salt comes from the rod's tag, so a `salt` 6-wt rod chosen directly still shows its matches.

**Heavy leader:** `strength_lb >= 10`. A blank `strength_lb` counts as not heavy. In the current catalog these are Mirage Big Game, Absolute Streamer and Absolute Saltwater.

**Recommended line:** the line matches, a rod is selected, the rod's `action` is `fast`, and `head_weight_grains` is above `grains_max` for the line's weight. A blank `action` or blank head weight means not recommended.

### Build warnings

Each warning needs both of its parts to be selected.

| Code | Fires when |
|---|---|
| `ROD_LINE_WEIGHT` | Rod and line weights differ |
| `REEL_LINE_WEIGHT` | Line weight is outside the reel's range |
| `ROD_REEL_WEIGHT` | Rod weight is outside the reel's range |
| `ROD_LEADER_WEIGHT` | A heavy leader is on a rod under 7 wt |
| `LEADER_TIPPET_SIZE` | Tippet `x_size_id` is neither the leader's nor one higher (one size finer). Skipped if the leader has no X-size |
| `WATER_MISMATCH` | The selected parts include both a `fresh` and a `salt` tag. Needs at least two selected parts |

## API

### `GET /api/compatibility/parts`

Query parameters, all optional: `rodId` (positive integer), `water` (`fresh` or `salt`).

```json
{
  "rod": [1, 2],
  "reel": [4],
  "line": [7, 9],
  "leader": [1],
  "tippet": [3],
  "recommendedLine": [9]
}
```

With neither parameter, every part's ID is returned and `recommendedLine` is empty.

### `GET /api/compatibility/check`

Query parameters, all optional positive integers: `rodId`, `reelId`, `flyLineId`, `leaderId`, `tippetId`. These names match `BuildIn`.

```json
{
  "warnings": [
    { "code": "ROD_LINE_WEIGHT", "message": "This line is 6 wt, but your rod is 5 wt." }
  ]
}
```

`code` is the stable contract, and tests and UI logic use it. `message` is display text and can change. A build with no problems returns an empty list.

### Errors

| Case | Response |
|---|---|
| A part ID that doesn't exist | `400`, `{"detail": "Referenced part does not exist"}`, as builds does |
| `water` isn't `fresh` or `salt`, or an ID isn't a positive integer | `422` |

## Data

**Migration `api/migrations/015_water_tags.sql`** changes data only. `014` is already taken by `014_leader_prices.sql`. Both columns already allow `both`.

```sql
UPDATE tippets SET water = 'both'
WHERE x_size_id IN (SELECT id FROM x_sizes WHERE label IN ('0X', '1X', '2X', '3X'));

UPDATE reels SET water = 'both'
WHERE name LIKE '%(sealed)%' AND max_line_weight >= 7;
```

This changes 16 of 32 tippets and 13 reels. Sealed-drag reels being suitable for salt is our assumption. The seed data defaulted every reel not labelled "(saltwater)" to `fresh`. Lines and leaders are unchanged.

## Backend structure

| File | Purpose |
|---|---|
| `app/compatibility/__init__.py` | Package marker |
| `app/compatibility/rules.py` | Plain functions for matching, recommendations and `check_build`, plus named constants for the 7 wt and 10 lb thresholds. No database or FastAPI imports |
| `app/compatibility/schemas.py` | `CompatibleParts`, `BuildWarning`, `BuildCheck`, using `CamelModel` |
| `app/compatibility/router.py` | Loads rows, calls the rules, returns the result |
| `app/parts/models.py` | Adds a `LineWeight` model for `line_weights`, which recommendations need |
| `app/main.py` | Registers the router |

**Who writes what** (the project's agreed split): Omar writes `rules.py`, the schemas, the router and `LineWeight`. Claude writes the migration and test fixtures, and reviews everything. The frontend change is paired.

## Frontend

All paths are in `src/features/builder/`.

| File | Change |
|---|---|
| `api/compatibility.ts` (new) | `fetchCompatibleParts(rodId, signal)` and `checkBuild(partIds, signal)`, using `apiFetch` |
| `components/BrandPartsPage.tsx` | Fetches matches when the rod changes, using an `AbortController`. `fitsRod` becomes a set lookup on `part.dbId`. `ROD_MATCHED` gains `tippet`. Recommended lines get a "Recommended" badge |
| `components/BuilderPage.tsx` | Warning panel with one line per warning. Refetches when the selection changes, with an `AbortController`. Runs only with two or more parts selected |
| `utils/compatibility.ts` | Deleted |
| `types/index.ts`, `api/parts.ts` | Remove `Part.lineWeight` and `Part.lineWeightRange`. Only `compatibility.ts` reads them; `parts.ts` keeps its row fields for the spec columns |

**Behaviour:**

- **Loading:** the "N of M match your rod" banner stays hidden until the response arrives. Nothing is highlighted before then.
- **Failure:** the error is logged, and the page shows no highlights or warnings.
- **Stale parts:** IDs in `localStorage` that no longer resolve through `getPart` are left out of `/check`, so an old build can't cause a `400`.
- **`water` parameter:** the frontend doesn't send it yet. Water matching still works, from the rod's tag. The questionnaire will be the first caller to send it.

## Testing

**`api/tests/test_compatibility_rules.py`** needs no database and covers boundaries:

- both ends of a reel's range, and one weight outside each end;
- 6 wt and 7 wt under `water=salt`, and a reel whose range ends at 6 vs at 7;
- each row of the effective water rules;
- leaders just under 10 lb and at 10 lb, on 6-wt and 7-wt rods, and a blank `strength_lb`;
- head weight at `grains_max` and one grain over;
- a blank `action`, and a non-fast rod with a heavy line, which matches but isn't recommended;
- each warning code firing, not firing, and not firing when one of its parts is missing;
- a tippet the same size, one finer and one heavier than the leader, and a leader with no X-size.

**`api/tests/test_compatibility.py`** goes through the API:

- the response shape and camelCase keys of both endpoints;
- `400` for unknown IDs and `422` for invalid `water` or IDs;
- assertions use `in` and `not in` on inserted IDs, because seeded parts also appear in results.

**Migration test:** after migrating, exactly 16 tippets and 13 reels match the retag conditions and are `both`.

**Frontend:** no test runner exists, so verify with `pnpm exec tsc -b`, `pnpm lint` and a browser pass. Highlights will differ from `main` on purpose. For example, a `fresh` rod no longer highlights salt lines, and tippets are now highlighted. Check results against these rules, not against `main`.

## Delivery

The work ships as a stack of PRs, each based on the one before and merged from the bottom up:

1. **`docs-compatibility`:** this spec and the implementation plan.
2. **`api-compatibility-rules`:** the migration, `LineWeight` and the matching rules.
3. **`api-compatibility-warnings`:** the build warnings.
4. **`api-compatibility`:** the endpoints and the docs below.
5. **`builder-compatibility`:** the frontend change. It needs the FastAPI server running, because Express won't have these routes.

**Docs in `api-compatibility`:** rewrite §7 of `schema-design.md` to match this spec, and mark PR 3 of the 10-19 spec as replaced by this document.

### For review (must go in the `api-compatibility-rules` description)

Omar's teammate should review this rule: **heavy leaders (10 lb and up) only match rods of 7 wt and up.** Water tags alone would show Mirage Big Game and Absolute Streamer as fitting a 3-wt trout rod, so this rule keeps them off light rods. Reviewers should check both the rule and its 10 lb and 7 wt thresholds.

## Known catalog gaps

These are accepted for now and are not fixed by this work.

- **7 freshwater rods at 9–11 wt** have only salt lines at their weight, so no line is highlighted for them.
- **10 rods at 1, 2, 14 and 15 wt** have no line at their weight in the catalog.
- **Few heavy freshwater lines:** freshwater fast rods will rarely see the "Recommended" badge, because 48 of the 49 heavy lines are salt.
- **Heavy leaders have no X-size,** so `LEADER_TIPPET_SIZE` never fires on them.

## Open item

**Avid Trout-Gold 7-wt** has a 270gr head against a 177–193 range. Check it against the product listing. If it's a typo, fix it in a new migration. It affects only whether that line is recommended for fast rods, so it doesn't block this work.
