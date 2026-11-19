# Community Rack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the public catalog to the Community Rack (`/rack`), put My builds (`/my-builds`) in the main nav, replace Publish wording with "Post to the Rack", show Rack status on My builds, and add a Share button for Rack builds.

**Architecture:**
- The API gains one field: `publishedId` on `GET /api/builds`, from an outer join. Everything else is frontend.
- Route and nav changes live in `src/routes/` and `src/components/shop/`.
- `ShareButton` is a new shared component in `@components/shop`, used by the `catalog` and `builder` features.
- Code identifiers that say "published" stay as they are. Only the text users see changes.

**Tech Stack:** FastAPI + SQLAlchemy 2 + pytest; React 19 + TypeScript + react-router + TanStack Query + Vitest/Testing Library; shadcn-style primitives on `radix-ui`; lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-19-community-rack-design.md`. Read its **Words** table before any task that changes text.

## Global Constraints

- **Words:**
  - "Community Rack" (short form "the Rack") and "My builds".
  - Buttons: "Post to the Rack", "Update on the Rack", "Take off the Rack".
  - Status text: "Posted to the Rack", "Updated on the Rack".
  - Link text: "On the Community Rack · View".
  - My builds markers: "On the Rack" and "Private".
- No user-facing string says "Publish", "Published", "Unpublish" or "Completed builds". Identifiers such as `PublishControls`, `publishedKeys`, `published_builds` and `/api/published` stay.
- **Routes:**
  - `/rack`, `/rack/:id` and `/my-builds` are the new paths.
  - `/builds` redirects to `/rack`, keeping the query string.
  - `/builds/:id` redirects to `/rack/:id`.
  - `/builder/saved` redirects to `/my-builds`.
  - Every redirect uses `replace`.
- **Layer rule:** `src/components/shop` must not import `@hooks/auth` or any `@features/*`. Features never import each other.
- The React Compiler is on, so don't hand-write `useMemo`, `useCallback` or `React.memo`.
- Don't use the deprecated color aliases in `src/styles/index.css` in new code. Use the stone, ink, hairline, belly and olive tokens.
- Each PR stays under 500 lines, excluding deletions and generated files.
- **Branches:**
  - Task 1 goes on `oa-rack-1-api`, which already holds the spec commit.
  - Tasks 2–8 go on `oa-rack-2-web`, branched from `oa-rack-1-api`.
- End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A signed-out user follows an old `/builder/saved` bookmark.** It should redirect to `/my-builds`, and then `RequireAuth` should send them to login with `/my-builds` as the return path, not the old one. The test is in Task 2.
2. **An old filtered link like `/builds?weight=5&page=2`** should keep every parameter on `/rack`. The test is in Task 2.
3. **The owner posts from the builder, then opens My builds without reloading.** The row must already say "On the Rack", so a post must invalidate `buildKeys.list()`. The test is in Task 5.
4. **Share is clicked twice in a row, or the page changes during "Link copied".** The second click restarts the 2-second timer, and leaving the page clears the timer without warnings. The test is in Task 6.
5. **A saved build is deleted while it's on the Rack.** It leaves My builds, and its `published_builds` row stays, so `/rack/:id` still works. The test is in Task 1.

---

## PR 1: `oa-rack-1-api`

### Task 1: `publishedId` on the saved-builds list

**Files:**
- Modify: `api/app/builds/schemas.py` (add `BuildListItem`)
- Modify: `api/app/builds/router.py:30-37` (`list_builds`)
- Modify: `api/tests/conftest.py`. Move the `make_published` fixture and `PART_COLUMNS` here from `api/tests/test_published.py`, and import them there.
- Test: `api/tests/test_builds.py`

**Interfaces:**
- Produces: `GET /api/builds` → `list[BuildListItem]`, where `BuildListItem(BuildOut)` adds `published_id: int | None` (`publishedId` on the wire, via `CamelModel`).

- [ ] **Step 1: Move `make_published`.** Move the fixture to `conftest.py` and run `cd api && uv run pytest tests/test_published.py -q`. Expected: all pass, unchanged.

- [ ] **Step 2: Write the failing tests** in `test_builds.py`:

```python
def test_list_reports_rack_status(client, signed_in, make_build, make_published):
    posted = make_build(user_id=signed_in["id"])
    private = make_build(user_id=signed_in["id"])
    rack = make_published(user_id=signed_in["id"], source_build_id=posted.id)
    by_id = {b["id"]: b for b in client.get("/api/builds").json()}
    assert by_id[posted.id]["publishedId"] == rack.id
    assert by_id[private.id]["publishedId"] is None

def test_list_ignores_other_users_rack_builds(client, signed_in, make_build, make_user, make_published):
    mine = make_build(user_id=signed_in["id"])
    other = make_user()
    theirs = make_build(user_id=other.id)
    make_published(user_id=other.id, source_build_id=theirs.id)
    body = client.get("/api/builds").json()
    assert [b["id"] for b in body] == [mine.id]
    assert body[0]["publishedId"] is None

def test_list_rack_status_clears_after_take_down(client, signed_in, db, make_build, make_published):
    build = make_build(user_id=signed_in["id"])
    make_published(user_id=signed_in["id"], source_build_id=build.id)
    assert client.delete(f"/api/builds/{build.id}/published").status_code == 204
    db.rollback()
    assert client.get("/api/builds").json()[0]["publishedId"] is None

def test_deleted_build_leaves_rack_copy(client, signed_in, db, make_build, make_published):
    build = make_build(user_id=signed_in["id"])
    rack = make_published(user_id=signed_in["id"], source_build_id=build.id)
    assert client.delete(f"/api/builds/{build.id}").status_code == 204
    db.rollback()
    assert client.get("/api/builds").json() == []
    assert client.get(f"/api/published/{rack.id}").status_code == 200

def test_list_order_unchanged_by_rack_join(client, signed_in, make_build, make_published):
    old = make_build(user_id=signed_in["id"], updated_at=datetime(2026, 1, 1))
    new = make_build(user_id=signed_in["id"], updated_at=datetime(2026, 2, 1))
    make_published(user_id=signed_in["id"], source_build_id=old.id)
    assert [b["id"] for b in client.get("/api/builds").json()] == [new.id, old.id]
```

- [ ] **Step 3: Run the tests.** Run `cd api && uv run pytest tests/test_builds.py -q`. Expected: the five new tests FAIL with `KeyError: 'publishedId'`. `test_deleted_build_leaves_rack_copy` may already pass; it guards against a regression.

- [ ] **Step 4: Implement.**
  - Add `BuildListItem(BuildOut)` with `published_id: int | None = None`.
  - In `list_builds`, select `Build` and `PublishedBuild.id` with `.outerjoin(PublishedBuild, PublishedBuild.source_build_id == Build.id)`, keeping the same `where` and `order_by`.
  - Return `[BuildListItem.model_validate(b).model_copy(update={"published_id": pid}) for b, pid in db.execute(stmt)]`, or the equivalent. The return annotation becomes `list[BuildListItem]`.
  - Import `PublishedBuild` from `app.published.models`.

- [ ] **Step 5: Run the whole API suite and the linter.** Run `cd api && uv run pytest -q && uv run ruff check .`. Expected: all pass, and ruff reports no errors.

- [ ] **Step 6: Commit.** Message: `Add publishedId to the saved-builds list`. Then open PR 1 → main.

---

## PR 2: `oa-rack-2-web` (based on `oa-rack-1-api`)

### Task 2: Routes and redirects

**Files:**
- Create: `src/routes/redirects.tsx`
- Create: `src/routes/redirects.test.tsx`
- Modify: `src/routes/AppRoutes.tsx`
- Modify every internal link. Find them with `grep -rnE "['\"\`]/builds|/builder/saved" src`:
  - `src/components/shop/BuildCard.tsx`
  - `src/features/home/components/HomePage.tsx`
  - `src/features/home/components/RecentBuilds.tsx`
  - `src/features/catalog/components/PublishedBuildPage.tsx` (the `notFound` `backTo`)
  - `src/features/builder/components/PublishControls.tsx`
  - `src/features/builder/hooks/SavedBuildProvider.tsx`
  - `src/features/auth/components/UserMenu.tsx`
- Modify the tests that assert those paths:
  - `BuildCard.test.tsx`
  - `HomePage.test.tsx`
  - `RecentBuilds.test.tsx`
  - `PublishedBuildPage.test.tsx` (route `/rack/:id`)
  - `SiteHeader.test.tsx` (paths only; Task 3 rewrites the labels)

**Interfaces:**
- Produces: `RedirectToRack()` (to `/rack` + `location.search`), `RedirectToRackBuild()` (to `/rack/:id`) and `RedirectToMyBuilds()` (to `/my-builds`). All are exported from `src/routes/redirects.tsx` and each renders `<Navigate replace>`.
- Produces the route table from the spec's "Routes" section. `/my-builds` is `<Route element={<BuilderLayout />}><Route path="my-builds" element={<RequireAuth><MyBuildsPage /></RequireAuth>} /></Route>`. `builder/saved` keeps its place inside `builder` and renders `RedirectToMyBuilds`.

- [ ] **Step 1: Write the failing tests** in `redirects.test.tsx`. Render a `MemoryRouter` with `initialEntries` and a `Routes` that holds only the three redirect routes and `/rack`, `/rack/:id` and `/my-builds` routes. Those routes render a `LocationProbe` showing `pathname + search`, and a probe for `useNavigationType()`.

```tsx
it.each([
  ['/builds', '/rack'],
  ['/builds?weight=5&page=2', '/rack?weight=5&page=2'],
  ['/builds/7', '/rack/7'],
  ['/builder/saved', '/my-builds'],
])('redirects %s to %s with replace', (from, to) => {
  renderAt(from)
  expect(screen.getByTestId('location')).toHaveTextContent(to)
  expect(screen.getByTestId('nav-type')).toHaveTextContent('REPLACE')
})
```

In the same file, add a test for Review Focus 1:
- Render `/builder/saved` with the real `RequireAuth` around a `/my-builds` element, and `useAuth` mocked as `{ status: 'anonymous', user: null }`, the pattern in `UserMenu.test.tsx`.
- Assert that the location is `/login?next=%2Fmy-builds`. `RequireAuth` builds `next` from the current path, so check the encoding against `RequireAuth.tsx:20`.

- [ ] **Step 2: Run the tests.** Run `pnpm test src/routes/redirects.test.tsx`. Expected: FAIL, because the module isn't found.

- [ ] **Step 3: Implement** `redirects.tsx`, the new route table and the internal link changes. Use `/rack` as the `NotFound` `backTo` in `PublishedBuildPage`. Labels change in Task 4.

- [ ] **Step 4: Run the full checks.** Run `pnpm test && npm run build`. Expected: all pass. The existing tests now assert `/rack…` and `/my-builds`.

- [ ] **Step 5: Commit.** Message: `Move the catalog to /rack and My builds to /my-builds`.

### Task 3: Nav with My builds

**Files:**
- Modify: `src/components/shop/navItems.ts`
- Modify: `src/components/shop/SiteHeader.tsx`
- Modify: `src/routes/AppRoutes.tsx` (`Layout`)
- Modify: `src/features/auth/components/UserMenu.tsx` (remove the My Builds item)
- Test: `src/components/shop/SiteHeader.test.tsx`
- Test: `src/features/auth/components/UserMenu.test.tsx`

**Interfaces:**
- Produces: `NAV_ITEMS: { to: string; label: string; requiresAuth?: boolean }[]`, set to `[{ to: '/builder', label: 'Builder' }, { to: '/my-builds', label: 'My builds', requiresAuth: true }, { to: '/rack', label: 'Community Rack' }]`.
- Produces: `SiteHeader({ account, signedIn }: { account: ReactNode; signedIn: boolean })`. It shows items where `!item.requiresAuth || signedIn`, in both the desktop nav and the mobile sheet.
- `Layout` passes `signedIn={status === 'authenticated'}` from `useAuth()`.

- [ ] **Step 1: Write the failing tests.** Update `renderAt(path, { signedIn })` in `SiteHeader.test.tsx`:

```tsx
it.each([
  ['/builder', 'Builder'], ['/builder/12/rod/all', 'Builder'],
  ['/my-builds', 'My builds'], ['/rack', 'Community Rack'], ['/rack/5', 'Community Rack'],
])('marks only %s → %s as current', (path, label) => {
  renderAt(path, { signedIn: true })
  const nav = screen.getByRole('navigation', { name: 'Main' })
  const current = within(nav).getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'page')
  expect(current.map((l) => l.textContent)).toEqual([label])
})
it('hides My builds when signed out', () => {
  renderAt('/', { signedIn: false })
  const nav = screen.getByRole('navigation', { name: 'Main' })
  expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(['Builder', 'Community Rack'])
})
```

Add the same signed-in and signed-out check for the mobile sheet's `Menu` navigation, opening it with `userEvent`. In `UserMenu.test.tsx`, assert that an authenticated user's open menu has no `My Builds` item.

- [ ] **Step 2: Run the tests.** Run `pnpm test src/components/shop/SiteHeader.test.tsx src/features/auth`. Expected: FAIL.

- [ ] **Step 3: Implement.** Use the `NAV_ITEMS`, `SiteHeader` and `Layout` interfaces above, and remove the My Builds item from `UserMenu`.

- [ ] **Step 4: Run the full checks.** Run `pnpm test && npm run build && npm run lint`. Expected: all pass.

- [ ] **Step 5: Commit.** Message: `Add My builds and Community Rack to the main nav`.

### Task 4: Page headers and catalog wording

**Files:**
- Modify: `src/features/catalog/components/PublishedListPage.tsx`
- Modify: `src/features/catalog/components/PublishedBuildPage.tsx`
- Modify: `src/features/builder/components/MyBuildsPage.tsx` (header only)
- Modify: `src/features/home/components/HomePage.tsx`
- Modify: `src/features/home/components/RecentBuilds.tsx`
- Modify: `src/features/builder/components/CopyPublishedIntent.tsx`
- Tests: the matching `*.test.tsx` files

**Text to use, exactly:**
- **`PublishedListPage`:** `<PageHeader title="Community Rack" description="Builds posted by anglers on RodPartPicker. Copy any one into your Builder." />` replaces the `<h1>`. Keep the `mb-8` spacing before the filters. With no filters, the empty first page reads "Nothing on the Rack yet".
- **`MyBuildsPage`:** `<PageHeader title="My builds" description="Only you can see these. Post one to the Rack to share it." actions={<Button asChild><Link to="/builder">New build</Link></Button>} />`.
- **`PublishedBuildPage`:** `notFound` has `backLabel="Community Rack"`.
- **`HomePage`:** "See the Community Rack".
- **`RecentBuilds`:**
  - Link text: "See all of the Community Rack".
  - Empty state: title "Nothing on the Rack yet", description "Post yours from the Builder."
- **`CopyPublishedIntent`:** "That build is no longer on the Rack".

- [ ] **Step 1: Update the tests to the new text.** This covers the heading `Community Rack` with its description, the heading `My builds`, the home links' names, and the two empty states. Run `pnpm test`. Expected: those assertions FAIL.
- [ ] **Step 2: Change the text.** Run `pnpm test`. Expected: all pass.
- [ ] **Step 3: Commit.** Message: `Name the catalog the Community Rack`.

### Task 5: Posting wording in the builder

**Files:**
- Modify: `src/features/builder/components/PublishControls.tsx`
- Modify: `src/features/builder/components/PublishDialog.tsx`
- Create: `src/features/builder/utils/rackMessage.ts`
- Create: `src/features/builder/components/PublishControls.test.tsx`
- Create: `src/features/builder/utils/rackMessage.test.ts`

**Interfaces:**
- Produces: `rackMessage(message: string): string`. It maps the API's text to Rack wording and leaves everything else unchanged. The API's messages stay as they are, because their tests depend on them.
  - `'Already published'` → `'Already on the Rack'`
  - `'Add all five parts before publishing'` → `'Add all five parts before posting'`
  - `'Not published'` → `'Not on the Rack'`

  `PublishDialog` shows `rackMessage(apiMessage(e))`. Its `=== 'Already published'` check keeps comparing the raw API text.
- Consumes: `buildKeys.list()` from `../api/builds`.

**Text to use, exactly** (the rest is in the spec's "Posting to the Rack"):
- **Controls:**
  - "Post to the Rack" and "Add all five parts to post"
  - "On the Community Rack · View"
  - "Update on the Rack" and "Take off the Rack"
  - status text "Posted to the Rack" and "Updated on the Rack"
  - error state "Couldn't load Rack status"
- **Dialog:** the titles, descriptions and submit labels in the spec's `PublishDialog` table. The flush error reads "Couldn't save your latest changes; retry before posting".
- **Take-down confirmation:**
  - Title: `Take "{title}" off the Rack?`
  - Description: "It comes off the Community Rack. Your saved build stays in My builds, and you can post it again later."
  - Confirm button: "Take off the Rack". Its error reads "Couldn't take it off the Rack, try again".

- [ ] **Step 1: Write the failing tests.**
  - **`rackMessage.test.ts`:** the three mappings, plus an unknown message passing through unchanged.
  - **`PublishControls.test.tsx`:**
    - `vi.mock('../api/publish')`.
    - Render in a `QueryClientProvider` and `MemoryRouter`, with a complete `Build` (all five slots set).
    - `getMyPublished` resolves `null`: the button "Post to the Rack" is enabled.
    - The build is missing a part: the button is disabled, and the "Add all five parts to post" hint shows.
    - `getMyPublished` resolves `{ id: 9, title: 'Creek', writeup: 'x', updatedAt: '…' }`:
      - the link "On the Community Rack · View" has `href="/rack/9"`
      - the buttons "Update on the Rack" and "Take off the Rack" are present
    - Review Focus 3: spy on `queryClient.invalidateQueries`. Confirm the take-down with `unpublishBuild` resolved, and assert a call with `{ queryKey: buildKeys.list() }`.
    - In the same file, render `PublishDialog` with `open` in `mode="publish"` and `mode="update"`, and assert the exact titles and descriptions. `PublishForm` calls `useBuild()`, so `vi.mock('../hooks/useBuild')` to return `{ kind: 'saved', flushSave: vi.fn() }`.
  - Add a dialog test where `publishBuild` rejects with `new ApiError(409, { detail: 'Already published' })`. Match `ApiError`'s real constructor in `src/lib/api.ts`. The alert reads "Already on the Rack".
  - Add a dialog test where the publish succeeds, asserting `invalidateQueries` was called with `buildKeys.list()`.
- [ ] **Step 2: Run the tests.** Run `pnpm test src/features/builder`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - Change the text.
  - Add `rackMessage`.
  - Invalidate `buildKeys.list()` in `PublishDialog`'s success path and in `UnpublishButton`'s `resync`.
  - Leave a `{/* ShareButton: Task 7 */}` gap after the View link. Task 7 fills it.
- [ ] **Step 4: Run the full checks.** Run `pnpm test && npm run build`. Expected: all pass.
- [ ] **Step 5: Commit.** Message: `Reword publishing as posting to the Rack`.

### Task 6: `ShareButton`

**Files:**
- Create: `src/components/ui/popover.tsx`. This is a standard shadcn Popover over `radix-ui`'s `Popover`, with the same structure as `tooltip.tsx` (`import { Popover as PopoverPrimitive } from "radix-ui"`). It exports `Popover`, `PopoverTrigger`, `PopoverAnchor` and `PopoverContent`, using `bg-stone-card`, `border-hairline` and `text-ink` tokens.
- Create: `src/components/shop/ShareButton.tsx`
- Modify: `src/components/shop/index.ts` (export it)
- Test: `src/components/shop/ShareButton.test.tsx`

**Interfaces:**
- Produces: `ShareButton({ path, title, size = 'sm' }: { path: string; title: string; size?: 'sm' | 'default' })`.

**Behavior** (spec "Share"):
- The URL is `new URL(path, window.location.origin).href`.
- **Share sheet:** used when `typeof navigator.share === 'function' && navigator.canShare?.({ url }) && window.matchMedia('(pointer: coarse)').matches`. It awaits `navigator.share({ title, url })`. A `DOMException` named `AbortError` does nothing; any other error falls through to copying.
- **Copy:** `navigator.clipboard.writeText(url)` (it may be undefined). On success, the label becomes "Link copied" for 2000 ms. A click while the label shows restarts the timer, and unmounting clears it.
- **Status region:** a `role="status"` element is always mounted and holds "Link copied" while the label shows.
- **Fallback:** if copying fails, a `Popover` is anchored to the button. It holds a read-only native `<input aria-label="Link">` with the URL, selected on open (`onFocus={(e) => e.currentTarget.select()}` plus `autoFocus`), and the hint "Copy this link". The repo has no `Input` primitive, and one read-only field doesn't justify adding one. Style it with token classes.
- **Look:** `Button variant="secondary"`, with `Share2` from lucide-react (`aria-hidden`) and the text "Share".

- [ ] **Step 1: Write the failing tests.** Stub with `vi.stubGlobal` and `Object.defineProperty(navigator, …)`, and restore with `vi.unstubAllGlobals()` in `afterEach`. Stub `window.matchMedia` to return `{ matches }`.

```tsx
it('opens the share sheet on a touch device', async () => {
  const share = mockShare(); coarse(true)
  await click(<ShareButton path="/rack/7" title="Creek" />)
  expect(share).toHaveBeenCalledWith({ title: 'Creek', url: 'http://localhost:3000/rack/7' })
})
it('does nothing when the sheet is closed', async () => {
  mockShare(Promise.reject(new DOMException('', 'AbortError'))); coarse(true)
  const writeText = mockClipboard()
  await click(<ShareButton path="/rack/7" title="Creek" />)
  expect(writeText).not.toHaveBeenCalled()
  expect(screen.queryByText('Copy this link')).toBeNull()
})
it('copies on a desktop and says so for 2 seconds', async () => { /* fake timers; label + status "Link copied", gone after 2000 ms */ })
it('restarts the timer on a second click', async () => { /* click, advance 1500, click, advance 1500 → still "Link copied"; advance 500 → gone */ })
it('clears its timer on unmount', async () => { /* click, unmount, advance 2000; no React act/setState warning (spy console.error) */ })
it('shows the link to copy by hand when copying fails', async () => {
  mockClipboard(Promise.reject(new Error('denied'))); coarse(false)
  await click(<ShareButton path="/rack/7" title="Creek" />)
  expect(await screen.findByRole('textbox', { name: 'Link' })).toHaveValue('http://localhost:3000/rack/7')
  expect(screen.getByText('Copy this link')).toBeInTheDocument()
})
```

Write the origin in the assertions as `window.location.origin + '/rack/7'`, rather than hard-coding the jsdom origin.

- [ ] **Step 2: Run the tests.** Run `pnpm test src/components/shop/ShareButton.test.tsx`. Expected: FAIL, because the module isn't found.
- [ ] **Step 3: Implement** `popover.tsx` and `ShareButton.tsx`, and add the export.
- [ ] **Step 4: Run the full checks.** Run `pnpm test && npm run build && npm run lint && pnpm check:contrast`. Expected: all pass.
- [ ] **Step 5: Commit.** Message: `Add ShareButton`.

### Task 7: Rack status on My builds, and the Share placements

**Files:**
- Modify: `src/features/builder/api/builds.ts`. Add `publishedId?: number | null` to `SavedBuild`; `toBuild` ignores it.
- Modify: `src/features/builder/components/MyBuildsPage.tsx`
- Modify: `src/features/builder/components/PublishControls.tsx` (fill the Task 5 gap)
- Modify: `src/features/catalog/components/PublishedBuildPage.tsx`
- Create: `src/features/builder/components/MyBuildsPage.test.tsx`
- Modify: `PublishControls.test.tsx` and `PublishedBuildPage.test.tsx`

**Interfaces:**
- Consumes: `ShareButton` (Task 6) and `GET /api/builds`'s `publishedId` (Task 1).

**What to build:**
- **My builds, the Rack column.** A `Rack` column goes between Total and Last edited.
  - **Posted:** `<Link to={`/rack/${publishedId}`}>On the Rack</Link>`, then `<ShareButton path={`/rack/${publishedId}`} title={saved.name} />`.
  - **Not posted:** `<span className="text-ink-2">Private</span>`.
- **`DeleteBuildButton`** takes `publishedId`, and its description depends on it:
  - **Posted:** "This build is on the Community Rack. Deleting it leaves the Rack copy up, and you won't be able to take it down. Take it off the Rack first."
  - **Not posted:** "This can't be undone."
- **`PublishControls`:** after the View link, add `<ShareButton path={`/rack/${published.id}`} title={published.title} />`.
- **`PublishedBuildPage`:**
  - Wrap **Open in Builder** and `<ShareButton path={`/rack/${data.id}`} title={data.title} size="default" />` in `<div className="mt-8 flex flex-wrap gap-3">`.
  - The page has no `PageHeader`. The spec's "PageHeader actions" means this row, next to Open in Builder. Record that in the spec's "Changes during implementation" in Task 8.

- [ ] **Step 1: Write the failing tests.**
  - **`MyBuildsPage.test.tsx`:**
    - `vi.mock('../api/builds', …)` keeps `buildKeys` and `toBuild` real and mocks `listBuilds`. Render inside a `CatalogContext` with an empty catalog. Read `BuilderLayout.test.tsx` for how it provides the catalog.
    - Two rows: `{ id: 1, name: 'Creek', publishedId: 9 }` and `{ id: 2, name: 'Lake', publishedId: null }`.
    - Row 1 has the link "On the Rack" with `href="/rack/9"`, and a "Share" button.
    - Row 2 has the text "Private" and no Share button.
    - Opening Delete on row 1 shows "This build is on the Community Rack." Opening it on row 2 shows "This can't be undone."
  - **`PublishControls.test.tsx`:** when posted, a "Share" button is present.
  - **`PublishedBuildPage.test.tsx`:** with `getPublished` resolving a build, both "Open in Builder" and "Share" are present.
- [ ] **Step 2: Run the tests.** Run `pnpm test src/features`. Expected: the new assertions FAIL.
- [ ] **Step 3: Implement** the changes above.
- [ ] **Step 4: Run the full checks.** Run `pnpm test && npm run build && npm run lint`. Expected: all pass.
- [ ] **Step 5: Commit.** Message: `Show Rack status on My builds and add Share`.

### Task 8: Link preview defaults, docs and the final check

**Files:**
- Modify: `index.html`
- Create: `public/og.png` (1200×630)
- Create: `scripts/og-image.svg` (the source of the PNG)
- Modify: `docs/builds/published-builds.md`
- Modify: `docs/builds/saved-builds.md`
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-11-19-community-rack-design.md` (add "Changes during implementation")

