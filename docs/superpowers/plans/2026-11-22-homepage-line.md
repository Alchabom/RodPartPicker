# Homepage Line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the hero paragraph and continue the hero's fly line down the page as the spine of "How a rig goes together". The line ends in a hook whose **Start a build** plays a "fish on" catch. Recently rigged moves to a right column. Every page change opens at the top, and Back restores the scroll position.

**Architecture:** All work is in the `home` feature, plus one shared `BuildCard` variant and one router-level `ScrollManager`. Motion is CSS only: scroll-driven `animation-timeline: view()` for the reveal, and keyframes keyed on a `data-catching` attribute for the catch. JavaScript only decides when the catch starts and when to navigate.

**Tech Stack:** React 19, TypeScript, react-router (`BrowserRouter`), Tailwind v4, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-11-22-homepage-line-design.md`

## Global Constraints

- Branch `oa-ux-polish`. Never commit `skills-lock.json`, `.agents/skills/ui-taste/` or `.agents/skills/unslop/` (the user's unrelated changes).
- The hero rod, guides, cast and fly dot stay exactly as they are. The existing `RidgeScene` tests pass **unchanged**.
- Colors come from tokens only (`belly`, `dorsal-band`, `olive`, `spot`, `halo`, `stone-card`, `stone-page`). Don't use the deprecated alias block.
- With reduced motion on, or without `animation-timeline: view()` support, everything renders in its finished state. Base (non-`@supports`) styles never hide content.
- Catch timing: navigation at `CATCH_MS = 450` ms. Only the final **Start a build** plays it; the hero's stays a plain link.
- All page scrolling is instant (`behavior: 'auto'`).
- The React Compiler is on: no hand-written `useMemo`/`useCallback`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Double click or held Enter on the final Start a build:** it navigates exactly once. Tested in Task 4.
2. **Recent builds fail to load:** the right column renders nothing, and the steps and their CTA still show. Tested in Task 6.
3. **A hash link to an id that isn't on the page:** scrolls to the top and doesn't throw. Tested in Task 1.
4. **Back from the builder after the catch:** the homepage restores its scroll position, so the user is back at the steps. Covered by Task 1's POP test, and checked by hand in Task 7.
5. **Firefox (no `view()`):** all steps, the line and the hook are visible with no animation. Checked by hand in Task 7. The CSS rule is in Task 5.

---

### Task 1: ScrollManager

**Files:**
- Create: `src/routes/ScrollManager.tsx`
- Test: `src/routes/ScrollManager.test.tsx`
- Modify: `src/main.tsx` (render `<ScrollManager />` inside `<BrowserRouter>`, before `<AuthProvider>`)

**Interfaces:**
- Produces: `export function ScrollManager(): null`

- [ ] **Step 1: Write the failing tests.** Render inside `<MemoryRouter initialEntries={['/a']}>` with `<Routes>` for `/a` and `/b`, plus a helper component that exposes `useNavigate()` through a ref. Stub `window.scrollTo` with `vi.spyOn(window, 'scrollTo').mockImplementation(() => {})`. Set the scroll position with `Object.defineProperty(window, 'scrollY', { value: n, configurable: true, writable: true })`, then `fireEvent.scroll(window)`.
  - `it('scrolls to the top on a new page')`: navigate to `/b` → `scrollTo` was last called with `(0, 0)`.
  - `it('scrolls to the anchor on a hash link')`: render `<div id="steps" />` on `/b`, stub `Element.prototype.scrollIntoView`, navigate to `/b#steps` → `scrollIntoView` called once, and `scrollTo` not called for this navigation.
  - `it('scrolls to the top when the hash has no matching element')`: navigate to `/b#nope` → `scrollTo(0, 0)`, no throw.
  - `it('does not scroll on a same-path replace')`: navigate to `/a?copy=1`, then `navigate('/a', { replace: true })` → no `scrollTo` call after the replace.
  - `it('scrolls to the top on a redirect to a new path')`: `navigate('/b', { replace: true })` from `/a` → `scrollTo(0, 0)`.
  - `it('restores the position on Back')`: on `/a` set `scrollY` to 640 and fire scroll, navigate to `/b`, then `navigate(-1)` → `scrollTo` last called with `(0, 640)`.

