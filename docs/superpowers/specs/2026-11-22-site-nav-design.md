# Site navigation: one page header, "where am I", and a resumable Builder

Sub-project 4 of the UX polish pass. Branch `oa-site-nav`, started from `oa-guided-builder` (#61) with `oa-ux-polish` (#60) merged in. It merges after both. Approved in brainstorming on 2026-11-22. The mockup is `.superpowers/brainstorm/4005-1795380819/content/site-nav.html`.

## Why

- **Page titles come in two styles.** My builds and the Rack list use the shared `PageHeader` (olive, medium weight). Log in, Pick a display name, Account settings, a Rack build, Not found and the builder's load error use a bold title in the deprecated `te-papa-green` alias. Ten files still use the deprecated aliases, a leftover from the visual redesign.
- **A Rack build has no way back to the Rack** except the header. Its actions (**Open in Builder**, **Share**) sit at the bottom.
- **A saved build at `/builder/42` highlights Builder,** not My builds, and has no way back to the list.
- **A draft in progress is invisible outside the builder.**

## Goal

On any page, a visitor can tell where they are, how to get back, and what to do next. A half-built rig stays visible from every page until it's finished.

## Design

### 1. One page header

`PageHeader` (`src/components/shop/PageHeader.tsx`) gains an optional back link:

```ts
PageHeader({ title, description?, actions?, back? }: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string; onClick?: (e: MouseEvent) => void }
})
```

**The back link:**
- It sits above the title, as `text-sm text-ink-2` "← <label>", with a `size-4` `ArrowLeft` icon.
- It's a `Link` to `to`. When `onClick` is given, it runs on a plain click; that's how the Rack goes back in history (section 2).
- **Unchanged:** the title stays the `h1` (`text-[28px] font-medium text-olive`), and the description and actions keep their current layout: actions sit right on `sm` and up, below otherwise.

**Pages that switch to `PageHeader`:**

| Page | Title | Description | Actions | Back |
|---|---|---|---|---|
| Log in (`LoginPage`) | Log in | its current intro line, unchanged | none | none |
| Pick a display name (`DisplayNamePage`) | Pick a display name | its current line | none | none |
| Account settings (`AccountPage`) | Account settings | its current line | none | none |
| A Rack build (`PublishedBuildPage`) | the build's title | "by <author> · <date>" | **Open in Builder**, **Share** (moved up from the bottom) | ← Community Rack |

**Pages that keep their own layout:**
- **Not found** (`src/components/NotFound.tsx`) and the builder's "Couldn't load parts" (`BuilderLayout`) stay centered. Only their titles take the same title classes.
- **The builder's steps and summary** keep their headings under the progress bar. They already use `text-3xl font-medium text-olive`; that's aligned to `text-[28px]` so every title matches.

**Deprecated aliases:**
- Every use of the block marked "Deprecated: removed in sub-project 2" in `src/styles/index.css` is swapped for its token, as the block maps them. For example, `te-papa-green` and `plantation` become `olive`, `spectra` and `sulu` become `belly`, and `tasman` becomes `ink-2`.
- Then the block is deleted.
- `grep -rnE "te-papa-green|plantation|spectra|tasman|sulu|cod-gray|linen|bone|twine" src` must return nothing.
- CLAUDE.md's sentence about that block is removed.

### 2. Where am I

**The highlighted header item** comes from one rule per item, in place of `NavLink`'s prefix match:

| Path | Highlighted |
|---|---|
| `/builder`, `/builder/<step>` (`rod` … `tippet`), and an old `/builder/<part>/<brand>` link | Builder |
| `/builder/<digits>` and anything under it, `/my-builds` | My builds |
| `/rack` and `/rack/<id>` | Community Rack |
| everything else | nothing |

`navItems.ts` exports `activeNavItem(pathname): '/builder' | '/my-builds' | '/rack' | null`. The header, the phone menu and the footer all use it, setting `aria-current="page"` on the active item.

**Back links:**
- **A saved build:** "← My builds" above its name (in `BuildHeader`) on every step and the summary. There's no back link on a draft, since the progress bar moves between its steps.
- **A Rack build:**
  - `BuildCard`'s link passes `state={{ from: pathname + search }}`.
  - On `PublishedBuildPage`, the back link is "← Community Rack". When `location.state?.from` starts with `/rack`, a plain click calls `navigate(-1)` (keeping the list's filters and, through `ScrollManager`, its scroll), and the link's `href` is that `from`.
  - Otherwise, e.g. from the homepage's Recently rigged or a shared link, it's a normal link to `/rack`.

### 3. The Builder count

**`useDraftProgress()`** is a new hook in `features/builder/hooks/useDraftProgress.ts`, exported from the barrel. It returns `{ picked: number }`:
- **Count:** the number of the five parts with a string id in the `rpp:build:v2` draft. A missing or malformed value counts as 0.
- **No catalog check:** it doesn't check parts against the catalog, which the header doesn't load.
- **Updates:** it's built on `useSyncExternalStore`, subscribed to the window's `storage` event (other tabs) and to a new `rpp:draft-change` event. `LocalBuildProvider` dispatches `rpp:draft-change` after every write of the draft.
- **Saved builds aren't counted.** They live in My builds.

**Display:**
- The route `Layout` (`AppRoutes.tsx`) calls the hook and passes `builderProgress={picked}` to `SiteHeader` and `SiteFooter`. Shared components never import a feature.
- **0 parts:** "Builder" only.
- **1–4 parts:** "Builder" plus a small pill, "<n> of 5" (`bg-stone-raised text-ink-2`, `rounded-full`, `text-xs`). The link's accessible name is "Builder, <n> of 5 picked".
- **5 parts:** the pill reads "ready" (`bg-recommended-wash text-recommended-ink`). The accessible name is "Builder, rig ready".
- The same pill appears in the phone menu and in the footer, where it's text only, inheriting the footer's colors.
- **The link** still goes to `/builder`. With a rod that's the summary, which shows **Continue** when parts are missing.

## Units

- **`src/components/shop/PageHeader.tsx`:** the `back` prop.
- **`src/components/shop/navItems.ts`:** `activeNavItem`, and `builderLabel(picked)` → `{ pill: string | null; accessibleName: string }`.
- **`SiteHeader.tsx` and `SiteFooter.tsx`:** the `builderProgress?: number` prop, the active rule and the pill.
- **`src/components/shop/BuildCard.tsx`:** the `state.from` on its link.
- **`features/builder/hooks/useDraftProgress.ts`:** new.
- **`LocalBuildProvider.tsx`:** dispatches `rpp:draft-change`.
- **`BuildHeader.tsx`:** "← My builds".
- **`src/routes/AppRoutes.tsx`:** `Layout` passes the count.
- **Pages:** `LoginPage`, `DisplayNamePage`, `AccountPage`, `DisplayNameForm`, `PublishedBuildPage`, `PublishDialog`, `PublishControls`, `BuilderLayout`, `NotFound`, and the builder step and summary titles.
- **`src/styles/index.css`:** remove the deprecated block.
- **`CLAUDE.md`:** drop the deprecated-aliases sentence.

## Testing

All tests are Vitest.

- **`PageHeader`:**
  - Renders the back link above the `h1` only when given.
  - A plain click runs `onClick`; a Cmd-click doesn't.
- **`navItems`:**
  - `activeNavItem` for every row of the section 2 table, plus `/`, `/account` and `/login` → null.
  - `builderLabel` for 0, 3 and 5 parts.
- **`SiteHeader`:**
  - `/builder/42/line` marks My builds.
  - `/builder/line` marks Builder.
  - `/rack/7` marks Community Rack.
  - The pill and accessible name for 3 and 5.
  - No pill for 0, and the phone menu shows the same.
  - The existing tests still pass.
- **`SiteFooter`:** the count text, and the existing tests.
- **`useDraftProgress`:**
  - 0 with nothing stored, and 0 with malformed JSON.
  - Counts only the five part keys.
  - Updates on `rpp:draft-change` and on `storage`.
- **`LocalBuildProvider`:** choosing a part dispatches `rpp:draft-change`.
- **`PublishedBuildPage`:**
  - From the list (`state.from = '/rack?brand=sage'`), the back link's href is that, and a click goes back in history.
  - Without state, it's a link to `/rack`.
  - Open in Builder and Share are in the header.
- **`BuildHeader`:** a saved build shows "← My builds" linking to `/my-builds`.
- **Static checks:**
  - The deprecated-alias grep is empty.
  - `pnpm test`, `pnpm lint`, `pnpm build` and `pnpm check:contrast` pass.
- **Manual pass in Chrome:** every page at 1440px and 390px, the count going 0 → 3 → ready while building, and back from a filtered Rack list.

## Out of scope

- Changing the phone menu pattern (no bottom tab bar).
- Breadcrumbs.
- New pages or features.
- Restyling the footer.
