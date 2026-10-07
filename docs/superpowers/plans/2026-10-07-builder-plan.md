# Builder Feature — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-10-07-builder-design.md`
**Date:** 2026-10-07
**Package manager:** pnpm (`node_modules/.pnpm` present; Node 24)

Each task ends with its verification and a commit. Run `pnpm exec tsc -b`, `pnpm lint` after every task that touches TS. No test framework exists, so verification is type-check + lint + build + manual dev-server checks.

---

## Task 1 — Tailwind v4 + shadcn setup

**Files:** `package.json`, `vite.config.ts`, `tsconfig.json`, `src/styles/index.css`, `components.json` (new), `src/lib/utils.ts` (new), `src/components/ui/*` (new)

1. `pnpm add tailwindcss @tailwindcss/vite`
   - If the plugin's peer range rejects Vite 8, fall back to `@tailwindcss/postcss` + `postcss.config.mjs` and note it in the commit.
2. Add `tailwindcss()` to `plugins` in `vite.config.ts` (before `react()`).
3. shadcn reads the **root** `tsconfig.json` for aliases. Add:
   ```json
   "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"] } }
   ```
4. Add `@import "tailwindcss";` as the first line of `src/styles/index.css` (Tailwind entry = existing global stylesheet).
5. `pnpm dlx shadcn@latest init` — style default, base color neutral, CSS file `src/styles/index.css`, components alias `@/components`, utils `@/lib/utils`.
6. `pnpm dlx shadcn@latest add button dropdown-menu table badge`
7. Map shadcn tokens in `index.css` `:root` to the existing palette (keep the existing named vars above them):
   | shadcn token | value |
   |---|---|
   | `--background` | `var(--linen)` |
   | `--foreground` | `var(--cod-gray)` |
   | `--primary` / `--primary-foreground` | `var(--spectra)` / `var(--linen)` |
   | `--secondary`, `--muted` | `var(--bone)` |
   | `--accent` / `--accent-foreground` | `var(--tasman)` / `var(--te-papa-green)` |
   | `--border`, `--input` | `var(--twine)` at reduced opacity (`color-mix(in oklab, var(--twine) 40%, transparent)`) |
   | `--ring` | `var(--sulu)` |
   | `--popover` / `--popover-foreground` | `var(--linen)` / `var(--cod-gray)` |
   Remove the `.dark` block shadcn generates (no dark mode in scope).
8. Ensure existing `body` rule in `index.css` still sets `background-color: var(--linen)` after shadcn edits.

**Verify:** `pnpm dev`; home page renders. Compare against pre-change screenshot: heading margins, paragraph spacing, button. Fix regressions from Tailwind preflight in `App.css` (likely `h1`/`p` margins → set explicitly).
**Commit:** `feat: add tailwind v4 and shadcn ui primitives`

---

## Task 2 — Routing and layout

**Files:** `package.json`, `src/routes/AppRoutes.tsx` (new), `src/App.tsx`, `src/main.tsx`