- [ ] **Step 2: Run the tests and confirm they fail.** Run `pnpm vitest run src/routes/ScrollManager.test.tsx`. Expected: FAIL, cannot find module `./ScrollManager`.

- [ ] **Step 3: Implement `ScrollManager` in `src/routes/ScrollManager.tsx`.**
  - Use `useLocation()` and `useNavigationType()`.
  - On mount, set `history.scrollRestoration = 'manual'`.
  - Keep `positions: Map<string, number>` in a ref. A passive `scroll` listener writes `window.scrollY` under the current `location.key`.
  - Keep the previous pathname in a ref.
  - In a `useLayoutEffect` keyed on `location.key`:
    - `POP`: `scrollTo(0, positions.get(key) ?? 0)`.
    - `REPLACE` with the same pathname as before: do nothing.
    - Otherwise: if the hash matches an element (`document.getElementById(decodeURIComponent(hash.slice(1)))`), call `scrollIntoView()` on it; if not, `scrollTo(0, 0)`.
  - Return `null`.

- [ ] **Step 4: Run the tests and confirm they pass.** Same command. Expected: 6 passed.

- [ ] **Step 5: Mount it and run the full suite.** Add `<ScrollManager />` in `main.tsx`, then run `pnpm test`. Expected: all pass.

- [ ] **Step 6: Commit.** `git add src/routes/ScrollManager.tsx src/routes/ScrollManager.test.tsx src/main.tsx && git commit -m "Open each page at the top and restore scroll on Back"`

---

### Task 2: Compact BuildCard and skeleton

**Files:**
- Modify: `src/components/shop/BuildCard.tsx`, `src/components/shop/BuildCardSkeleton.tsx`
- Test: `src/components/shop/BuildCard.test.tsx`

**Interfaces:**
- Produces: `BuildCard({ build, variant = 'default' }: { build: PublishedSummary; variant?: 'default' | 'compact' })` and `BuildCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' })`. Both put `data-variant={variant}` on their outer box: the `<Link>` for the card, the root `<div>` for the skeleton.

- [ ] **Step 1: Write the failing tests** in `BuildCard.test.tsx`, reusing the existing `build` fixture.
  - `it('lays out a compact card with the photo beside the details')`: render with `variant="compact"`. The link has `data-variant="compact"` and `href="/rack/5"`. It shows the title, `'by Ridge Runner · Nov 18, 2026'`, `'Redington Classic Trout 486-4 · 4 wt'` and `'$417.99'`. `container.querySelector('[data-slot="votes"]')` exists.
  - `it('keeps the default card unchanged')`: with no `variant`, the link has `data-variant="default"`, and the existing assertions hold.
  - `it('matches the compact skeleton to the compact card')`: `render(<BuildCardSkeleton variant="compact" />)` → `getByTestId('build-card-skeleton')` has `data-variant="compact"`.

- [ ] **Step 2: Run the tests and confirm they fail.** Run `pnpm vitest run src/components/shop/BuildCard.test.tsx`. Expected: FAIL on `data-variant`.

- [ ] **Step 3: Implement the variants.**
  - **Compact card:** a two-column grid on the `<Link>`, `grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 p-3`. The `PartImage` goes in the left cell with `aspect-[2/1] w-full self-start`. The right cell holds the title (`line-clamp-2 text-[15px] font-medium`), the byline, the `SpecLine` and the `PriceTag`. Keep the `data-slot="votes"` div in both variants.
  - **Compact skeleton:** same grid, with a skeleton image box on the left and four skeleton lines on the right.

- [ ] **Step 4: Run the tests and confirm they pass.** Same command. Expected: all pass, including the 2 existing tests.

- [ ] **Step 5: Commit.** `git commit -m "Add a compact BuildCard variant"` (stage the three files).

---

### Task 3: Hero copy and the slack line

