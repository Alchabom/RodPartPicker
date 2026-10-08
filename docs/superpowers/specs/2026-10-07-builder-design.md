# Builder Feature — Design

**Date:** 2026-10-07
**Status:** Approved in chat, pending spec review

## Goal

Make "Start Your Build" usable. Inspired by PCPartPicker's build list, tailored to fly/rod fishing components: **Rod, Reel, Line, Leader, Tippet**. Each component row opens a shadcn dropdown of **brands**; choosing a brand opens a page listing that brand's parts of that component type. All data is mock for now.

## User Flow

1. **Home (`/`)** — "Start Your Build" button and the navbar "Builder" link navigate to `/builder`.
2. **Builder (`/builder`)** — table with one row per component:
   - Columns: Component (lucide icon + name), Selection, Price.
   - Empty row: `+ Choose a <Component> ▾` button opens a shadcn `DropdownMenu` listing the brands that have parts of that component in the dataset. Each item shows a brand initials badge + brand name. Last item (after a separator): **All brands**.
   - Filled row: selected part name (with brand), price, a `Change ▾` button (same brand dropdown), and an `✕` remove button.
   - Footer row: **Total** = sum of selected part prices.
3. **Brand parts (`/builder/:component/:brand`)** — e.g. `/builder/rod/st-croix`. Heading "<Brand> <Components>", back link to `/builder`, and a table of that brand's parts for the component: Name, component-specific spec columns, Price, **Add** button. `:brand` = `all` lists every brand's parts for that component (adds a Brand column).
   - **Add** sets that part as the build's selection for the component (replacing any previous one) and navigates to `/builder`.
   - Unknown `:component` or `:brand` renders a "Not found" message with a link back to `/builder`.

### Spec columns per component

| Component | Columns |
|---|---|
| Rod | Length, Power, Action |
| Reel | Size, Gear Ratio |
| Line | Type, Test (lb) |
| Leader | Material, Test (lb) |
| Tippet | X-Size, Material |

## Architecture

Follows `docs/architecture_guidelines.md` (feature slice + barrel file).

```text
src/
├── components/ui/          # shadcn-generated: button, dropdown-menu, table, badge
├── lib/utils.ts            # shadcn cn() helper
├── routes/AppRoutes.tsx    # react-router route table + shared layout (navbar)
├── features/builder/
│   ├── api/mockParts.ts    # mock brands + parts; query helpers
│   ├── components/
│   │   ├── BuilderPage.tsx
│   │   ├── ComponentRow.tsx
│   │   ├── BrandMenu.tsx
│   │   └── BrandPartsPage.tsx
│   ├── hooks/
│   │   ├── BuildProvider.tsx   # context provider
│   │   └── useBuild.ts
│   ├── types/index.ts
│   └── index.ts            # public API: BuilderPage, BrandPartsPage, BuildProvider
├── App.tsx                 # home page content (hero)
└── main.tsx                # BrowserRouter + BuildProvider + routes
```

### Types

```ts
type ComponentType = 'rod' | 'reel' | 'line' | 'leader' | 'tippet'

interface Brand { id: string; name: string }           // id is URL slug

interface Part {
  id: string
  component: ComponentType
  brandId: string
  name: string
  price: number                                         // USD
  specs: Record<string, string>                         // keys match the component's spec columns
}

type Build = Partial<Record<ComponentType, Part['id']>>
```

A `COMPONENTS` constant defines order, display name, plural, lucide icon, and spec column keys for each `ComponentType`.

### Mock data (`api/mockParts.ts`)

3–4 brands per component, 3–5 parts per brand. Exposes pure helpers: `getBrandsFor(component)`, `getParts(component, brandId | 'all')`, `getPart(id)`, `getBrand(id)`. Brand dropdowns are derived from parts, so they only show brands with data. Replacing this file with real data/API calls is the future swap point.

### Build state

`BuildProvider` holds `Build` in React context with `selectPart(component, partId)` and `removePart(component)`. Persisted to `localStorage` under a versioned key (`rpp:build:v1`); reads/writes wrapped in try/catch; unknown part ids on load are dropped. Stores ids only and resolves parts from the dataset.

### Icons (lucide-react)

Mapping lives only in the `COMPONENTS` constant: Rod → `FishingRod`, Reel → `Disc3`, Line → `Spline`, Leader → `Link`, Tippet → `Minus`. If an icon is missing from the installed lucide version, substitute `Fish` for that component; no other code depends on the choice.

## Styling

- Tailwind v4 via `@tailwindcss/vite`, shadcn initialized for Vite (`components.json`, `@/` alias already exists).
- shadcn theme tokens mapped to the existing palette in `src/styles/index.css` (spectra/te-papa-green primary, linen background, bone muted, sulu accent).
- Existing `App.css` is kept; verify home page after Tailwind preflight and fix any regressions.

## Out of Scope

Compatibility checks, share URL, base/promo/shipping/tax/where columns, search/filter/sort on brand page, accounts and saved builds, real data/backend.

## Verification

No test framework exists. Verify with `tsc -b`, `oxlint`, `vite build`, and a manual dev-server pass: home → builder → open dropdown → pick brand → Add part → back to builder with selection and total → Change / ✕ → refresh keeps build → unknown route shows Not found.