1. `pnpm add react-router` (v7; `react-router-dom` is now a re-export — spec's "react-router-dom" refers to this).
2. `src/App.tsx` → becomes `HomePage` content only (hero section). Replace `<button className="start-build-btn">` with `<Link to="/builder" className="start-build-btn">` (add `display:inline-block; text-decoration:none` to `.start-build-btn`).
3. `src/routes/AppRoutes.tsx`:
   - `Layout` component: existing navbar (moved from `App.tsx`) + `<Outlet />`. Brand → `<Link to="/">`, "Builder" → `<Link to="/builder">`; keep the other two anchors as-is.
   - Routes: `/` → `App`, `/builder` → `BuilderPage`, `/builder/:component/:brand` → `BrandPartsPage`, `*` → simple Not found.
   - For this task, `BuilderPage`/`BrandPartsPage` may be placeholder components; replaced in Task 5/6.
4. `src/main.tsx`: `<StrictMode><BrowserRouter><AppRoutes /></BrowserRouter></StrictMode>`.

**Verify:** click "Start Your Build" and nav "Builder" → `/builder`; brand → `/`; browser back works.
**Commit:** `feat: add routing with builder routes`

---

## Task 3 — Builder types and mock data

**Files:** `src/features/builder/types/index.ts`, `src/features/builder/api/mockParts.ts`, `src/features/builder/api/components.ts`

1. `types/index.ts`:
   ```ts
   export type ComponentType = 'rod' | 'reel' | 'line' | 'leader' | 'tippet'
   export interface Brand { id: string; name: string }
   export interface Part {
     id: string
     component: ComponentType
     brandId: string
     name: string
     price: number
     specs: Record<string, string>
   }
   export type Build = Partial<Record<ComponentType, Part['id']>>
   export interface ComponentInfo {
     type: ComponentType
     label: string          // "Rod"
     plural: string         // "Rods"
     article: 'a' | 'an'
     icon: LucideIcon
     specColumns: string[]  // keys into Part.specs, in display order
   }
   ```
2. `api/components.ts`: `COMPONENTS: ComponentInfo[]` in order Rod, Reel, Line, Leader, Tippet, with icons per spec (`FishingRod`, `Disc3`, `Spline`, `Link`, `Minus`; any missing export → `Fish`) and spec columns:
   - rod: `Length`, `Power`, `Action`
   - reel: `Size`, `Gear Ratio`
   - line: `Type`, `Test (lb)`
   - leader: `Material`, `Test (lb)`
   - tippet: `X-Size`, `Material`
   Plus `getComponentInfo(type: string): ComponentInfo | undefined` (also serves as URL param validation).
3. `api/mockParts.ts`:
   - `BRANDS: Brand[]` — e.g. St. Croix, G. Loomis, Orvis, Sage, Shimano, Daiwa, Penn, Abu Garcia, Ross, PowerPro, Berkley, Sufix, Seaguar, Rio, Scientific Anglers, Umpqua.
   - `PARTS: Part[]` — 3–4 brands per component, 3–5 parts per brand, every part's `specs` has exactly its component's `specColumns` keys. Ids: `${component}-${brandId}-${n}`.
   - Helpers (built once at module level with `Map`s): `getBrand(id)`, `getPart(id)`, `getBrandsFor(component): Brand[]` (sorted by name, only brands with parts), `getParts(component, brandId | 'all'): Part[]`.

**Verify:** `tsc -b` and `pnpm lint` pass. Data correctness is checked visually in Task 6.
**Commit:** `feat(builder): add types and mock parts data`

---

## Task 4 — Build state (context + localStorage)

**Files:** `src/features/builder/hooks/BuildProvider.tsx`, `src/features/builder/hooks/useBuild.ts`, `src/features/builder/hooks/buildContext.ts`

Split into three files so `react/only-export-components` stays clean.

1. `buildContext.ts`: `BuildContext = createContext<BuildContextValue | null>(null)` where
   ```ts
   interface BuildContextValue {
     build: Build
     selectPart: (component: ComponentType, partId: string) => void
     removePart: (component: ComponentType) => void
   }
   ```
2. `BuildProvider.tsx`:
   - `const STORAGE_KEY = 'rpp:build:v1'`
   - `useState<Build>(loadBuild)` (lazy init). `loadBuild`: try/catch `localStorage.getItem` + `JSON.parse`; keep only entries whose key is a known `ComponentType` and whose value resolves via `getPart` with matching `component`; otherwise `{}`.
   - `useEffect` on `build` → try/catch `localStorage.setItem`.
   - `selectPart` / `removePart` use functional `setBuild`.
3. `useBuild.ts`: reads context, throws if used outside provider.
4. Wrap routes with `<BuildProvider>` in `main.tsx`.

**Verify:** `tsc -b`, `pnpm lint`.
**Commit:** `feat(builder): add build context with localStorage persistence`

---

## Task 5 — Builder page with brand dropdowns

**Files:** `src/features/builder/components/BuilderPage.tsx`, `ComponentRow.tsx`, `BrandMenu.tsx`, `src/features/builder/utils/formatPrice.ts`, `src/features/builder/index.ts`

1. `utils/formatPrice.ts`: `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` hoisted to module level.
2. `BrandMenu.tsx` — props `{ component: ComponentInfo; trigger: ReactNode }`:
   - shadcn `DropdownMenu` → `DropdownMenuTrigger asChild` → trigger.
   - `DropdownMenuLabel` "<Plural> brands", separator, then for each `getBrandsFor(component.type)`: `DropdownMenuItem asChild` wrapping `<Link to={`/builder/${type}/${brand.id}`}>` with a `Badge` showing initials (first letter of first two words) + brand name.
   - Separator, final item "All brands" → `/builder/${type}/all`.
3. `ComponentRow.tsx` — props `{ component: ComponentInfo }`; uses `useBuild`:
   - Component cell: icon (size 18) + label, linking to `/builder/${type}/all`.
   - Empty: `BrandMenu` with `<Button size="sm"><Plus /> Choose {article} {label}</Button>`.
   - Filled: part name + brand name (muted), `BrandMenu` with `<Button size="sm" variant="outline">Change <ChevronDown /></Button>`, and `<Button size="icon" variant="ghost" aria-label={`Remove ${label}`}><X /></Button>` → `removePart`.
   - Price cell: formatted price or "—".
4. `BuilderPage.tsx`: heading "Your Build", shadcn `Table` with header Component / Selection / Price, a `ComponentRow` per `COMPONENTS`, `TableFooter` row with Total (sum of selected parts' prices via `getPart`). Wrapper `max-w-5xl mx-auto px-4 py-10`.
5. `index.ts`: export `BuilderPage`, `BrandPartsPage` (Task 6), `BuildProvider`; update `AppRoutes.tsx`/`main.tsx` to import from `@features/builder`.

**Verify:** dev server — each row shows icon + "Choose a/an X"; dropdown lists brands with badges and "All brands"; keyboard (Enter/arrows/Esc) works in menu.
**Commit:** `feat(builder): add builder page with brand dropdowns`

---

## Task 6 — Brand parts page

**Files:** `src/features/builder/components/BrandPartsPage.tsx`, `src/components/NotFound.tsx` (shared: also used by the `*` route — replace Task 2's inline placeholder)

1. `useParams<{ component: string; brand: string }>()`; resolve `getComponentInfo(component)` and, unless `brand === 'all'`, `getBrand(brand)`. Missing either → `<NotFound />` with link to `/builder`.
2. `parts = getParts(type, brand)`; brand with zero parts for this component → NotFound too.
3. Layout: back link "← Back to build", heading `${brandName} ${plural}` (or `All ${plural}`).
4. shadcn `Table`: Name, [Brand if `all`], each `specColumns` header, Price, action column. Action: `<Button size="sm">Add</Button>` → `selectPart(type, part.id)` then `navigate('/builder')`. If part is the current selection, show disabled "Selected" instead.

**Verify:** brand → parts table with correct spec columns per component; Add → back on `/builder` with row filled and total updated; Change → pick another brand → Add replaces; ✕ clears; refresh keeps build; `/builder/foo/bar` and `/builder/rod/penn` show Not found.
**Commit:** `feat(builder): add brand parts page`

---

## Task 7 — Final verification and polish

1. `pnpm exec tsc -b && pnpm lint && pnpm build` — all clean (shadcn-generated `only-export-components` warnings acceptable; note them).
2. Full manual pass per spec "Verification" section, plus phone width (~400px): table scrolls horizontally inside its container, not the page.
3. Home page visual check against pre-Task-1 state.
4. Update `docs/architecture_guidelines.md` directory tree only if it now misstates reality (add `features/builder`, `routes/AppRoutes.tsx`, `components/ui`).

**Commit:** `chore(builder): final polish` (only if changes)

---

## Risks

- **Vite 8 vs `@tailwindcss/vite` peer range** — fallback in Task 1.
- **Tailwind preflight** changes home page spacing — explicit margins in `App.css`.
- **`@types` alias** in Vite/TS shadows the npm `@types` scope in imports — avoid `@types/...` imports; use `@/types` or relative paths.
- **Lucide icon names** — fallback `Fish` per spec.