**Files:**
- Modify: `src/features/home/utils/castGeometry.ts`, `src/features/home/components/RidgeScene.tsx`, `src/features/home/components/HomePage.tsx:32-35` (delete the `<p>`; change the action row's `mt-6` to `mt-8`)
- Test: `src/features/home/utils/castGeometry.test.ts`, `src/features/home/components/RidgeScene.test.tsx` (add tests only), `src/features/home/components/HomePage.test.tsx`

**Interfaces:**
- Produces: `export const SLACK_PATH: string` and `export const SLACK_WIDTH = 1.5` from `castGeometry.ts`. The path starts at the existing (private) `reel` point and ends at `(600, 460)`.

- [ ] **Step 1: Write the failing tests.**
  - `castGeometry.test.ts`, `it('runs the slack from the reel to the bottom center')`: `expect(SLACK_PATH).toMatch(/^M607\.76 360\.89 /)` and `expect(SLACK_PATH).toMatch(/ 600 460$/)`.
  - `RidgeScene.test.tsx`, `it('draws the slack in front of the near ridge, only from lg')`:
    - `getByTestId('slack')` has classes `hidden` and `lg:block` and no `mask` attribute.
    - Its `previousElementSibling` is the `haze-5` path (`.fill-haze-5`).
    - Its `stroke-width` is `1.5`.
  - `HomePage.test.tsx`, `it('has no paragraph under the headline')`: `expect(screen.queryByText(/We check each part/)).toBeNull()`.

- [ ] **Step 2: Run the tests and confirm they fail.** Run `pnpm vitest run src/features/home`. Expected: the 3 new tests FAIL; the existing ones pass.

- [ ] **Step 3: Implement.**
  - **Geometry:** in `castGeometry.ts`, build `SLACK_PATH` as `` `M${f(reel.x)} ${f(reel.y)} C614 392 600 420 600 460` ``, after `f` is defined (it is declared below `reel`).
  - **Rendering:** in `RidgeScene`, render it as the last child of the `<svg>`, after `haze-5`: `<path data-testid="slack" d={SLACK_PATH} fill="none" strokeWidth={SLACK_WIDTH} strokeLinecap="round" className="hidden stroke-belly lg:block" />`.
  - **Copy:** delete the hero `<p>`.

- [ ] **Step 4: Run the tests and confirm they pass.** Run `pnpm vitest run src/features/home`. Expected: all pass, including every existing `RidgeScene` test, untouched.

- [ ] **Step 5: Commit.** `git commit -m "Drop the hero paragraph; run slack line out of the hero"`

---

### Task 4: CatchLink: the hook, the fish and the catch

**Files:**
- Create: `src/features/home/components/CatchLink.tsx`
- Test: `src/features/home/components/CatchLink.test.tsx`
- Modify: `src/styles/index.css` (the catch keyframes)

**Interfaces:**
- Produces: `export const CATCH_MS = 450` and `export function CatchLink(): JSX.Element`.
- Layout contract with Task 5: the root is `div.relative.pl-10` with `data-catching="true"` while catching (no attribute otherwise). The hook's eye is centered 8px from the root's left edge and 8px from its top, so the line's last segment from Task 5 meets it.
- The root contains:
  - the hook SVG (`data-testid="hook"`, `aria-hidden`), with classes `catch-hook rig-sway`
  - the fish and splash SVG (`data-testid="fish"`, `aria-hidden`), class `catch-fish`
  - `<Button asChild size="lg"><Link to="/builder" onClick={…}>Start a build</Link></Button>`

- [ ] **Step 1: Write the failing tests.**
  - **Setup:** `vi.useFakeTimers()`. `vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduce && q.includes('reduce') }))`. Mock `react-router`'s `useNavigate` to return `navigate = vi.fn()`, keeping the rest of the module with `vi.importActual`. Render inside `<MemoryRouter>`.
  - `it('plays the catch, then opens the builder at 450 ms')`:
    - `fireEvent.click(link)` returns `false` (default prevented), and the root has `data-catching="true"`.
    - After `vi.advanceTimersByTime(449)`, `navigate` has not been called.
    - After `advanceTimersByTime(1)`, `navigate` has been called once with `'/builder'`.
  - `it('navigates once on a double click')`: click twice, advance 450 → `navigate` called once.
  - `it('skips the catch with reduced motion')`: with `reduce = true`, `fireEvent.click(link)` returns `true`, there is no `data-catching`, and `navigate` is not called (the Link navigates on its own).
  - `it('leaves modifier clicks to the browser')`: `fireEvent.click(link, { metaKey: true })` returns `true` and there is no `data-catching`. Repeat with `{ ctrlKey: true }` and with `{ button: 1 }`.
  - `it('cancels the navigation if unmounted mid-catch')`: click, `unmount()`, advance 450 → `navigate` not called.
  - `it('hides the hook and fish from assistive tech')`: `hook` and `fish` have `aria-hidden="true"`, and the only link is named `Start a build` with `href="/builder"`.

- [ ] **Step 2: Run the tests and confirm they fail.** Run `pnpm vitest run src/features/home/components/CatchLink.test.tsx`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement `CatchLink`.**
  - **Click handler:**
    - Return early (let the Link handle the click) if `e.button !== 0`, if any of `metaKey`, `ctrlKey`, `shiftKey` or `altKey` is set, or if `window.matchMedia?.('(prefers-reduced-motion: reduce)').matches`.
    - Otherwise call `e.preventDefault()`. If already catching, return.
    - Otherwise set catching, and start a `setTimeout(() => navigate('/builder'), CATCH_MS)` kept in a ref and cleared in an effect cleanup.
  - **Hook SVG:** about `20×40`, stroke `dorsal-band`, with the eye ring at the top (r≈2.6) and the shank, bend, point and barb, as in the brainstorm mockup `.superpowers/brainstorm/4005-1795380819/content/catch.html`.
  - **Fish SVG:** a brook trout facing left, built from the tokens in the spec (`olive` back, `belly` belly, `spot` spots with `halo` rings, `stone-card` fin edge), plus two `halo` splash ellipses. It is positioned beside the hook and starts at `opacity: 0`.

- [ ] **Step 4: Add the catch CSS to `index.css`,** inside `@media (prefers-reduced-motion: no-preference)` and targeting `[data-catching] …`:
  - `catch-set`: the hook moves `translateY(-6px)` over 120ms with `var(--ease-shop)` and holds there (`forwards`).
  - `catch-leap`: the fish goes from `translateY(28px) rotate(20deg)` at opacity 0, to on the hook at opacity 1, then `rotate(-12deg)`, from 120ms to 400ms.
  - `catch-splash`: the rings go from `scale(.4)` at opacity 1 to `scale(1.4)` at opacity 0, from 120ms to 400ms.
  - The button gets `translate-y-px` while catching, through a `data-catching` Tailwind variant on the root: `[[data-catching]_&]:translate-y-px`.

- [ ] **Step 5: Run the tests and confirm they pass.** Same command as Step 2. Expected: 6 passed.

- [ ] **Step 6: Commit.** `git commit -m "Add CatchLink: hook-set and brook trout before opening the builder"`

---

### Task 5: RigSteps on the line, the bridge and the scroll reveal

**Files:**
- Modify: `src/features/home/components/RigSteps.tsx` (rewrite), `src/styles/index.css` (scroll-driven rules)
- Test: `src/features/home/components/RigSteps.test.tsx` (new)

**Interfaces:**
- Consumes: `CatchLink` from Task 4, and its layout contract (8px gutter, `data-catching`).
- Produces:
  - `export function RigSteps(): JSX.Element`: a `<section>` column with no `Container`. The parent (Task 6) supplies it.
  - `export function RigBridge(): JSX.Element`: the `aria-hidden` bridge SVG, rendered by `HomePage` as the first child of the section's `Container`. It is `absolute top-0 hidden h-20 lg:block`, with `left: calc(1.5rem + 8px)` (the container's `sm:px-6` plus the gutter) and `right: 50%`.