- [ ] **Step 1: Make the preview image.** `scripts/og-image.svg` is a 1200×630 SVG.
  - Background: `stone-page`.
  - The ridgeline paths from `src/features/home/components/RidgeScene.tsx`, scaled to the width.
  - "RodPartPicker" in Public Sans 500, `ink` color, at about 88px.
  - The tagline "Build a fly rod setup that fits." in `ink-2`.

  Convert it with `rsvg-convert -w 1200 -h 630 scripts/og-image.svg -o public/og.png`, falling back to `npx --yes @resvg/resvg-js-cli scripts/og-image.svg public/og.png`.

  Verify with `file public/og.png`. Expected: `PNG image data, 1200 x 630`. Open the image and check the text renders: if Public Sans is missing at render time, fall back to the system sans.
- [ ] **Step 2: Add the tags to `<head>` in `index.html`.** Use exactly these values:
  - `og:title` "RodPartPicker"
  - `og:description` "Build a fly rod setup that fits, and share it on the Community Rack."
  - `og:image` "/og.png"
  - `og:type` "website"
  - `twitter:card` "summary_large_image"

  Don't add `og:url`. Add a comment noting that an `og:image` crawlers can read needs an absolute URL. It is set to the Vercel origin at deploy, which is a hosting-plan item, not part of this PR.
