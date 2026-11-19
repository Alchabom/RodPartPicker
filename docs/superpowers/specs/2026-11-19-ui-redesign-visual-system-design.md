# UI Redesign, Sub-project 1: Visual System and App Shell

**Date:** 2026-11-19
**Branch:** `oa-ui-redesign`, stacked on `oa-part-details` (PR #47), whose part images and Buy links the redesign shows
**Updates:** `docs/architecture_guidelines.md` (component layers rule), `CLAUDE.md` (frontend test command, styles note)

## Goal

Make RodPartPicker feel like a polished web app that is also a fly shop you walk into: a riverside local shop in the southern Appalachians, warm at the door and precise at the counter. This spec covers the first of four sub-projects: the visual system, the app shell and the landing page.

The team will present this work, so each decision below records its reason.

## The redesign as a whole

The redesign is split into four sub-projects. Each gets its own spec, plan and PR, so the app is demoable after every step.

1. **Visual system and app shell (this spec).** Tokens, the component layers, the header and footer, the landing page and the frontend test runner.
2. **Existing screens.** Builder, parts browse, My Builds, Completed Builds list and detail, Login, Welcome and Not found, moved onto the component layers. Removes the deprecated color aliases. The Completed Builds card and detail page leave room for votes and comments.
3. **Products and part detail pages (optional).** `/products` and `/products/:type/:id` show the catalog the builder already loads. They are frontend only. "Add to build" uses an intent link (`/builder?add=...`) like the existing `?copy=` pattern, so the features stay independent. The catalog fetcher moves out of `features/builder` when this starts.
4. **Community.** Upvotes on published builds, then maybe comments. This is API and UI work with its own migrations, tests and abuse limits.

## Direction

- **World.** The southern Appalachian brook trout (the only trout native to those mountains), a riverside local shop, and clean spec sheets where you compare parts.
- **Character.** Rooted, plain-spoken, exact.
- **Shop front.** The Blue Ridge at first light: layered ridgelines fading into haze, drawn in SVG.
- **Signature.** The brook trout's fin edge, its lower fins' white leading edge, black stripe and orange. The stripe marks the one active thing on a screen (the primary button and the part being worked on) and appears nowhere else.
- **Fit marker.** "Fits your build" is a red spot with a blue halo, as on the fish's flank.

The approved mockups are in `.superpowers/brainstorm/47207-1795108773/content/` (`brookie-direction-v3.html` option A for the hero and `type-pairing.html` option B for type). They are local and untracked. This spec is the record.

### Decisions

| Decision | Reason |
|---|---|
| Brook trout and Blue Ridge, not a generic "outdoor" look | The first round of palettes was rejected as generic. Taking the color, the signature and the fit marker from one real fish makes the app impossible to mistake for another |
| Ridges over the fish's flank for the hero | The team's choice. The flank's markings were the bolder option, but the ridges read clearly as Appalachian |
| Public Sans for everything | The team's choice from three options. It comes from the US government's design system, so it reads like park signage, and it stays calm in long spec tables. No handwriting font and no monospace, which read as AI-generated |
| One accent, belly orange | Rich color stays in the shop front. The chrome is quiet, so the fin edge and the spots stand out |
| Light theme only | Dark mode doubles the color work for little demo value. The shadcn `dark:` variant stays tied to the unused `.dark` class |
| Hide "Products" until sub-project 3 | A link to nothing is worse than no link |
| Retheme in place, through tokens and shadcn variants | Every existing screen gets closer to the new look right away, with one system to maintain |

## Layer 0: tokens

All tokens live in `src/styles/index.css`, which stays the single source of truth. The current palette (`te-papa-green`, `plantation`, `spectra`, `tasman`, `sulu`, `cod-gray`, `linen`, `bone`, `twine`) is replaced.

### Color

| Token | Hex | Use |
|---|---|---|
| `stone-page` | `#F3F2EE` | Page background |
| `stone-card` | `#FCFBF9` | Cards, popovers, dialogs |
| `stone-raised` | `#EAE8E2` | Active row, input, secondary button |
| `ink` | `#1D1F1B` | Primary text |
| `ink-2` | `#545A52` | Secondary text |
| `ink-3` | `#656A61` | Muted text, icons, meta |
| `hairline` | `ink` at 9% | Borders |
| `belly` | `#B5491B` | Accent: primary action, selection, active link underline |
| `belly-ink` | `#8F3814` | Focus ring and accent text on raised surfaces |
| `spot` | `#C23B2E` | Fit marker center |
| `halo` | `#7FA3C4` | Fit marker ring |
| `olive` | `#36402A` | Display headlines |
| `haze-1` … `haze-5` | `#CBD4D6`, `#A8B8C0`, `#7C93A1`, `#4F6677`, `#33424A` | Ridge layers (far to near), footer background (`haze-5`) |
| `dawn` | `#EEE5D6` | Hero sky gradient, with `stone-page` above it |
| `negative` | `#B4322B` | Errors and destructive actions |
| `--fin-edge` | `linear-gradient(90deg, stone-card 0 3px, ink 3px 6px, belly 6px)` | The signature stripe, defined once and used by `Button` `primary` and `FinEdge` |

shadcn's variables map onto these: `--background` → `stone-page`, `--card`/`--popover` → `stone-card`, `--foreground` → `ink`, `--muted` → `stone-raised`, `--muted-foreground` → `ink-3`, `--primary` → `belly`, `--primary-foreground` → `#FFFFFF`, `--secondary` → `stone-raised`, `--secondary-foreground` → `ink`, `--accent` → `stone-raised`, `--accent-foreground` → `ink`, `--border`/`--input` → `hairline`, `--ring` → `belly-ink`, `--destructive` → `negative`.

Contrast (WCAG AA, 4.5:1 for text), checked in CI by `scripts/check-contrast.mjs`:

| Pair | Ratio |
|---|---|
| White on `belly` | 5.34 |
| `belly` on `stone-page` | 4.77 |
| `ink-2` on `stone-page` | 6.33 |
| `ink-3` on `stone-page` / `stone-raised` | 4.95 / 4.53 |
| `olive` on `stone-page` | 9.75 |
| `stone-page` on `haze-5` | 9.29 |
| `belly-ink` on `stone-page` / `stone-raised` | 6.83 / 6.25 |
| White on `negative` / `negative` on `stone-page` | 6.12 / 5.46 |

`ink-3` was darkened from the mockup's `#767B72` (3.87:1), which failed.

### Type

- `--font-sans` and `--font-heading` are Public Sans, loaded from Google Fonts with weights 400, 500 and 600 and `display=swap`.
- Weights: 400 for text, 500 for headings, buttons and emphasis, 600 only for the wordmark.
- Scale: 12 (meta), 13–14 (secondary), 15 (body, nav), 18 (hero subhead), 28–32 (page titles), 52–56 desktop and 36–40 mobile (hero headline, `-0.02em` tracking). No tracking under 16px.
- Every price, weight, length and count uses `tabular-nums`.
- Sentence case everywhere. No uppercase tracked labels and no italic.

### Spacing, radius, motion

- 4px grid. Controls 8px radius, cards 14px, nested radius = outer − padding (never below 4).
- One easing curve, `cubic-bezier(0.22, 1, 0.36, 1)`, and three durations: 150ms (hover, press), 200ms (menus, sheets), 400ms (entrances).
- Transitions name their properties (`transition-colors`, `transition-[transform,opacity]`). No `transition-all`.
- Light shadows only: `0 1px 2px rgb(0 0 0 / .05)` for small things and `0 8px 24px rgb(0 0 0 / .08)` for floating cards.

### Deprecated aliases (removed in sub-project 2)

Tailwind drops unknown classes without an error, so removing the old palette names would strip colors from the current screens silently. Until sub-project 2 finishes, the old names stay as aliases in a block marked `/* Deprecated: removed in sub-project 2 */`:

| Old | Maps to |
|---|---|
| `te-papa-green`, `plantation` | `olive` |
| `spectra` | `belly` |
| `tasman` | `ink-2` |
| `sulu` | `belly` at 20% (as a fill), for the current "fits" highlight |
| `cod-gray` | `ink` |
| `linen` | `stone-page` |
| `bone` | `stone-raised` |
| `twine` | `ink-3` |

Sub-project 2 is done only when `grep -rE "te-papa-green|plantation|spectra|tasman|sulu|cod-gray|linen|bone|twine" src` returns nothing.

## Component layers

Features currently style raw shadcn components at each call site (31 `<Button>`s, about 40 table parts and 186 `className`s in `src/features`). The redesign gives styling one home per decision.

### Layer 1: primitives (`src/components/ui/`)

These are shadcn components. We own them and edit their variants instead of overriding them at call sites.

- **`Button`.** Variants: `primary` (belly fill, white text, the fin edge on the leading side, drawn by a `::before` from the `--fin-edge` token), `secondary` (`stone-raised` with a hairline), `quiet` (text only, `stone-raised` on hover), `link` (underlined, `ink`), `destructive`. Sizes `sm` 32px, `md` 36px (default), `lg` 44px (hero), plus the icon sizes. `transition-all` becomes `transition-colors`, and press scales to 0.98. `default` is renamed `primary`, and current `default`/`outline`/`ghost` call sites move to `primary`/`secondary`/`quiet`.
- **`Badge`.** Meaning-based variants: `fit`, `recommended`, `muted`. Color variants are removed. A shop component puts a `FitSpot` inside a `fit` badge. The primitive doesn't.

Primitives never import shop components. Shared visuals, like the fin edge, live in tokens that both layers read.
- **`Table`.** A `density` prop (`compact` 36px rows, `comfortable` 44px rows) and a `numeric` cell prop that right-aligns and uses `tabular-nums`.
- **Added with the shadcn CLI:** `card`, `separator`, `sheet`, `skeleton` and `tooltip`. They use the existing `radix-ui` package, so no new runtime dependencies are added.

### Layer 2: shop components (`src/components/shop/`)

Shared compositions built only from Layer 1 and tokens, with an `index.ts` barrel. Imported as `@components/shop`.

| Component | Does |
|---|---|
| `FinEdge` | The white / black / orange stripe from `--fin-edge`, as an element for active rows and the logo mark |
| `FitSpot` | Red spot with blue halo. Has an accessible label ("Fits your build") unless `decorative` |
| `PriceTag` | A price through `formatPrice`, `tabular-nums`, with "—" for no price |
| `SpecLine` | Joins specs with " · " ("8′6″ · 4 wt · Medium · 4 pc"), muted |
| `PageHeader` | Page title, optional description and an actions slot |
| `EmptyState` | Title, one line of direction and one action |
| `Container` | The page width: `max-w-6xl`, 24px side padding, 16px under `sm` |
| `SiteHeader` | The header (see below) |
| `SiteFooter` | The footer (see below) |
| `BuildCard` | A published build card, moved from `features/catalog/components/PublishedCard.tsx`. Has a reserved, empty slot for a vote count (sub-project 4) |

### The rule

Added to `docs/architecture_guidelines.md`:

> Features compose shop components (`@components/shop`) and reach for primitives (`@components/ui`) only when no shop component fits. Features don't change a primitive's color, radius, typography or spacing through `className`. Needing to is a sign of a missing variant or shop component, which gets added there. Layout classes (grid, flex, gap, width, margin between blocks) are fine at call sites.

Sub-project 1 applies the rule to the new code. Sub-project 2 applies it to the existing screens.

## App shell

`Layout` in `src/routes/AppRoutes.tsx` only composes: `SiteHeader`, the routed page, `SiteFooter`, in a full-height column.

### SiteHeader

- 56px tall, `stone-page` background, a hairline underneath.
- Left: a small vertical `FinEdge` mark and the "RodPartPicker" wordmark (Public Sans 600, 17px), linking to `/`.
- Center: **Builder** (`/builder`) and **Completed builds** (`/builds`), using react-router's `NavLink`. The current link gets `aria-current="page"`, `ink` text and a 2px `belly` underline. Other links are `ink-2`, turning `ink` on hover.
- Right: an `account` slot. `AppRoutes` passes `<UserMenu />` (`<SiteHeader account={<UserMenu />} />`), so the shared header never imports a feature.
- Under `md`, the links move into a `Sheet` that slides in from the right, opened by a `quiet` icon button labeled "Menu". The `Sheet` closes on navigation.
- `UserMenu` (in `features/auth`) swaps its `tasman`/`sulu` classes for a `quiet` `Button` trigger and the `link` style for "Log in". Its behavior doesn't change.

### SiteFooter

- The two nearest ridge layers (`haze-4`, `haze-5`) as a 48px SVG top edge, then a `haze-5` band.
- Contents in `stone-page`: the wordmark, the same nav links, and one line: "A capstone project. Prices and links come from each brand's own site."

## Landing page (`features/home`)

`src/App.tsx` is removed. The index route renders `HomePage` from the new `features/home` slice:

```
src/features/home/
  components/HomePage.tsx
  components/RidgeScene.tsx
  components/SampleRig.tsx
  components/RigSteps.tsx
  components/RecentBuilds.tsx
  utils/sampleRig.ts
  index.ts
```

### Hero

- `RidgeScene` is an inline SVG: a `stone-page` → `dawn` sky, a pale sun disc, and five ridge paths in `haze-1` … `haze-5`, far to near. It is `aria-hidden`, scales with `preserveAspectRatio="xMidYMid slice"`, and fills the first screen below the header (`min-h-[calc(100svh-56px)]`, capped at 760px) with no empty band underneath.
- Text sits in the open sky, top left, at most 600px wide:
  - Headline (`h1`, `olive`): **Rig a fly rod where every part fits**
  - Subhead (`ink-2`, 18px): **Pick a rod, reel, line, leader and tippet. We check each part against the rest of your rig and tell you why it fits.**
  - **Start a build** (`Button` `primary` `lg`, → `/builder`) and **See completed builds** (`link`, → `/builds`).
- `SampleRig` is a static card rising out of the nearest ridge on the right: a title, "3 of 5 parts", and rod, reel and line rows with `SpecLine`, `PriceTag` and `FitSpot`. The line row is active (`stone-raised` and a vertical `FinEdge`).
  - Its data (`utils/sampleRig.ts`) is three real catalog parts, copied with their real names, specs and prices from the seed migrations. The plan picks them. They must pass `check_build` with no warnings. The mockup's names and prices were illustrative and are not used.
  - Under `md` the card stacks below the buttons and shows the rod and reel rows only.

### RigSteps: "How a rig goes together"

Five steps in rigging order. This is the only numbered sequence on the site, because the order is real. Each step's line comes from `api/app/compatibility/rules.py`:

1. **Rod.** Sets the line weight and the water for everything after it.
2. **Reel.** Its rated range has to include the rod's weight.
3. **Line.** The same weight as the rod, or one up for a fast rod, and inside the reel's range.
4. **Leader.** Heavy leaders (10 lb and up) only go on 7 wt rods and heavier.
5. **Tippet.** The same X size as the leader's tip, or one size finer.

A connecting line runs through the steps and narrows at steps 3, 4 and 5 (3px, 2px, 1px), like a tapered leader. It's `ink-3`, quiet, and not a second signature. Laid out horizontally from `lg`, vertically below. The section ends with a **Start a build** link.

If the rules change, this copy changes with them. A comment in `RigSteps.tsx` points to `rules.py`.

### RecentBuilds: "Recently rigged"

- Shows the first 3 items of `listPublished({ page: 1 })`, newest first as the API returns them, as `BuildCard`s. Followed by **See all completed builds** → `/builds`.
- It uses `publishedKeys.list({ page: 1 })`, the same key as `/builds` page 1, so the two share a cache.
- `listPublished`, `getPublished` and their response types move from `features/catalog` to `src/lib/published.ts`, next to `publishedKeys`. `features/catalog` then imports them from there.
- States:
  - Loading: three `Skeleton` cards of the card's size.
  - Error: the section doesn't render. The landing page works without it, as the builder does without warnings. The error is logged with `console.error`.
  - No builds: `EmptyState`, "No builds published yet", "Publish yours from the builder.", action **Start a build**.

### Motion

The headline, subhead and actions fade in and rise 8px over 400ms with a 50ms stagger, on first load only. Nothing else on the page animates. `prefers-reduced-motion: reduce` turns the entrance off.

## Testing and verification

### Frontend test runner

Add `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` and `jsdom` as dev dependencies with `pnpm add -D`. Configure a `test` block in `vite.config.ts` (environment `jsdom`, a setup file that imports `@testing-library/jest-dom/vitest`), so tests reuse the same path aliases. Add `"test": "vitest run"` to `package.json`. Tests live next to their files as `*.test.tsx`. Update `CLAUDE.md`: the frontend now has tests (`pnpm test`).

Tests for this sub-project:

| Test | Checks |
|---|---|
| `SiteHeader.test.tsx` | The current route's link has `aria-current="page"`; the menu button opens the `Sheet`, and choosing a link closes it; the `account` slot renders |
| `RecentBuilds.test.tsx` | Skeletons while loading; at most 3 cards for a longer list; the empty state for no items; nothing rendered on an error (with `apiFetch` mocked) |
| `button.test.tsx` | `primary` sets `data-variant="primary"` (which the fin-edge CSS targets); `asChild` still works with a `Link` |
| `FitSpot.test.tsx` | Has the "Fits your build" label by default; `decorative` hides it from assistive technology |
| `sampleRig.test.ts` | The sample rig's weights and water satisfy the same rules as `check_build` (rod weight = line weight, reel range includes both, water tags compatible) |

### Other checks

- `pnpm build` and `pnpm lint` pass.
- `scripts/check-contrast.mjs` (Node, no dependencies) reads the color tokens from `index.css` and fails if any pair in the contrast table is below 4.5:1. Run with `pnpm check:contrast`.
- Visual check: headless Chrome screenshots of `/` at 1440×900 and 390×844, with the API running and published builds seeded, compared against the approved mockups. Also: a keyboard pass through the header, hero and mobile menu, a pass with reduced motion, and a look at `/builder` and `/builds` to confirm the deprecated aliases keep them coherent. The screenshots are saved under `.superpowers/verification/` with the commit hash.

## Success criteria

- The palette, type, radius and motion tokens above are in `index.css`, with shadcn variables mapped and the deprecated aliases in place.
- `Button`, `Badge` and `Table` have the variants above, and `card`, `separator`, `sheet`, `skeleton` and `tooltip` are added.
- `@components/shop` exports the ten shop components, and the architecture guidelines carry the layer rule.
- Every route shows `SiteHeader` and `SiteFooter`. The mobile menu works under `md`.
- `/` shows the hero, rig steps and recent builds as specified, at both sizes, with no empty band.
- `App.tsx` and `PublishedCard.tsx` are gone. The published fetchers live in `src/lib/published.ts`.
- `pnpm test`, `pnpm build`, `pnpm lint` and `pnpm check:contrast` pass.
- Existing screens still work and look coherent.

## Out of scope

- Redesigning the existing screens (sub-project 2).
- Products and part detail pages (sub-project 3).
- Votes and comments (sub-project 4). Only the reserved card slot is in this spec.
- Dark mode, a logo beyond the wordmark and fin-edge mark, and generated images.
- Any API change.
