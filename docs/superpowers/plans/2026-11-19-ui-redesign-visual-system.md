# UI Redesign, Sub-project 1: Visual System and App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's palette and type with the brook trout / Blue Ridge visual system, give shadcn owned variants and a shared shop-component layer, and build the new header, footer and landing page.

**Architecture:** Tokens in `src/styles/index.css` feed retuned shadcn primitives (`src/components/ui`). Shared compositions live in a new `src/components/shop` barrel (`@components/shop`). The landing page becomes a `features/home` slice. Published-build fetchers move to `src/lib/published.ts` so `home` and `catalog` share them without importing each other.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind 4, shadcn (radix-nova, `radix-ui`), TanStack Query 5, react-router 8, Vitest + Testing Library (new, dev only), pnpm.

**Spec:** `docs/superpowers/specs/2026-11-19-ui-redesign-visual-system-design.md`. Read it first. Token values, copy and component lists come from it, and the plan cites it as "spec §Section" rather than repeating it.

## Global Constraints

- Install with `pnpm add` / `pnpm add -D`. No new runtime dependencies. Vitest, Testing Library, jsdom and jest-dom are dev only.
- Path aliases: import shop components as `@components/shop` and primitives as `@/components/ui/<name>`. If you add an alias, update both `vite.config.ts` and `tsconfig.app.json`.
- The React Compiler memoizes. Don't add `useMemo`, `useCallback` or `React.memo`.
- Features don't import other features. Shared code goes in `src/components`, `src/lib`, `src/utils` or `src/hooks`.
- Primitives (`src/components/ui`) never import from `src/components/shop`.
- No `transition-all`. Name the properties (`transition-colors`, `transition-[transform,opacity]`). Easing `cubic-bezier(0.22, 1, 0.36, 1)`; durations 150 / 200 / 400ms.
- Public Sans only, weights 400 / 500 / 600 (600 only for the wordmark). Sentence case, no uppercase tracked labels, no italic. `tabular-nums` on every price, weight, length and count.
- Light theme only. Leave `@custom-variant dark` as it is.
- Copy is fixed by the spec. Use its strings exactly (headline, subhead, button labels, step lines, empty state, footer line).
- Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- After each task: `pnpm test`, `pnpm build` and `pnpm lint` pass.

## Review Focus

1. **Nested routes and the active link.** "Builder" must be active on `/builder/saved` and `/builder/12/rod/all`, and "Completed builds" on `/builds/5`, not only on exact matches. Tested in Task 6.
2. **Long or missing data on a build card.** A 120-character title or a deleted rod (`rod: null`) must not break the card. Tested in Task 5.
3. **Fewer than 3 published builds.** With 1 or 2 builds, Recently rigged shows exactly that many cards and no empty state. Tested in Task 8.
4. **A long display name or email in the header on mobile.** It must truncate, not push the menu button off screen. Tested in Task 6.
5. **Reduced motion.** With `prefers-reduced-motion: reduce`, the hero must appear right away, with nothing stuck at opacity 0. Tested in Task 7.

---

### Task 1: Frontend test runner

**Files:**
- Modify: `package.json` (devDependencies, `"test": "vitest run"`)
- Modify: `vite.config.ts` (add `test` block)
- Modify: `tsconfig.app.json` (add `"types": ["vitest/globals", "@testing-library/jest-dom"]` only if the setup needs globals; prefer explicit imports from `vitest` and leave it out)
- Create: `src/test/setup.ts`
- Test: `src/utils/formatPrice.test.ts`

**Interfaces:**
- Produces: `pnpm test` runs `src/**/*.test.{ts,tsx}` in jsdom with the same aliases as the app. `src/test/setup.ts` imports `@testing-library/jest-dom/vitest` and calls `cleanup()` after each test.

- [ ] **Step 1: Install dev dependencies**

Run: `pnpm add -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom`
Expected: installs with no peer-dependency error for `vite@8`. If the latest `vitest` declares a peer range without Vite 8, stop and report the versions rather than downgrading Vite.

- [ ] **Step 2: Write the failing test** `src/utils/formatPrice.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { formatPrice } from './formatPrice'

describe('formatPrice', () => {
  it('formats dollars with cents', () => expect(formatPrice(199.99)).toBe('$199.99'))
  it('shows a dash for no price', () => expect(formatPrice(null)).toBe('—'))
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm test`
Expected: FAIL, because the `test` script doesn't exist yet.

