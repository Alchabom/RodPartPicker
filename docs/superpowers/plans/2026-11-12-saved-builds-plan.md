# Saved Builds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Builds belong to users. Signed-in users save, autosave, rename, list and delete their own builds, and signed-out visitors keep a local draft they can save through sign-in.

**Architecture:** Migration 019 adds `builds.user_id`, and every `/api/builds` route is scoped to `CurrentUserId` through one ownership helper. On the frontend, TanStack Query becomes the single data layer (the catalog and compatibility fetches move to it first). The builder's context gets two route-layout providers: `LocalBuildProvider` (today's `localStorage` draft) and `SavedBuildProvider` (load once, then debounced, ordered autosave).

**Tech Stack:** FastAPI, SQLAlchemy 2, MySQL 8, pytest; React 19, TypeScript, react-router, `@tanstack/react-query` v5, shadcn.

**Spec:** `docs/superpowers/specs/2026-11-12-saved-builds-design.md`

**Who writes what:** Claude writes every task. Omar reviews each PR and makes any architecture calls that come up.

**After every API task:** from `api/`, run `uv run ruff check . && uv run ruff format --check . && uv run pytest`. All pass.
**After every web task:** from the repo root, run `npm run build && npm run lint`. Both pass. Then run the task's manual checks in the browser (`npm run dev` plus `cd api && uv run fastapi dev app/main.py --port 3001`, with `EMAIL_BACKEND=console` so login codes print in the API terminal). Record the results for the PR description.

**Branches:** a linear stack, one branch per PR. The stack starts at `oa-build-persistence`, which already holds the spec and this plan: `oa-build-persistence` (PR 1) → `oa-builds-query` (PR 2) → `oa-builds-saved` (PR 3) → `oa-builds-my-builds` (PR 4). Each PR stays under 500 lines, excluding pure deletions, `pnpm-lock.yaml` and generated shadcn files. Stage files by name.

**Deviations from the spec** (made while planning; the spec is updated to match in Task 1.1):
- The ownership tests make the other user with `make_user` instead of signing in a second client. A build owned by any other user proves the same thing.
- The two compatibility endpoints get separate keys: `['compatibility', 'check', query]` and `['compatibility', 'parts', query]`. `BrandPartsPage`'s compatible-parts fetch also moves to Query (Task 2.2), so "one fetching pattern" holds.

## Global Constraints

- Another user's build and a missing build both return 404 with `"Build not found"`.
- `user_id` comes from `CurrentUserId`, never from a request body.
- List order: `updated_at DESC, id DESC`.
- Migration `019_build_owners.sql`: `DELETE FROM builds`, then `user_id INT UNSIGNED NOT NULL AFTER id`, `fk_builds_user` → `users(id) ON DELETE CASCADE`, `idx_builds_user_updated (user_id, updated_at)`.
- Never edit an applied migration.
- Query keys: `['catalog']`; `['compatibility', 'check', query]`; `['compatibility', 'parts', query]`; `buildKeys.all = ['builds']`, `buildKeys.list() = ['builds', 'list']`, `buildKeys.detail(id) = ['builds', id]`.
- Queries don't retry 4xx `ApiError`s; other errors get up to 3 retries.
- Autosave debounce: 600 ms. Mutation scope id: `` `build-${id}` ``.
- Name: trimmed, 1–120 characters. New builds are named `"Untitled build"`.
- Draft storage key stays `rpp:build:v2`.
- Routes: `/builder` (draft), `/builder/:component/:brand`, `/builder/saved`, `/builder/:buildId`, `/builder/:buildId/:component/:brand`. A valid `:buildId` matches `/^[1-9]\d*$/`.
- Sign-in round trip for a draft: `/login?next=%2Fbuilder%3Fsave%3D1`.
- Copy, exactly: `"Save build"`, `"Saving…"`, `"Saved"`, `"Couldn't save"`, `"Retry"`, `"Loading build…"`, `"Build not found"`, `"My Builds"`, `"No saved builds yet"`, `"Start a build"`, `"New build"`, `"Delete"`.
- No hand-written `useMemo`, `useCallback` or `React.memo` (React Compiler).
- Features don't import from each other. `UserMenu` links to `/builder/saved` by path string.