- [ ] **Step 1: Write the failing tests** in `RigSteps.test.tsx` (render in `MemoryRouter`).
  - `it('lists the five steps in order on one line')`: `getByRole('list', { name: 'How a rig goes together' })` has 5 `listitem`s whose `h3`s read Rod, Reel, Line, Leader, Tippet.
  - `it('tapers the line 4, 4, 3, 2, 1 px')`: each `listitem`'s `[data-segment]` has `style.width` equal to `4px`, `4px`, `3px`, `2px`, `1px`, the `rig-draw` class and `aria-hidden="true"`.
  - `it('marks each step with a guide ring, not a number')`: 5 `[data-marker]` elements, all `aria-hidden="true"`. `queryByText('1')` is null.
  - `it('rises each step in as the line reaches it')`: each step's text wrapper has the `rig-rise` class.
  - `it('ends the line in a hook and a Start a build link')`: `getByTestId('hook')` exists, and the link `Start a build` points to `/builder`.
  - `it('draws the bridge only from lg, hidden from assistive tech')`: `render(<RigBridge />)`. The root has `hidden`, `lg:block` and `aria-hidden="true"`. Its path has `vector-effect="non-scaling-stroke"`, `pathLength="1"` and the `rig-bridge` class.

- [ ] **Step 2: Run the tests and confirm they fail.** Run `pnpm vitest run src/features/home/components/RigSteps.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement.** Keep `STEPS` and their comment as they are.
  - **Gutter:** the line's center is 8px from the column's left edge, and content starts at `pl-10`.
  - **Heading block:** `relative pb-8 pl-10`. Its 4px `belly` segment is `absolute left-2 top-0 -bottom-2 -translate-x-1/2`, shown `lg:block` only.
  - **Each `<li>`:** `relative pb-8 pl-10`, containing:
    - a `[data-marker]` 16px SVG at `absolute left-0 top-0`: a circle with r=5, `fill="none"`, stroke `dorsal-band`, stroke width 1.5;
    - a `[data-segment]` span at `absolute left-2 top-2 -bottom-2 -translate-x-1/2 bg-belly rig-draw` with an inline `width` and `aria-hidden`; the Tippet's also gets `rig-tippet`;
    - a text `<div className="rig-rise">` holding the `h3` and the `p`.
  - **After the `<ol>`:** `<CatchLink />`.
  - **`RigBridge`:** an SVG with `viewBox="0 0 100 80"` and `preserveAspectRatio="none"`, holding `<path d="M100 0 C100 48 0 32 0 80" stroke="var(--belly)" strokeWidth={4} fill="none" vectorEffect="non-scaling-stroke" pathLength={1} className="rig-bridge" />`.

- [ ] **Step 4: Add the scroll-driven CSS to `index.css`,** next to `cast` and `rise`.
  - **Wrapper:** everything goes inside `@supports (animation-timeline: view()) { @media (prefers-reduced-motion: no-preference) { … } }`.
  - `.rig-draw`: `transform-origin: top`, `animation: rig-draw linear both`, `animation-timeline: view()`, `animation-range: entry 30% cover 45%`. The `rig-draw` keyframes go from `scaleY(0)` to `scaleY(1)`.
  - `.rig-rise`: the `rise` keyframes with the same timeline, `animation-range: entry 40% cover 40%`.
  - `.rig-bridge`: `stroke-dasharray: 1`, with keyframes from `stroke-dashoffset: 1` to `0`, and `animation-range: entry 0% cover 50%`.
  - `.rig-sway`: a small rotate, from `-6deg` to `0`, around the eye (`transform-origin: 8px 8px`), with `animation-range: entry 0% entry 100%`.
  - **Taut tippet:** outside `@supports` but inside the motion media query, `.rig-steps:has([data-catching]) .rig-tippet { bottom: calc(-0.5rem + 6px); transition: bottom 120ms var(--ease-shop) }`. The `rig-steps` class goes on the `RigSteps` root.
  - **Rule:** nothing outside these blocks may set `opacity: 0` or a transform.

- [ ] **Step 5: Run the tests and confirm they pass.** Run `pnpm vitest run src/features/home`. Expected: all pass, including the existing `HomePage` tests (`HomePage` still renders `RigSteps` directly until Task 6).

- [ ] **Step 6: Commit.** `git commit -m "Run the rig steps along a tapering fly line, revealed on scroll"`

---

### Task 6: Two-column section: steps and Recently rigged

**Files:**
- Modify: `src/features/home/components/HomePage.tsx`, `src/features/home/components/RecentBuilds.tsx`
- Test: `src/features/home/components/RecentBuilds.test.tsx`, `src/features/home/components/HomePage.test.tsx`

**Interfaces:**
- Consumes: `RigSteps` and `RigBridge` (Task 5), and `BuildCard` / `BuildCardSkeleton` with `variant="compact"` (Task 2).
- Produces: `RecentBuilds(): JSX.Element | null`: a `<section>` column with no `Container`, with the same queries and states as today.

- [ ] **Step 1: Write the failing tests.**
  - `RecentBuilds.test.tsx`, `it('stacks compact cards')`: with 3 items, every link to `/rack/*` has `data-variant="compact"`, and the `<ul>` has the `flex-col` class.
  - `RecentBuilds.test.tsx`, `it('shows compact skeletons while loading')`: every `build-card-skeleton` has `data-variant="compact"`.
  - `HomePage.test.tsx`, `it('keeps the steps when recent builds fail')`: `listPublished.mockRejectedValueOnce(new Error('x'))`, and spy on `console.error`. After `waitFor`, the `Recently rigged` heading is absent, the steps list still has 5 items, and `getAllByRole('link', { name: 'Start a build' })` has length 2 (hero and hook).

- [ ] **Step 2: Run the tests and confirm they fail.** Run `pnpm vitest run src/features/home`. Expected: the new tests FAIL.

- [ ] **Step 3: Implement.**
  - **`RecentBuilds`:**
    - Drop the `Container` and the padding.
    - The list becomes `<ul className="flex flex-col gap-3">`, and the skeletons stack the same way.
    - Pass `variant="compact"` to the cards and skeletons.
    - Move the heading's top margin to `mt-6`.
    - The empty state and the "See all of the Community Rack" link are unchanged.
  - **`HomePage`:** after the hero `<section>`, render:

```tsx
<Container className="relative grid gap-16 pt-20 pb-24 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-20">
  <RigBridge />
  <RigSteps />
  <RecentBuilds />
</Container>
```

    Then remove the old standalone `<RigSteps />` and `<RecentBuilds />`.

- [ ] **Step 4: Run the full suite.** Run `pnpm test`. Expected: all pass.

- [ ] **Step 5: Commit.** `git commit -m "Put Recently rigged beside the rig steps as compact cards"`

---

### Task 7: Verify in a real browser and ship checks

**Files:** none, unless a check fails. Fix in the owning task's files and commit as `Fix: …`.

- [ ] **Step 1: Run the static checks.** Run `pnpm lint && pnpm build && pnpm check:contrast && pnpm test`. Expected: every command exits 0.

- [ ] **Step 2: Start the app.** Run `cd api && uv run fastapi dev app/main.py --port 3001` and `pnpm dev`, then open `http://localhost:5173/` in Chrome.

- [ ] **Step 3: Check each viewport and motion setting.** Cover 1440px, 1024px and 390px, each with reduced motion off and on (DevTools → Rendering → `prefers-reduced-motion`). Take a screenshot of each and confirm:
  1. **The rod:** it looks exactly as on `main`.
  2. **The slack:** it leaves the reel and meets the bridge at the hero's bottom center with no visible offset. This applies at 1024px and 1440px only.
  3. **The reveal:** the bridge and segments draw as you scroll, the steps rise in, and scrolling up reverses it.
  4. **The catch:** the final **Start a build** plays the hook-set, the fish and the splash, then the builder opens at about 450 ms. Back returns to the steps.
  5. **The hero's Start a build:** opens the builder instantly.
  6. **Narrow screens:** at 390px there is no bridge, the line starts at the Rod marker, and Recently rigged sits under the hook.
  7. **Reduced motion on:** everything is static and the catch is skipped.
  8. **Scrolling between pages:** scroll down a parts list and click **Add** → the builder opens at the top.
- [ ] **Step 4: Check Firefox.** At 1440px, all steps, the line and the hook are visible with no animation, and the catch still plays.

- [ ] **Step 5: Hand back.** Report what you checked, with screenshots, and any visual tuning committed (for example, the slack curve's control points).