- [ ] **Step 4: Add the `test` script and the `test` block** (`environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, `include: ['src/**/*.test.{ts,tsx}']`), and write `src/test/setup.ts`. Import `defineConfig` from `vitest/config` (or add `/// <reference types="vitest/config" />`) so `tsc -b` accepts the `test` key.

- [ ] **Step 5: Run the tests**

Run: `pnpm test && pnpm build`
Expected: 2 tests pass; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts src/test/setup.ts src/utils/formatPrice.test.ts tsconfig.app.json
git commit -m "test(web): add Vitest and Testing Library"
```

---

### Task 2: Tokens, font and contrast check

**Files:**
- Modify: `src/styles/index.css`
- Modify: `index.html` (Public Sans `<link>`, `<title>RodPartPicker</title>`)
- Create: `scripts/check-contrast.mjs`
- Modify: `package.json` (`"check:contrast": "node scripts/check-contrast.mjs"`)

**Interfaces:**
- Produces, as CSS custom properties on `:root`: `--stone-page --stone-card --stone-raised --ink --ink-2 --ink-3 --hairline --belly --belly-ink --spot --halo --olive --haze-1 … --haze-5 --dawn --negative --fin-edge --ease-shop`, all exactly as in spec §Layer 0 (`--ease-shop: cubic-bezier(0.22, 1, 0.36, 1)`).
- Produces Tailwind utilities through `@theme inline` (`--color-<name>: var(--<name>)`): `bg-stone-page`, `text-ink-2`, `bg-belly`, `fill-haze-3`, and so on, for every color token.
- Produces `--animate-rise` (`rise 400ms var(--ease-shop) both`, keyframes from `opacity: 0; transform: translateY(8px)`), used as `motion-safe:animate-rise`.
- Produces deprecated aliases (spec §Deprecated aliases) in one block commented `/* Deprecated: removed in sub-project 2 */`. `--color-sulu` maps to `color-mix(in oklab, var(--belly) 20%, transparent)`.

- [ ] **Step 1: Write `scripts/check-contrast.mjs`** (Node, no dependencies). It reads `src/styles/index.css`, collects `--name: #RRGGBB;` declarations from `:root`, computes WCAG relative-luminance contrast, and checks these pairs at ≥ 4.5: `#FFFFFF/belly`, `belly/stone-page`, `ink-2/stone-page`, `ink-3/stone-page`, `ink-3/stone-raised`, `ink-3/stone-card`, `olive/stone-page`, `stone-page/haze-5`, `belly-ink/stone-page`, `belly-ink/stone-raised`, `#FFFFFF/negative`, `negative/stone-page`. It prints one line per pair and exits 1 if any pair fails or a token is missing.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm check:contrast`
Expected: exit 1, reporting missing tokens (`stone-page`, …).

- [ ] **Step 3: Replace the palette in `index.css`** with the spec's tokens, the shadcn variable mapping (spec §Color), `--font-sans`/`--font-heading` = `'Public Sans', ui-sans-serif, system-ui, sans-serif`, the deprecated aliases, `--animate-rise` with its `@keyframes`. Numbers get Tailwind's `tabular-nums` where they appear, not a global rule. Keep `--radius: 0.5rem` (8px controls). Add the Google Fonts link (`family=Public+Sans:wght@400;500;600&display=swap`) to `index.html`.

- [ ] **Step 4: Run the checks**

Run: `pnpm check:contrast && pnpm build`
Expected: all 12 pairs print ≥ 4.5 (lowest `ink-3/stone-raised` 4.53); build succeeds.

- [ ] **Step 5: Check the old screens** with `pnpm dev`. Open `/builder` and `/builds`: their old color classes still resolve through the aliases (the "fits" rows are tinted, headings are olive). No unstyled white-on-white text.

- [ ] **Step 6: Commit**

```bash
git add src/styles/index.css index.html scripts/check-contrast.mjs package.json
git commit -m "feat(web): add the brook trout tokens and contrast check"
```

---

### Task 3: Primitives with owned variants

**Files:**
- Modify: `src/components/ui/button.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/table.tsx`
- Modify: `src/styles/index.css` (fin-edge rule for primary buttons)
- Modify call sites: every `variant="outline"` (12), `variant="ghost"` (3) and `<Badge variant="secondary">` (2) in `src/features`, plus the two colored `Badge`s in `src/features/builder/components/BrandPartsPage.tsx`
- Create (via CLI): `src/components/ui/card.tsx`, `separator.tsx`, `sheet.tsx`, `skeleton.tsx`, `tooltip.tsx`
- Test: `src/components/ui/button.test.tsx`

**Interfaces:**
- Produces `Button` props `variant: 'primary' | 'secondary' | 'quiet' | 'link' | 'destructive'` (default `primary`) and `size: 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'` (default `md`; heights 32 / 36 / 44). `data-variant` and `data-size` attributes stay. `buttonVariants` stays exported.
- Produces `Badge` `variant: 'fit' | 'recommended' | 'muted'` (default `muted`).
- Produces `TableCell` / `TableHead` prop `numeric?: boolean` (right-aligned, `tabular-nums`) and `Table` prop `density?: 'compact' | 'comfortable'` (default `compact`; row height 36 / 44, set by a `data-density` attribute that `TableRow` styles read).

- [ ] **Step 1: Write the failing test** `src/components/ui/button.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Link } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('defaults to the primary variant and md size', () => {
    render(<Button>Start a build</Button>)
    const button = screen.getByRole('button', { name: 'Start a build' })
    expect(button).toHaveAttribute('data-variant', 'primary')
    expect(button).toHaveAttribute('data-size', 'md')
  })
  it('renders a link with asChild', () => {
    render(<MemoryRouter><Button asChild variant="link"><Link to="/builds">See completed builds</Link></Button></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'See completed builds' })).toHaveAttribute('href', '/builds')
  })
  it('never uses transition-all', () => {
    render(<Button variant="quiet">Menu</Button>)
    expect(screen.getByRole('button').className).not.toContain('transition-all')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/components/ui/button.test.tsx`
Expected: FAIL. `data-variant` is `default`, `data-size` is `default`, and the class contains `transition-all`.

- [ ] **Step 3: Rewrite the `Button` variants and sizes** per spec §Layer 1. `primary`: `bg-primary text-primary-foreground hover:bg-belly-ink`; `secondary`: `bg-stone-raised border-hairline text-ink hover:bg-[color-mix(in_oklab,var(--stone-raised),var(--ink)_5%)]`; `quiet`: `text-ink-2 hover:bg-stone-raised hover:text-ink`; `link`: `text-ink underline underline-offset-4 decoration-ink-3 hover:decoration-ink`. Base classes: `transition-[color,background-color,border-color,transform] duration-150 ease-(--ease-shop) active:not-aria-[haspopup]:scale-[0.98]`, keeping the existing focus-visible ring classes. Drop `xs` and `icon-xs` (unused).

- [ ] **Step 4: Add the fin-edge rule** to `index.css` in `@layer components`: `[data-slot="button"][data-variant="primary"]` gets `position: relative; overflow: hidden; padding-left` +6px, and `::before { content: ""; position: absolute; inset-block: 0; inset-inline-start: 0; width: 6px; background: var(--fin-edge); }`. Skip it for the `icon*` sizes (`:not([data-size^="icon"])`).

- [ ] **Step 5: Rewrite `Badge`** (variants `fit`: `bg-stone-raised text-ink`; `recommended`: `bg-[color-mix(in_oklab,var(--belly)_14%,transparent)] text-belly-ink`; `muted`: `bg-stone-raised text-ink-2`; radius 4px, no pill) and add the `Table` `density` / `numeric` props.

- [ ] **Step 6: Update the call sites:** `outline` → `secondary`, `ghost` → `quiet`, `<Badge variant="secondary">` → `variant="muted"`. In `BrandPartsPage.tsx`, the "Fits build" badge becomes `variant="fit"` and "Recommended" becomes `variant="recommended"`, with their color `className`s removed. `Button variant="secondary"` stays as it is.

Run: `grep -rnE 'variant="(outline|ghost|default)"' src` and expect no output.

- [ ] **Step 7: Add the new primitives**

Run: `pnpm exec shadcn add card separator sheet skeleton tooltip`
Expected: five new files in `src/components/ui/`. Then `git diff src/styles/index.css`: if the CLI changed `index.css`, revert those changes (`git checkout -p src/styles/index.css`), since the tokens from Task 2 are the source of truth. Make sure no new runtime package was added to `package.json`.

- [ ] **Step 8: Run the checks**

Run: `pnpm test && pnpm build && pnpm lint`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/components/ui src/styles/index.css src/features package.json pnpm-lock.yaml
git commit -m "feat(web): give shadcn primitives owned variants"
```

---

### Task 4: Basic shop components

**Files:**
- Create: `src/components/shop/FinEdge.tsx`, `FitSpot.tsx`, `PriceTag.tsx`, `SpecLine.tsx`, `PageHeader.tsx`, `EmptyState.tsx`, `Container.tsx`, `index.ts`
- Test: `src/components/shop/FitSpot.test.tsx`, `src/components/shop/PriceTag.test.tsx`, `src/components/shop/SpecLine.test.tsx`

**Interfaces:**
- `FinEdge({ className?: string }): JSX.Element`: a `span` (`aria-hidden`) 10px wide, full height, `background: var(--fin-edge)` plus a final `belly` band, with left-rounded corners matching its parent.
- `FitSpot({ decorative?: boolean; label?: string }): JSX.Element`: an 8px `spot` circle with a 3px `halo` ring (`box-shadow`). It has `role="img"` and `aria-label={label ?? 'Fits your build'}`, or `aria-hidden` when `decorative`.
- `PriceTag({ price: number | null; className?: string }): JSX.Element`: a `span` with `tabular-nums` and `formatPrice(price)`.
- `SpecLine({ specs: (string | number | null | undefined)[] }): JSX.Element`: joins the non-empty values with ` · ` in `text-[13px] text-ink-3`, and renders nothing when all are empty.
- `PageHeader({ title: string; description?: string; actions?: ReactNode }): JSX.Element`: an `h1` (28px, weight 500, `olive`), the description in `ink-2`, actions on the right from `sm`.
- `EmptyState({ title: string; description: string; action?: ReactNode }): JSX.Element`.
- `Container({ children, className?, as?: 'div' | 'main' | 'section' }): JSX.Element`: `mx-auto w-full max-w-6xl px-4 sm:px-6`.
- `index.ts` re-exports each of these, and later tasks add `PartImage`, `BuildCard`, `SiteHeader` and `SiteFooter`.

- [ ] **Step 1: Write the failing tests**

```tsx
// FitSpot.test.tsx
it('is labeled for assistive tech by default', () => {
  render(<FitSpot />)
  expect(screen.getByRole('img', { name: 'Fits your build' })).toBeInTheDocument()
})
it('is hidden when decorative', () => {
  const { container } = render(<FitSpot decorative />)
  expect(screen.queryByRole('img')).toBeNull()
  expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
})

// PriceTag.test.tsx
it('formats and uses tabular figures', () => {
  render(<PriceTag price={199.99} />)
  expect(screen.getByText('$199.99')).toHaveClass('tabular-nums')
})
it('shows a dash for no price', () => {
  render(<PriceTag price={null} />)
  expect(screen.getByText('—')).toBeInTheDocument()
})

// SpecLine.test.tsx
it('joins present specs with a middle dot', () => {
  render(<SpecLine specs={['8′6″', '4 wt', null, 'Medium', '', '4 pc']} />)
  expect(screen.getByText('8′6″ · 4 wt · Medium · 4 pc')).toBeInTheDocument()
})
it('renders nothing when every spec is empty', () => {
  const { container } = render(<SpecLine specs={[null, '']} />)
  expect(container).toBeEmptyDOMElement()
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test src/components/shop`
Expected: FAIL, because the modules don't exist.

- [ ] **Step 3: Implement the components and the `index.ts` barrel** per the Interfaces above. Style them with tokens only, with no deprecated alias names.

- [ ] **Step 4: Run the checks**

Run: `pnpm test && pnpm build && pnpm lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/shop
git commit -m "feat(web): add the shop component layer"
```

---

### Task 5: Shared published fetchers, PartImage and BuildCard

**Files:**
- Create: `src/lib/published.ts` (contents of `src/features/catalog/api/published.ts` plus the types from `src/features/catalog/types/index.ts`)
- Delete: `src/features/catalog/api/published.ts`, `src/features/catalog/types/index.ts` (if `types/` holds only these), `src/features/catalog/components/PublishedCard.tsx`, `src/features/catalog/components/PartImage.tsx`
- Create: `src/components/shop/PartImage.tsx` (moved unchanged except token classes), `src/components/shop/BuildCard.tsx`
- Modify: `src/components/shop/index.ts`, `src/features/catalog/components/PublishedListPage.tsx`, `src/features/catalog/components/PublishedBuildPage.tsx`, and any other importer of the moved modules (`grep -rn "catalog/types\|api/published\|PublishedCard\|PartImage" src`)
- Test: `src/components/shop/BuildCard.test.tsx`

`PartImage` moves too, because `BuildCard` uses it and `PublishedBuildPage` still needs it. The spec lists ten shop components; this one follows `BuildCard`.

**Interfaces:**
- `src/lib/published.ts` exports `listPublished(params: CatalogParams, signal?: AbortSignal): Promise<PublishedList>`, `getPublished(id: number, signal?: AbortSignal): Promise<PublishedBuild>`, and the types `Slot`, `PublishedRod`, `PublishedPart`, `PublishedSummary`, `PublishedBuild`, `PublishedList`, all unchanged.
- `BuildCard({ build: PublishedSummary }): JSX.Element` renders an `<li>` holding one `<Link to={`/builds/${build.id}`}>`. Inside: `PartImage` (rod, `aspect-[2/1]`), the title (`line-clamp-2`, `break-words`), "by {author} · {date}" (`formatApiDate`, `dateStyle: 'medium'`), `SpecLine` of rod brand + name and `{lineWeight} wt` (or "Rod no longer available"), and `PriceTag` of `totalPrice`. It has an empty `<div data-slot="votes" />` reserved for sub-project 4. Card styling: `bg-stone-card`, hairline border, 14px radius, `hover:bg-stone-raised` with `transition-colors`.

- [ ] **Step 1: Write the failing test** `BuildCard.test.tsx`

```tsx
const build: PublishedSummary = {
  id: 5, title: 'Smokies 4wt '.repeat(10).trim(), author: 'Ridge Runner',
  rod: { brand: 'Redington', name: 'Classic Trout 486-4', lineWeight: 4, imageUrl: null },
  totalPrice: 417.99, publishedAt: '2026-11-18T14:00:00Z',
}
it('links to the build and shows its details', () => {
  render(<MemoryRouter><ul><BuildCard build={build} /></ul></MemoryRouter>)
  const link = screen.getByRole('link')
  expect(link).toHaveAttribute('href', '/builds/5')
  expect(screen.getByText(build.title)).toHaveClass('line-clamp-2')
  expect(screen.getByText('Redington Classic Trout 486-4 · 4 wt')).toBeInTheDocument()
  expect(screen.getByText('$417.99')).toBeInTheDocument()
})
it('handles a deleted rod', () => {
  render(<MemoryRouter><ul><BuildCard build={{ ...build, rod: null }} /></ul></MemoryRouter>)
  expect(screen.getByText('Rod no longer available')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Rod' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/components/shop/BuildCard.test.tsx`
Expected: FAIL, because the module doesn't exist.

- [ ] **Step 3: Move the fetchers and types, move `PartImage`, write `BuildCard`**, and update the catalog imports (`@/lib/published`, `@components/shop`). `features/catalog/index.ts` is unchanged.

- [ ] **Step 4: Run the checks**

Run: `pnpm test && pnpm build && pnpm lint && grep -rn "features/catalog" src/lib src/components`
Expected: all pass; the grep prints nothing.

- [ ] **Step 5: Commit**

```bash
git add -A src/lib src/components/shop src/features/catalog
git commit -m "refactor(web): share published fetchers and the build card"
```

---

### Task 6: SiteHeader, SiteFooter and the layout

**Files:**
- Create: `src/components/shop/SiteHeader.tsx`, `src/components/shop/SiteFooter.tsx`
- Modify: `src/components/shop/index.ts`, `src/routes/AppRoutes.tsx` (`Layout`), `src/features/auth/components/UserMenu.tsx`
- Test: `src/components/shop/SiteHeader.test.tsx`

**Interfaces:**
- `SiteHeader({ account: ReactNode }): JSX.Element`. Nav items are a module constant `[{ to: '/builder', label: 'Builder' }, { to: '/builds', label: 'Completed builds' }]` rendered with `NavLink` (without `end`, so nested routes count). Active: `aria-current="page"` (from `NavLink`), `text-ink`, a 2px `belly` bottom border. Inactive: `text-ink-2 hover:text-ink`. The wordmark link to `/` holds a small `FinEdge` and "RodPartPicker". Under `md`: the desktop nav is hidden and a `Button variant="quiet" size="icon"` with `aria-label="Menu"` opens a `Sheet` (`side="right"`, title "Menu") listing the same `NavLink`s. Each link's `onClick` sets `open` to false. The account slot sits in a `min-w-0` wrapper.
- `SiteFooter(): JSX.Element`: a 48px SVG ridge edge (two paths, `fill-haze-4` / `fill-haze-5`, `aria-hidden`), then a `bg-haze-5 text-stone-page` band with the wordmark, the same nav links and the spec's footer line exactly.
- `Layout` in `AppRoutes.tsx`: `<div className="flex min-h-svh flex-col"><SiteHeader account={<UserMenu />} /><div className="flex flex-1 flex-col"><Outlet /></div><SiteFooter /></div>`. The "Products" link is removed.
- `UserMenu`: the trigger becomes `<Button variant="quiet">` (via `DropdownMenuTrigger asChild`) whose name span gets `max-w-40 truncate`. "Log in" becomes `<Button asChild variant="link">`. No `tasman`/`sulu` classes remain. Behavior is unchanged.

- [ ] **Step 1: Write the failing test** `SiteHeader.test.tsx` (render inside `MemoryRouter initialEntries={[path]}`)

```tsx
it.each([
  ['/builder', 'Builder'], ['/builder/saved', 'Builder'], ['/builder/12/rod/all', 'Builder'],
  ['/builds', 'Completed builds'], ['/builds/5', 'Completed builds'],
])('marks the link for %s as current', (path, label) => {
  renderAt(path)
  const nav = screen.getByRole('navigation', { name: 'Main' })
  expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page')
})
it('marks nothing on the home page', () => {
  renderAt('/')
  const nav = screen.getByRole('navigation', { name: 'Main' })
  expect(within(nav).queryByRole('link', { current: 'page' })).toBeNull()
})
it('opens the mobile menu and closes it on navigation', async () => {
  const user = userEvent.setup()
  renderAt('/')
  await user.click(screen.getByRole('button', { name: 'Menu' }))
  const sheet = screen.getByRole('dialog', { name: 'Menu' })
  await user.click(within(sheet).getByRole('link', { name: 'Completed builds' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})
it('renders the account slot and lets it truncate', () => {
  renderAt('/', <span>a-very-long-display-name-that-goes-on@example.com</span>)
  const account = screen.getByText(/a-very-long-display-name/)
  expect(account.parentElement).toHaveClass('min-w-0')
})
it('has no Products link', () => {
  renderAt('/')
  expect(screen.queryByRole('link', { name: 'Products' })).toBeNull()
})
```

`renderAt(path, account = <span>Log in</span>)` is a local helper. The desktop nav has `aria-label="Main"`. jsdom ignores media queries, so both the desktop nav and the menu button exist in the DOM.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/components/shop/SiteHeader.test.tsx`
Expected: FAIL, because the module doesn't exist.

- [ ] **Step 3: Implement `SiteHeader`, `SiteFooter`, the new `Layout`, and restyle `UserMenu`** per the Interfaces.

- [ ] **Step 4: Run the checks**

Run: `pnpm test && pnpm build && pnpm lint && grep -nE "tasman|sulu|cod-gray" src/routes src/features/auth`
Expected: all pass; the grep prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/components/shop src/routes/AppRoutes.tsx src/features/auth/components/UserMenu.tsx
git commit -m "feat(web): add the site header and footer"
```

---

### Task 7: Landing page hero, sample rig and rig steps

**Files:**
- Create: `src/features/home/index.ts`, `components/HomePage.tsx`, `components/RidgeScene.tsx`, `components/SampleRig.tsx`, `components/RigSteps.tsx`, `utils/sampleRig.ts`
- Modify: `src/routes/AppRoutes.tsx` (index route → `HomePage`)
- Delete: `src/App.tsx`, and `src/assets/hero.png`, `react.svg`, `vite.svg` if nothing else imports them (`grep -rn "assets/" src`)
- Test: `src/features/home/utils/sampleRig.test.ts`, `src/features/home/components/HomePage.test.tsx`

**Interfaces:**
- `utils/sampleRig.ts` exports:

```ts
export interface SampleRigPart {
  type: 'rod' | 'reel' | 'line'
  dbId: number          // catalog id, so the rig can be re-checked against the API
  label: 'Rod' | 'Reel' | 'Line'
  name: string          // brand + model, as shown
  specs: string[]
  price: number
  water: 'fresh' | 'salt' | 'both'
  lineWeight?: number           // rod and line
  minLineWeight?: number        // reel
  maxLineWeight?: number        // reel
}
export const SAMPLE_RIG: { title: string; parts: SampleRigPart[] }
```

Data, from the live catalog (2026-11-19):
  - Rod `dbId 189`: "Redington Classic Trout 486-4", specs `['8′6″', '4 wt', 'Medium', '4 pc']`, `199.99`, `fresh`, `lineWeight 4`
  - Reel `dbId 1`: "Lamson Liquid S", specs `['2–4 wt', 'Fresh']`, `149.00`, `fresh`, `2–4`
  - Line `dbId 7`: "RIO Avid Trout-Gold", specs `['4 wt', 'Floating', '126 gr']`, `69.00`, `fresh`, `lineWeight 4`
  - `title: 'Smokies 4wt'`
- `RidgeScene(): JSX.Element`: the SVG from spec §Hero. Use the five ridge paths and the sky from the approved mockup `.superpowers/brainstorm/47207-1795108773/content/type-pairing.html` (`viewBox 0 0 1200 460`), filled with `fill-haze-1` … `fill-haze-5` and a `stone-page → dawn` gradient. `aria-hidden`, `preserveAspectRatio="xMidYMid slice"`, absolutely positioned behind the hero text.
- `SampleRig(): JSX.Element`: a card titled "Smokies 4wt" with "3 of 5 parts"; one row per part with label, name, `SpecLine`, `PriceTag`. `FitSpot` on the reel and line rows. The line row is active (`bg-stone-raised` + `FinEdge`). Under `md` the line row is hidden (`hidden md:grid`).
- `RigSteps(): JSX.Element`: an `<ol>` of the five steps, with copy exactly as in spec §RigSteps, a connector whose width steps down to 3 / 2 / 1px after steps 3, 4 and 5, and a final `Button asChild variant="link"` "Start a build" → `/builder`. The top comment says the copy mirrors `api/app/compatibility/rules.py`.
- `HomePage(): JSX.Element`: the hero section (`min-h-[min(calc(100svh-56px),760px)]`, relative, `RidgeScene` behind it; text block with `h1` `text-olive`, subhead, `Button asChild size="lg"` "Start a build" → `/builder`, `Button asChild variant="link"` "See completed builds" → `/builds`; `SampleRig` on the right from `md`, below from base), then `RigSteps`, then `<RecentBuilds />` (Task 8; until then, leave the slot out). The headline, subhead and actions each carry `motion-safe:animate-rise` with `animation-delay` 0 / 50 / 100ms.
- `features/home/index.ts` exports `HomePage`.

- [ ] **Step 1: Write the failing tests**

```ts
// sampleRig.test.ts: mirrors check_build in api/app/compatibility/rules.py
const byType = Object.fromEntries(SAMPLE_RIG.parts.map((p) => [p.type, p]))
it('has a rod, reel and line', () => expect(Object.keys(byType).sort()).toEqual(['line', 'reel', 'rod']))
it('line weight matches the rod', () => expect(byType.line.lineWeight).toBe(byType.rod.lineWeight))
it('reel range covers the rod and the line', () => {
  for (const w of [byType.rod.lineWeight!, byType.line.lineWeight!]) {
    expect(w).toBeGreaterThanOrEqual(byType.reel.minLineWeight!)
    expect(w).toBeLessThanOrEqual(byType.reel.maxLineWeight!)
  }
})
it('water tags agree', () => {
  const waters = new Set(SAMPLE_RIG.parts.map((p) => p.water).filter((w) => w !== 'both'))
  expect(waters.size).toBeLessThanOrEqual(1)
})
```

```tsx
// HomePage.test.tsx (MemoryRouter + QueryClientProvider; mock @/lib/published listPublished to resolve { items: [], page: 1, pageSize: 20, total: 0 })
it('shows the headline and both actions', () => {
  renderHome()
  expect(screen.getByRole('heading', { level: 1, name: 'Rig a fly rod where every part fits' })).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: 'Start a build' })[0]).toHaveAttribute('href', '/builder')
  expect(screen.getByRole('link', { name: 'See completed builds' })).toHaveAttribute('href', '/builds')
})
it('lists the five rig steps in order', () => {
  renderHome()
  const steps = within(screen.getByRole('list', { name: 'How a rig goes together' })).getAllByRole('listitem')
  expect(steps.map((s) => s.querySelector('h3')?.textContent)).toEqual(['Rod', 'Reel', 'Line', 'Leader', 'Tippet'])
})
it('only animates the entrance when motion is allowed', () => {
  renderHome()
  const h1 = screen.getByRole('heading', { level: 1 })
  expect(h1.className).toContain('motion-safe:animate-rise')
  expect(h1.className).not.toMatch(/(^|\s)animate-rise/)
  expect(h1.className).not.toMatch(/(^|\s)opacity-0/)
})
```

The rig steps `<ol>` has `aria-labelledby` pointing at the section's `h2` "How a rig goes together".

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test src/features/home`
Expected: FAIL, because the modules don't exist.

- [ ] **Step 3: Implement `sampleRig.ts`, `RidgeScene`, `SampleRig`, `RigSteps` and `HomePage`, point the index route at `HomePage` (`@features/home`), and delete `App.tsx` and the unused assets.**

- [ ] **Step 4: Confirm the sample rig against the real checker** (API running)

Run: `curl -s "http://localhost:3001/api/compatibility/check?rodId=189&reelId=1&flyLineId=7"`
Expected: `[]`. If it isn't empty, pick other parts with the same query as the plan's data notes and update `sampleRig.ts`.

- [ ] **Step 5: Run the checks**

Run: `pnpm test && pnpm build && pnpm lint`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A src/features/home src/routes/AppRoutes.tsx src/App.tsx src/assets
git commit -m "feat(web): add the Blue Ridge landing page"
```

---

### Task 8: Recently rigged

**Files:**
- Create: `src/features/home/components/RecentBuilds.tsx`
- Modify: `src/features/home/components/HomePage.tsx` (render `<RecentBuilds />` after `RigSteps`)
- Test: `src/features/home/components/RecentBuilds.test.tsx`

**Interfaces:**
- Consumes `listPublished` and `PublishedList` from `@/lib/published`, `publishedKeys` from `@/lib/publishedKeys`, `BuildCard`, `EmptyState` and `Container` from `@components/shop`, `Skeleton` from `@/components/ui/skeleton`.
- `RecentBuilds(): JSX.Element | null`: `useQuery({ queryKey: publishedKeys.list({ page: 1 }), queryFn: ({ signal }) => listPublished({ page: 1 }, signal) })`. A section headed "Recently rigged". Loading: 3 `Skeleton`s with `data-testid="build-skeleton"`. Error: returns `null` and logs once with `console.error('Could not load recent builds', error)` in a `useEffect`. Empty: `EmptyState` with title "No builds published yet", description "Publish yours from the builder.", action `Button asChild` "Start a build" → `/builder`. Otherwise a `<ul>` of the first 3 items as `BuildCard`, then `Button asChild variant="link"` "See all completed builds" → `/builds`.

- [ ] **Step 1: Write the failing test** (mock `@/lib/published`, a fresh `QueryClient({ defaultOptions: { queries: { retry: false } } })` per test)

```tsx
const item = (id: number): PublishedSummary => ({ id, title: `Build ${id}`, author: 'A', rod: null, totalPrice: 100, publishedAt: '2026-11-18T14:00:00Z' })
const list = (n: number): PublishedList => ({ items: Array.from({ length: n }, (_, i) => item(i + 1)), page: 1, pageSize: 20, total: n })

it('shows skeletons while loading', () => {
  vi.mocked(listPublished).mockReturnValue(new Promise(() => {}))
  renderRecent()
  expect(screen.getAllByTestId('build-skeleton')).toHaveLength(3)
})
it('shows at most 3 builds', async () => {
  vi.mocked(listPublished).mockResolvedValue(list(5))
  renderRecent()
  expect(await screen.findAllByRole('listitem')).toHaveLength(3)
  expect(screen.getByRole('link', { name: 'See all completed builds' })).toHaveAttribute('href', '/builds')
})
it.each([1, 2])('shows exactly %i builds when that is all there is', async (n) => {
  vi.mocked(listPublished).mockResolvedValue(list(n))
  renderRecent()
  expect(await screen.findAllByRole('listitem')).toHaveLength(n)
  expect(screen.queryByText('No builds published yet')).toBeNull()
})
it('invites a first build when there are none', async () => {
  vi.mocked(listPublished).mockResolvedValue(list(0))
  renderRecent()
  expect(await screen.findByText('No builds published yet')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Start a build' })).toHaveAttribute('href', '/builder')
})
it('renders nothing on an error', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(listPublished).mockRejectedValue(new Error('down'))
  const { container } = renderRecent()
  await waitFor(() => expect(log).toHaveBeenCalledWith('Could not load recent builds', expect.any(Error)))
  expect(container).toBeEmptyDOMElement()
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/features/home/components/RecentBuilds.test.tsx`
Expected: FAIL, because the module doesn't exist.

- [ ] **Step 3: Implement `RecentBuilds` and add it to `HomePage`.** In `HomePage.test.tsx`, the mocked empty list now shows the empty state. Update that test only if a duplicate "Start a build" name breaks it (it already uses `getAllByRole`).

- [ ] **Step 4: Run the checks**

Run: `pnpm test && pnpm build && pnpm lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/home
git commit -m "feat(web): show recently rigged builds on the landing page"
```

---

### Task 9: Docs and visual verification

**Files:**
- Modify: `docs/architecture_guidelines.md` (add the layer rule from spec §The rule, quoted exactly, under a "Components: primitives and shop components" heading)
- Modify: `CLAUDE.md` (Commands: `pnpm test` runs Vitest, `pnpm check:contrast`; replace "The frontend has no test runner" and "the frontend has no tests yet"; Build notes: tokens in `src/styles/index.css`, the deprecated aliases, `@components/shop`; Architecture: `features/home` is `/`, published fetchers in `src/lib/published.ts`; remove the `App.tsx` placeholder sentence)
- Create (untracked): `.superpowers/verification/<short-sha>/` with screenshots

- [ ] **Step 1: Update the two docs** as listed above.

- [ ] **Step 2: Run the full check suite**

Run: `pnpm test && pnpm build && pnpm lint && pnpm check:contrast`
Expected: all pass.

- [ ] **Step 3: Capture the landing page** with the API and `pnpm dev` running and at least 3 published builds in the dev database:

```bash
SHA=$(git rev-parse --short HEAD); OUT=.superpowers/verification/$SHA; mkdir -p $OUT
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --hide-scrollbars --window-size=1440,900 --virtual-time-budget=5000 --screenshot=$OUT/home-1440.png http://localhost:5173/
"$CHROME" --headless=new --hide-scrollbars --window-size=390,844 --virtual-time-budget=5000 --screenshot=$OUT/home-390.png http://localhost:5173/
"$CHROME" --headless=new --hide-scrollbars --window-size=1440,900 --virtual-time-budget=5000 --screenshot=$OUT/builder-1440.png http://localhost:5173/builder
"$CHROME" --headless=new --hide-scrollbars --window-size=1440,900 --virtual-time-budget=5000 --screenshot=$OUT/builds-1440.png http://localhost:5173/builds
```

Expected, by looking at each image: at 1440 the hero fills the first screen, the headline is in the open sky, the sample rig rises out of the nearest ridge and there's no empty band. At 390 the text stacks above the actions, the card shows 2 rows, there's no horizontal scroll and the header shows the menu button. `/builder` and `/builds` are coherent (olive headings, tinted "fits" rows, the new header and footer). Compare against `brookie-direction-v3.html` option A and `type-pairing.html` option B.

- [ ] **Step 4: Manual pass** in a real browser: tab through the header, hero and footer (a focus ring is visible on each), open and close the mobile menu with the keyboard (Escape closes it), and turn on reduced motion in the OS. Reload `/`: the hero appears with no animation. Write the result as `$OUT/notes.md` (what was checked, pass/fail, the commit SHA).

- [ ] **Step 5: Fix what the captures show** in one batch, re-run Step 2, recapture once. Report anything still wrong rather than looping.

- [ ] **Step 6: Commit**

```bash
git add docs/architecture_guidelines.md CLAUDE.md
git commit -m "docs: record the component layers and frontend tests"
```