## Review Focus

The spec implies these five conditions, but its test lists don't cover them. Each gets a manual check in the task that owns the code.

1. **Picking a part on a brand page while a save is pending.** The brand page navigates back within 600 ms. The provider must stay mounted (it's the layout route), keep the edit and save it, never reloading from the server. → Task 3.3, check "brand-page round trip".
2. **Going from one saved build straight to another.** A pending save for build 42 must go to build 42, not to the build being opened. → Task 3.3, check "switch builds".
3. **Back after saving a draft.** Pressing Back from `/builder/42` must not create a second build (`save=1` was removed with `replace`). → Task 3.5, check "back after save".
4. **A draft that holds a part removed from the catalog.** Saving it must succeed with that slot empty, not fail with a 400. → Task 3.1 (`toBuildIn` drops unknown ids) and Task 3.5, check "stale draft part".
5. **Malformed build URLs.** `/builder/0`, `/builder/abc` and `/builder/42abc` show "Build not found" and send no request. → Task 3.3, check "malformed ids".

---

# PR 1: API build ownership (`oa-build-persistence`)

### Task 1.1: Migration, model column and docs

**Files:**
- Create: `api/migrations/019_build_owners.sql`
- Modify: `api/app/builds/models.py`, `api/tests/conftest.py` (`make_build`), `docs/database/schema-design.md` (D4 row, ER diagram), `docs/superpowers/specs/2026-11-12-saved-builds-design.md` (the two deviations above)
- Test: `api/tests/test_models.py`

**Interfaces:**
- Produces: `Build.user_id: Mapped[int]` (FK `users.id`). `make_build(**columns)` creates an owner with `make_user()` when neither `user_id` nor `user` is given.

- [ ] **Step 1: Write the failing tests** in `test_models.py`:

```python
def test_build_requires_an_owner(db):
    with pytest.raises(DBAPIError):
        db.execute(text("INSERT INTO builds (name) VALUES ('Orphan')"))

def test_deleting_a_user_deletes_their_builds(db, make_user, make_build):
    user = make_user()
    build = make_build(user_id=user.id)
    db.execute(delete(User).where(User.id == user.id))
    assert db.execute(select(Build.id).where(Build.id == build.id)).first() is None
```

- [ ] **Step 2: Run them.** `uv run pytest tests/test_models.py -k "owner or deleting_a_user" -v`. Expected: the first FAILS (no exception), the second FAILS on the `user_id` keyword.
- [ ] **Step 3: Write `019_build_owners.sql`** exactly as the Global Constraints describe, with a header comment saying why the rows are deleted. Add `user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))` to `Build`. In `make_build`, take `make_user` and default `columns["user_id"] = make_user().id` when neither `user_id` nor `user` is in `columns`.
- [ ] **Step 4: Run the full suite.** `uv run pytest`. Expected: everything passes. The routes don't check owners until Task 1.2, and `make_build`'s default owner keeps existing tests working. Apply to dev: `uv run python -m app.migrate`.
- [ ] **Step 5: Update the docs.** D4: "`builds.user_id` arrived in migration 019; see the saved-builds spec." ER diagram: add `users ||--o{ builds : owns`. Spec: the two deviations.
- [ ] **Step 6: Commit.** `feat(db): give every build an owner`

### Task 1.2: Owner-scoped build routes

**Files:**
- Modify: `api/app/builds/router.py`, `api/tests/conftest.py` (new `signed_in` fixture), `api/tests/test_builds.py`

**Interfaces:**
- Consumes: `CurrentUserId` from `app.auth.deps`; the `login` and `fake_email` fixtures.
- Produces: `_get_owned_build(db: Session, build_id: int, user_id: int) -> Build`, which raises `HTTPException(404, "Build not found")`. Fixture `signed_in(client, fake_email, login) -> dict`: the signed-in `UserOut` JSON, with `client` now carrying the cookies.

- [ ] **Step 1: Add the `signed_in` fixture, and move every existing `test_builds.py` test onto it.** Each test takes `signed_in`. Every `make_build(...)` that the caller should own passes `user_id=signed_in["id"]`.
- [ ] **Step 2: Write the failing tests:**

```python
@pytest.mark.parametrize("method, path", [
    ("get", "/api/builds"), ("post", "/api/builds"), ("get", "/api/builds/1"),
    ("put", "/api/builds/1"), ("delete", "/api/builds/1"),
])
def test_builds_require_sign_in(client, method, path):
    kwargs = {"json": {"name": "x"}} if method in ("post", "put") else {}
    assert getattr(client, method)(path, **kwargs).status_code == 401

def test_create_build_owned_by_caller(client, signed_in, db, make_user):
    other = make_user()
    response = client.post("/api/builds", json={"name": "Mine", "userId": other.id})
    assert response.status_code == 201
    assert "userId" not in response.json()
    assert db.get(Build, response.json()["id"]).user_id == signed_in["id"]

def test_list_only_my_builds_newest_first(client, signed_in, make_build, make_user):
    old = make_build(user_id=signed_in["id"], updated_at=datetime(2026, 1, 1))
    new = make_build(user_id=signed_in["id"], updated_at=datetime(2026, 2, 1))
    tie = make_build(user_id=signed_in["id"], updated_at=datetime(2026, 2, 1))
    make_build(user_id=make_user().id)
    ids = [b["id"] for b in client.get("/api/builds").json()]
    assert ids == [tie.id, new.id, old.id]

@pytest.mark.parametrize("method", ["get", "put", "delete"])
def test_other_users_build_is_not_found(client, signed_in, db, make_build, make_user, method):
    theirs = make_build(user_id=make_user().id, name="Theirs")
    db.commit()  # factories only flush; commit so the rollback below drops only the route's changes
    kwargs = {"json": {"name": "Stolen"}} if method == "put" else {}
    response = getattr(client, method)(f"/api/builds/{theirs.id}", **kwargs)
    assert response.status_code == 404
    assert response.json()["detail"] == "Build not found"
    db.rollback()
    assert db.get(Build, theirs.id).name == "Theirs"
```

- [ ] **Step 3: Run them.** `uv run pytest tests/test_builds.py -v`. Expected: the new tests FAIL (200s instead of 401/404, mixed owners in the list).
- [ ] **Step 4: Implement.** Every route takes `user_id: CurrentUserId`. `list_builds` filters by `Build.user_id == user_id` and orders `updated_at.desc(), id.desc()`. `create_build` sets `user_id=user_id`. `get`, `update` and `delete` look up through `_get_owned_build`, which treats `None` and a different owner the same way.
- [ ] **Step 5: Run the API checks.** All pass.
- [ ] **Step 6: Commit.** `feat(api): scope builds to their owner`

---

# PR 2: Adopt TanStack Query (`oa-builds-query`)

### Task 2.1: Query client and the catalog query

**Files:**
- Create: `src/lib/queryClient.ts`
- Modify: `package.json`, `pnpm-lock.yaml`, `src/main.tsx`, `src/features/builder/api/parts.ts`, `src/features/builder/components/BuilderLayout.tsx`

**Interfaces:**
- Produces: `export const queryClient: QueryClient` (`src/lib/queryClient.ts`); `export const catalogKey = ['catalog'] as const` (`api/parts.ts`). `QueryClientProvider` sits outermost in `main.tsx`, around `AuthProvider`.

- [ ] **Step 1: Install.** `pnpm add @tanstack/react-query`. Confirm the installed major is 5. On a newer major, check that `isPending` and mutation `scope` still exist before continuing.
- [ ] **Step 2: Write `queryClient.ts`.** The one default is `queries.retry: (failureCount, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 3`.
- [ ] **Step 3: Wrap the app.** In `main.tsx`: `QueryClientProvider` > `AuthProvider` > `BuildProvider` (still there until Task 3.2) > `AppRoutes`.
- [ ] **Step 4: Migrate `BuilderLayout`** to `useQuery({ queryKey: catalogKey, queryFn: ({ signal }) => fetchCatalog(signal), staleTime: Infinity })`. Keep both screens' markup and copy. The error message comes from `error.message`, and **Try again** calls `refetch()`. Delete the `CatalogState` type, `attempt` and the effect.
- [ ] **Step 5: Check.** Build and lint pass. Manual: spec step 10 (stop the API, load `/builder`, restart it, click **Try again**). Also open `/builder`, go home, come back: the Network tab shows no second set of `/api/parts/*` calls.
- [ ] **Step 6: Commit.** `feat(web): load the parts catalog with TanStack Query`

### Task 2.2: Compatibility queries

**Files:**
- Modify: `src/features/builder/api/compatibility.ts`, `src/features/builder/components/BuilderPage.tsx`, `src/features/builder/components/BrandPartsPage.tsx`

**Interfaces:**
- Produces: `compatibilityKeys = { check: (query: string) => ['compatibility', 'check', query], parts: (query: string) => ['compatibility', 'parts', query] }` in `api/compatibility.ts`.

- [ ] **Step 1: `BuilderPage`:** replace the `result` state and its effect with `useQuery({ queryKey: compatibilityKeys.check(query), queryFn: ({ signal }) => checkBuild(query, signal), enabled: hasPairToCheck })`. Then `warnings = hasPairToCheck ? (data ?? []) : []`. Log errors with `console.error('Could not check the build', error)` from an effect on `error`, keeping the old message. No `placeholderData`.
- [ ] **Step 2: `BrandPartsPage`:** the same change for `fetchCompatibleParts`, with `compatibilityKeys.parts(query)`, `enabled: showsCompatibility` and the log message `'Could not load compatible parts'`. Delete the comments about storing the query with the response, which no longer apply.
- [ ] **Step 3: Check.** Build and lint pass. Manual: pick a rod and a mismatched reel, and the warning appears. Swap to a matching reel, and it disappears, with no flash of the old warning. On the line brand page, highlights and "Recommended" badges still match the build.
- [ ] **Step 4: Commit.** `refactor(web): fetch compatibility with TanStack Query`

---

# PR 3: Saved builds in the builder (`oa-builds-saved`)

### Task 3.1: Builds API module

**Files:**
- Create: `src/features/builder/api/builds.ts`

**Interfaces:**
- Consumes: `apiFetch`; `Build`, `Catalog`, `ComponentType` from `../types`.
- Produces:
  - `interface SavedBuild { id: number; name: string; rodId: number | null; reelId: number | null; flyLineId: number | null; leaderId: number | null; tippetId: number | null; createdAt: string; updatedAt: string }`
  - `type BuildInput = Pick<SavedBuild, 'name' | 'rodId' | 'reelId' | 'flyLineId' | 'leaderId' | 'tippetId'>`
  - `buildKeys` (values in Global Constraints)
  - `listBuilds(signal?: AbortSignal): Promise<SavedBuild[]>`, `getBuild(id: number, signal?: AbortSignal): Promise<SavedBuild>`, `createBuild(input: BuildInput): Promise<SavedBuild>`, `updateBuild(id: number, input: BuildInput): Promise<void>`, `deleteBuild(id: number): Promise<void>`
  - `toBuild(saved: SavedBuild): Build` and `toBuildIn(build: Build, name: string, getPart: Catalog['getPart']): BuildInput`

- [ ] **Step 1: Write the module.** One `ID_FIELDS: Record<ComponentType, keyof BuildInput>` map (`rod → rodId`, `reel → reelId`, `line → flyLineId`, `leader → leaderId`, `tippet → tippetId`) drives both converters. `toBuild` produces `` `${component}-${id}` `` for each non-null id. `toBuildIn` trims `name`, sends `getPart(build[c])?.dbId ?? null` for every component (so an id missing from the catalog becomes `null`), and always sends all five fields, because `PUT` replaces the whole build.
- [ ] **Step 2: Check.** Build and lint pass. Nothing calls the module yet.
- [ ] **Step 3: Commit.** `feat(web): add the builds API client`

### Task 3.2: Context union, `LocalBuildProvider` and `basePath` links

**Files:**
- Rename: `src/features/builder/hooks/BuildProvider.tsx` → `LocalBuildProvider.tsx` (`git mv`)
- Modify: `hooks/buildContext.ts`, `components/ComponentRow.tsx`, `components/BrandMenu.tsx`, `components/BrandPartsPage.tsx`, `index.ts`, `src/main.tsx`, `src/routes/AppRoutes.tsx`

**Interfaces:**
- Produces: `BuildContextValue` exactly as the spec's "Context" block defines it. `LocalBuildProvider()` is a route layout: no props, it renders `<BuildContext value={…}><Outlet /></BuildContext>` with `kind: 'draft'` and `basePath: '/builder'`. The barrel exports `LocalBuildProvider` instead of `BuildProvider`.

- [ ] **Step 1: Change the context type**, then rename and adapt the provider. Its storage code doesn't change.
- [ ] **Step 2: Use `basePath`** for every builder link: `ComponentRow` (`${basePath}/${type}/all`), `BrandMenu` (`${basePath}/${type}/…`), and `BrandPartsPage` (the back link, `NotFound` `backTo`, and `navigate(basePath)` after **Add**).
- [ ] **Step 3: Routes.** Remove `BuildProvider` from `main.tsx`. Under `builder`, add a pathless `<Route element={<LocalBuildProvider />}>` holding the index and `:component/:brand` routes.
- [ ] **Step 4: Check.** Build and lint pass. Manual: spec step 1, and the whole draft flow (choose, change, remove, clear) works as before.
- [ ] **Step 5: Commit.** `refactor(web): make the draft provider a route layout`

### Task 3.3: `SavedBuildProvider` with autosave

**Files:**
- Create: `src/features/builder/hooks/SavedBuildProvider.tsx`
- Modify: `index.ts`, `src/routes/AppRoutes.tsx`, `src/hooks/auth/AuthProvider.tsx`

**Interfaces:**
- Consumes: Task 3.1's functions and keys; `useCatalog().getPart`.
- Produces: `SavedBuildProvider()`, a route layout that reads `:buildId` and provides `kind: 'saved'` with `basePath: '/builder/${id}'`. Route: `<Route path=":buildId" element={<RequireAuth><SavedBuildProvider /></RequireAuth>}>` with index `BuilderPage` and `:component/:brand` `BrandPartsPage`.

- [ ] **Step 1: Outer component.** If `buildId` fails `/^[1-9]\d*$/`, render `NotFound` with `message="Build not found"`, `backTo="/builder/saved"` and `backLabel="My Builds"`, before any query. Otherwise run `useQuery({ queryKey: buildKeys.detail(id), queryFn: ({ signal }) => getBuild(id, signal) })`: pending shows `"Loading build…"` in the same style as the catalog's loading line; a 404 `ApiError` shows the same `NotFound`; any other error shows its message with **Try again** (`refetch()`). On success, render `<SavedBuildEditor key={id} saved={data} />`.
- [ ] **Step 2: `SavedBuildEditor`.** Seed `build` (`toBuild(saved)`) and `name` from `saved` once, in `useState` initializers. Autosave works as follows:

```
lastSent   = ref(JSON of toBuildIn(seed))          // what the server already has
timer      = ref(null)
input      = toBuildIn(build, name, getPart)
mutation   = useMutation({ mutationFn: (i) => updateBuild(saved.id, i),
                           scope: { id: `build-${saved.id}` },
                           onSuccess: (_, i) => { setQueryData(detail(saved.id), old => old && { ...old, ...i })
                                                  invalidateQueries({ queryKey: buildKeys.list() }) } })
send()     = clear timer; lastSent = JSON(input); mutation.mutate(input)
effect on [input JSON]: if name invalid or JSON(input) === lastSent → no-op
                        else restart a 600 ms timer → send()
unmount cleanup: if timer pending → send()          // flush; uses this editor's saved.id
saveStatus = timer pending || mutation.isPending ? 'saving' : mutation.isError ? 'error' : 'saved'
retrySave  = send()
beforeunload listener while saveStatus === 'saving'
```

  A name is invalid when its trimmed length is outside 1–120. Comparing against `lastSent` (instead of skipping the first run) means StrictMode's double effect and a no-op edit never send anything.
- [ ] **Step 3: Clear the cache on sign-out.** In `AuthProvider`, call `useQueryClient().removeQueries({ queryKey: ['builds'] })` in `signOut` (after the local sign-out) and in the `onSessionExpired` listener. Use the literal `['builds']` here, not `buildKeys`, because shared hooks can't import from a feature.
- [ ] **Step 4: Check.** Build and lint pass. Until Task 3.5 there's no UI to create a build, so make one with `curl` or the API docs page while signed in, then:
  - Spec steps 4, 6 and 7.
  - **Brand-page round trip:** on `/builder/42`, choose a reel. The brand page sends you back at once, and the Network tab shows one `PUT` about 600 ms later and no `GET /api/builds/42`.
  - **Switch builds:** change a part on build 42, then within 600 ms edit the URL to `/builder/43`. The flushed `PUT` goes to `/api/builds/42`.
  - **Malformed ids:** `/builder/0`, `/builder/abc` and `/builder/42abc` show "Build not found" with no request to `/api/builds`.
  - **Sign-out:** sign out on `/builder/42` and you're sent to login. Sign in as a second account: `/builder/42` shows "Build not found" immediately, never the first account's build from cache.
- [ ] **Step 5: Commit.** `feat(web): edit saved builds with autosave`

### Task 3.4: Build header: name, rename and save status

**Files:**
- Create: `src/features/builder/components/BuildHeader.tsx`
- Modify: `src/features/builder/components/BuilderPage.tsx`

**Interfaces:**
- Consumes: `useBuild()` (the union from Task 3.2).
- Produces: `BuildHeader()`, which replaces `BuilderPage`'s `<h1>` row. In draft mode it shows the `"Your Build"` heading, a slot for Task 3.5's button, and **Clear build**. In saved mode it shows an inline name input, the save status and **Clear build**.

- [ ] **Step 1: Saved mode.** A text input styled like the old `h1`, with `aria-label="Build name"` and `maxLength={120}`, bound to `name` and `rename`. When the trimmed name is empty, show the inline error `"Give your build a name"` with `aria-invalid`. Status text: `"Saving…"`, `"Saved"`, or `"Couldn't save"` followed by a **Retry** button (`retrySave`). Wrap it in `aria-live="polite"`.
- [ ] **Step 2: Check.** Build and lint pass. Manual: spec step 5, and stop the API then restart it to watch all three statuses.
- [ ] **Step 3: Commit.** `feat(web): rename saved builds and show save status`

### Task 3.5: Save a draft, with the sign-in round trip, and the explainer doc

**Files:**
- Create: `src/features/builder/components/SaveDraftButton.tsx`, `docs/builds/saved-builds.md`
- Modify: `src/features/builder/components/BuildHeader.tsx`, `docs/database/schema-design.md` (link the explainer)

**Interfaces:**
- Consumes: `createBuild`, `toBuildIn`, `buildKeys`; `useAuth()`; `useCatalog().getPart`; `useBuild()` (draft mode: `build`, `clearBuild`).
- Produces: `SaveDraftButton()`, rendered by `BuildHeader` in draft mode only.

- [ ] **Step 1: The button.** It's disabled while the draft is empty or `status === 'loading'`. When `authenticated`, it runs a `useMutation` of `createBuild(toBuildIn(build, 'Untitled build', getPart))`. On success: `clearBuild()`, invalidate `buildKeys.list()`, `navigate('/builder/${id}')`. While pending, it reads `"Saving…"`. On error, show the inline `"Couldn't save your build, try again"`. When `anonymous`, it navigates to `/login?next=%2Fbuilder%3Fsave%3D1`.
- [ ] **Step 2: The `save=1` intent.** An effect watches `searchParams.get('save') === '1'` and `status`. While `loading`, wait. When `anonymous`, or the draft is empty, remove `save` (`setSearchParams` with `replace: true`). When `authenticated` and `started.current` is false, set `started.current = true`, remove `save` with `replace`, then run the same mutation.
- [ ] **Step 3: Write `docs/builds/saved-builds.md`** in the style of `docs/auth/sessions.md`. Cover:
  - The ownership rules (404 for others' builds, owner from the cookie).
  - The two providers and the route table.
  - The spec's two sequence diagrams, each followed by "where this lives" bullets naming the files and functions.
  - Why local state is seeded once.
  - The known session-expiry limitation.

  Link it from D4 in `schema-design.md`.
- [ ] **Step 4: Check.** Build and lint pass. Manual:
  - Spec steps 2 and 3.
  - **Back after save:** after step 2, press Back. You're on `/builder` with an empty draft, and My Builds (or `GET /api/builds`) shows exactly one new build.
  - **Stale draft part:** with the app closed, put an id that's no longer in the catalog into `localStorage` `rpp:build:v2`, for example `{"rod":"rod-999999","reel":"<a real reel id>"}`. The draft shows only the reel. **Save build** succeeds, and the build has the reel and no rod.
- [ ] **Step 5: Commit.** `feat(web): save a draft to your account`

---

# PR 4: My Builds page (`oa-builds-my-builds`)

### Task 4.1: The list page and its entry points

**Files:**
- Create: `src/features/builder/components/MyBuildsPage.tsx`
- Modify: `index.ts`, `src/routes/AppRoutes.tsx`, `src/features/auth/components/UserMenu.tsx`

**Interfaces:**
- Consumes: `listBuilds`, `toBuild`, `buildKeys`; `useCatalog()`; `formatPrice`; `COMPONENTS`.
- Produces: `MyBuildsPage()`, routed as `<Route path="saved" element={<RequireAuth><MyBuildsPage /></RequireAuth>} />` under `builder`, outside both build providers.

- [ ] **Step 1: Write the page.** Heading `"My Builds"`, with a **New build** button linking to `/builder`. The `useQuery` has `queryKey: buildKeys.list()` and loading and error states like `SavedBuildProvider`'s. Each row comes from `toBuild(saved)`:
  - **Name** links to `/builder/${id}`.
  - **Parts** shows `"${n} / 5"`, counting parts that resolve in the catalog.
  - **Total** is the sum of resolved prices through `formatPrice`.
  - **Last edited** is `new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })`, applied to `updatedAt` read as UTC: append `Z` if it has no offset, because the API's naive timestamps are UTC.

  The empty state is `"No saved builds yet"` with a **Start a build** link.
- [ ] **Step 2: Menu item.** In `UserMenu`, add `<DropdownMenuItem asChild><Link to="/builder/saved">My Builds</Link></DropdownMenuItem>` above **Log out**.
- [ ] **Step 3: Check.** Build and lint pass. Manual: spec step 8. Signed out, `/builder/saved` goes to login and comes back. Renaming a build, then opening My Builds, shows the new name at the top.
- [ ] **Step 4: Commit.** `feat(web): list your saved builds`

### Task 4.2: Delete, and the CLAUDE.md update

**Files:**
- Create: `src/components/ui/alert-dialog.tsx` (via `pnpm dlx shadcn@latest add alert-dialog`)
- Modify: `src/features/builder/components/MyBuildsPage.tsx`, `CLAUDE.md`

**Interfaces:**
- Consumes: `deleteBuild`, `buildKeys`.

- [ ] **Step 1: Delete.** Each row has a **Delete** button that opens an `AlertDialog`: the title `Delete "${name}"?`, the description `"This can't be undone."`, and **Cancel** / **Delete** actions. Confirming runs a `useMutation`: on success, `invalidateQueries({ queryKey: buildKeys.list() })` and `removeQueries({ queryKey: buildKeys.detail(id) })`. While pending, the confirm button is disabled. On error, the dialog stays open and shows `"Couldn't delete, try again"`.
- [ ] **Step 2: Update `CLAUDE.md`.**
  - Builder persistence: a local draft (`LocalBuildProvider`) plus saved builds (`SavedBuildProvider`, with autosave).
  - TanStack Query is the data layer, with the client in `src/lib/queryClient.ts` and keys kept next to their fetchers.
  - The builds API is owner-scoped.
  - Link `docs/builds/saved-builds.md`.
- [ ] **Step 3: Check.** Build and lint pass. Manual: spec step 9. **Cancel** leaves the build in place. Deleting the last build shows the empty state.
- [ ] **Step 4: Commit.** `feat(web): delete saved builds`