- [ ] **Step 3: Docs.** Follow the spec's "Documentation" section:
  - In `published-builds.md`, retitle it "Published builds: the Community Rack". Add the Words table, the note that "published" in code means "on the Rack" in the UI, the redirects, and `ShareButton`. Change every `/builds` path to `/rack`.
  - In `saved-builds.md`, use `/my-builds`, and add `publishedId`, the Rack column and the delete warning.
  - In `CLAUDE.md`:
    - the UI sections read: landing page, Builder, My builds and Community Rack
    - the catalog paragraph uses `/rack` and `/rack/:id`
    - "My Builds lives at `/builder/saved`" becomes `/my-builds`
  - In the spec, add "Changes during implementation":
    - Share sits next to Open in Builder, not in a `PageHeader`
    - the copy fallback uses a native `<input>`, not an `Input` primitive
    - API error text is mapped in the client by `rackMessage`
- [ ] **Step 4: Check the wording.** Run `grep -rnE "(['\">]|^\s*)[^'\"<>]*\b(Publish|Published|Unpublish|Completed [Bb]uilds)\b" src --include='*.tsx' | grep -vE "import|Publish(Controls|Dialog|Form|edList|edBuild|Input|edRef|edSummary|edPart|edRod)|publishedKeys|CopyPublished"`. Expected: no user-visible string. Look over any hits by hand.
- [ ] **Step 5: Run the full checks.** Run `pnpm test && npm run build && npm run lint && pnpm check:contrast && (cd api && uv run pytest -q)`. Expected: all pass.
- [ ] **Step 6: Run the manual browser script.** This is the spec's "Manual browser script", steps 1–7. Run the API and `pnpm dev`. Step 5 needs a phone, or Chrome device mode with touch emulation.
- [ ] **Step 7: Commit and open PR 2.** Commit with the message `Add link preview defaults and Rack docs`. Open PR 2 → `oa-rack-1-api`. Check `git diff --stat oa-rack-1-api` is under 500 lines, excluding `public/og.png`. If it isn't, move Tasks 6–7 into a third PR, `oa-rack-3-share`.
