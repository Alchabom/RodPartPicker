# Community Rack Design

**Date:** 2026-11-19
**Follows:** `docs/superpowers/specs/2026-11-18-published-builds-design.md` (the public catalog this spec renames and extends)
**Updates:** `docs/builds/published-builds.md`, `docs/builds/saved-builds.md`, `CLAUDE.md`
**Followed by:** two separate specs that attach to `published_builds.id`, in this order: upvotes (spec 2), then comments (spec 3)

## Goal

Make it obvious to users that the public catalog is not the same as their saved builds, and make it clear where "Publish" sends a build. This is the first of three specs that make RodPartPicker more social. It sets the names that specs 2 and 3 build on, and it adds a **Share** button.

Today the main nav shows only **Builder** and **Completed builds**, and My Builds is hidden in the account dropdown. So the public catalog looks like the only list of builds, and **Publish** doesn't say where the build goes. This spec does four things:

1. It names the public catalog the **Community Rack** and renames its routes to match.
2. It puts **My builds** in the main nav, next to the Rack.
3. It replaces Publish wording with **Post to the Rack**.
4. It adds a Share button for builds on the Rack.

The team will present this work, so every choice in "Decisions" records its reason.

## Success criteria

- The main nav reads **Builder · My builds · Community Rack** on desktop and in the mobile sheet. **My builds** appears only when signed in, and only one item is highlighted on any page.
- The public catalog lives at `/rack` and `/rack/:id`, and My builds at `/my-builds`. The old paths `/builds`, `/builds/:id` and `/builder/saved` redirect with `replace`, and `/builds` keeps its query string.
- No user-facing text says "Publish", "Published", "Unpublish" or "Completed builds".
- `/rack` and `/my-builds` each have a one-line description that says who can see what.
- My builds shows, for each saved build, whether it is on the Rack. A posted build links to its Rack page and has a Share button.
- **Share** opens the native share sheet on touch devices that support it, and copies an absolute `/rack/:id` link everywhere else. If copying fails, it shows the link for the user to copy by hand.
- A shared link to any page shows a site-wide preview: the default `og:` title, description and image.
- `GET /api/builds` returns `publishedId` for each build, and the pytest cases in "Testing" pass.
- `uv run pytest`, `npm run build`, `npm run lint` and `pnpm test` pass.
- Each PR is under 500 lines, excluding pure deletions and generated files.

## Out of scope

- **Upvotes** (spec 2) and **comments** (spec 3).
- **A "You posted this · Edit in Builder" line on `/rack/:id`.** It needs `sourceBuildId`, which public responses must not expose, so it would need a new owner check. It is deferred.
- **Per-build link previews.** They need per-route `og:` tags in server-rendered HTML. A Vite SPA serves the same `index.html` for every route, so these would come from a Vercel function after the Dec 7 deploy.
- **Share on Rack cards.** `BuildCard` is one big `<Link>`, and spec 2 must restructure it to add a vote button. Share can go on the card in that same pass.
- **Sharing builds that aren't on the Rack** (for example, a link that carries the part ids in the URL). To share a build, you post it to the Rack first.
- **Renaming code identifiers.** The table `published_builds`, the API routes `/api/published` and `/api/builds/{id}/published`, and the frontend names `PublishControls`, `PublishDialog`, `publishedKeys` and `features/catalog` all stay as they are.

## Decisions

- **The name is "Community Rack".** "Community" says these are other anglers' builds, and "rack" fits the riverside-shop look from the UI redesign (rods on a shop rack). The short form "the Rack" is fine once the full name has been seen on the page.
- **The verb is "Post to the Rack".** It names where the build goes, which "Publish" didn't, and it reads like a forum post, which suits spec 3's comments. "Share to Community Rack" was rejected because "share" would be confused with the new Share (copy link) button.
- **Routes are renamed along with the labels.** Share is about to start handing out links, so the copied URL becomes permanent. `/rack/12` tells a friend where the link goes, while `/builds/12` sounds like it could be a private build. Renaming before any link is shared costs only redirects and test updates. Moving My builds out from under `/builder/` also stops the **Builder** `NavLink` from highlighting on My builds.
- **A single "Builds" page with Mine / Community tabs was rejected.** It would put private and public builds back on the same page, which is the confusion this spec removes.
- **Code keeps the "published" names.** This is a change to what users see, not to the API. Renaming the table, routes and modules would add churn to specs 2 and 3 for no gain to users. The docs record that "published" in code means "on the Rack" in the UI.
- **Only builds on the Rack can be shared.** Saved builds are owner-scoped, so the API returns 404 to anyone else. A parts-in-URL link would be a second kind of link to explain, and would need its own builder intent handler. Asking people to post before sharing gives one canonical link and puts more builds on the Rack.
- **My builds appears in the nav only when signed in.** Signed out, there's nothing on the page, and the link would just bounce to login.
- **Rack status comes from the list response, not one request per row.** `GET /api/builds` adds `publishedId` from one LEFT JOIN. `published_builds.source_build_id` is `UNIQUE`, so the join adds at most one row per build.
- **Share uses the native share sheet only on touch devices.** Safari and Chrome on macOS both support `navigator.share`, but at a desk people expect a copied link. The check is `navigator.share` exists, `navigator.canShare({ url })` is true, and `matchMedia('(pointer: coarse)')` matches.

## Words

| Thing | Text the user sees |
|---|---|
| The public catalog | **Community Rack** (short form: "the Rack") |
| The user's saved builds | **My builds** |
| Publish button | **Post to the Rack** |
| Update button | **Update on the Rack** |
| Unpublish button | **Take off the Rack** |
| Status after posting | "Posted to the Rack" |
| Status after updating | "Updated on the Rack" |
| Link when posted | "On the Community Rack · View" |
| My builds marker, posted | "On the Rack" |
| My builds marker, not posted | "Private" |

## Routes and navigation

### Routes (`src/routes/AppRoutes.tsx`)

| Path | Element | Notes |
|---|---|---|
| `/rack` | `PublishedListPage` | |
| `/rack/:id` | `PublishedBuildPage` | |
| `/my-builds` | `RequireAuth` → `MyBuildsPage` | Inside a pathless `<Route element={<BuilderLayout />}>`, because `MyBuildsPage` reads part prices through `useCatalog()` |
| `/builds` | redirect → `/rack` | Keeps `location.search` |
| `/builds/:id` | redirect → `/rack/:id` | |
| `/builder/saved` | redirect → `/my-builds` | Must stay a route under `builder`, so `:buildId` doesn't match `saved` |

Every redirect is a small `<Navigate replace>` element in `src/routes/`, so Back doesn't bounce to the old path. `/builds/:id` needs a component that reads the param.

Every internal link moves to the new paths: `BuildCard`, `RecentBuilds`, `HomePage`, `PublishControls`, `SavedBuildProvider`'s not-found back link, and anything else a grep for `/builds` or `/builder/saved` finds. **Open in Builder** still links to `/builder?copy=<id>`.

### Nav (`src/components/shop/navItems.ts`, `SiteHeader.tsx`)

- `NAV_ITEMS` becomes Builder (`/builder`), My builds (`/my-builds`, signed in only) and Community Rack (`/rack`). A `requiresAuth: true` flag marks My builds.
- `SiteHeader` stays in `components/shop` and must not import `@hooks/auth` (the layer rule). Instead it takes a `signedIn: boolean` prop and filters the items with it. `Layout` in `src/routes/AppRoutes.tsx`, which already passes `account={<UserMenu />}`, passes `signedIn={status === 'authenticated'}` from `useAuth()`. While `status` is `'loading'`, `signedIn` is `false`, so the item appears once the session loads rather than flashing.
- The **My Builds** item is removed from `UserMenu`.

### Page headers

Both pages use `PageHeader`:

- **`/rack`:** title **Community Rack**, description "Builds posted by anglers on RodPartPicker. Copy any one into your Builder." It stays a card grid with photos and authors.
- **`/my-builds`:** title **My builds**, description "Only you can see these. Post one to the Rack to share it." **New build** moves into `actions`. It stays a table, with no photos or authors.

These are different layouts on purpose. You can tell the two pages apart without reading the title.

### Home page

"See completed builds" and "See all completed builds" become "See the Community Rack" and "See all of the Community Rack". The links point to `/rack`, and the section's copy follows the Words table.

## Posting to the Rack (`src/features/builder/`)

### `PublishControls`

The behavior is unchanged; the text changes.

- **Not posted:** **Post to the Rack**. Until all five parts are picked it is disabled, with the hint "Add all five parts to post".
- **Posted:**
  - an "On the Community Rack · View" link to `/rack/:id`
  - `ShareButton`
  - **Update on the Rack**
  - **Take off the Rack**
- **Status line:** "Posted to the Rack" or "Updated on the Rack", in the existing `role="status"` element.
- **Error state:** "Couldn't load Rack status" with **Try again**.
- **Cache:** after a post, update or take-down, the controls invalidate `buildKeys.list()` as well as the keys they already invalidate, so My builds' Rack column stays in sync.

### `PublishDialog`

| Mode | Title | Description | Submit |
|---|---|---|---|
| First post | **Post to the Community Rack** | "Anyone can see this build on the Community Rack, including people who aren't signed in. It shows your display name, these parts, the title and write-up." | **Post to the Rack** |
| Update | **Update on the Rack** | "The Rack copy gets your current parts, title and write-up. Later edits stay private until you update again." | **Update on the Rack** |

The update description's second sentence explains the snapshot rule: the Rack copy changes only when the user updates it.

The dialog's error messages follow the Words table. For example, the 409 "Already published" from a race shows as "Already on the Rack".

### Take off the Rack confirmation

- Title: `Take "{title}" off the Rack?`
- Description: "It comes off the Community Rack. Your saved build stays in My builds, and you can post it again later."
- Confirm button: **Take off the Rack**

Specs 2 and 3 will add a line about what happens to votes and comments.

## Rack status on My builds

### API (`api/app/builds/`)

- `schemas.py`: add `BuildListItem(BuildOut)` with `published_id: int | None` (`publishedId` on the wire).
- `router.py`: `list_builds` selects `Build` with `PublishedBuild.id`, using an outer join on `PublishedBuild.source_build_id == Build.id`. It keeps its owner filter and ordering, and returns `list[BuildListItem]`.
- `GET`, `POST` and `PUT /api/builds/{id}` are unchanged, because the builder reads Rack status from `/builds/{id}/published`.
- The response is owner-only and reports only the user's own builds, so the public-response rules in `published-builds.md` don't apply. The query is a SQLAlchemy expression, like every other query.

### Frontend (`MyBuildsPage`, `api/builds.ts`)

- `SavedBuild` gains an optional `publishedId?: number | null`. Only the list sets it, and `toBuild` ignores it.
- **A new Rack column** goes between Total and Last edited:
  - **Posted:** an "On the Rack" link to `/rack/:publishedId`, and a `ShareButton`.
  - **Not posted:** "Private", in muted text.

  `ShareButton` needs a title, and the list doesn't carry the Rack title. So the row uses the saved build's name, which is only the text passed to the share sheet.
- **Delete confirmation:**
  - **Not posted:** "This can't be undone."
  - **Posted:** "This build is on the Community Rack. Deleting it leaves the Rack copy up, and you won't be able to take it down. Take it off the Rack first." This is the first sentence, and the confirm button stays **Delete**.

## Share

### `ShareButton` (`src/components/shop/ShareButton.tsx`)

Both `features/catalog` and `features/builder` use it, so it is global and exported from `@components/shop`.

- **Props:** `{ path: string; title: string; size?: 'sm' | 'default' }`.
- **URL:** `new URL(path, window.location.origin).href`, so it is absolute on localhost and on Vercel.
- **Look:** the `secondary` button variant, a lucide `Share2` icon (`aria-hidden`) and the text "Share". It's a text button, not just an icon.

**Behavior, in order:**

1. **Native share sheet:** used when `navigator.share` exists, `navigator.canShare?.({ url })` is true, and `matchMedia('(pointer: coarse)').matches`. It calls `navigator.share({ title, url })`. An `AbortError` (the user closed the sheet) does nothing; any other error falls through to step 2.
2. **Copy:** `navigator.clipboard.writeText(url)`. On success, the label changes to "Link copied" for 2 seconds, and a `role="status"` region announces it. The timer is cleared on unmount.
3. **Fallback:** if `writeText` rejects or `navigator.clipboard` is missing, a `Popover` opens with a read-only `Input` holding the URL, selected on open, and the hint "Copy this link".

### Where it appears

| Place | `path` | `title` |
|---|---|---|
| `/rack/:id`, in `PageHeader` actions next to **Open in Builder** | `/rack/:id` | the build's title |
| `PublishControls`, when posted | `/rack/:publishedId` | the Rack title |
| My builds, for each posted row | `/rack/:publishedId` | the saved build's name |

### Link previews (`index.html`)

Site-wide defaults:

- `og:title`: "RodPartPicker"
- `og:description`: "Build a fly rod setup that fits, and share it on the Community Rack."
- `og:image`: a 1200×630 image in `public/` (the ridgeline hero with the wordmark)
- `og:type`: "website"
- `twitter:card`: "summary_large_image"

These are static, so every link shows the same preview. `og:url` is left out, because a static value would be wrong for every page except the home page.

## Error handling

| Case | Result |
|---|---|
| An old `/builds…` or `/builder/saved` link | Redirects to the new path with `replace` |
| `/rack/:id` for a build that isn't on the Rack | The existing `NotFound` |
| `/my-builds` signed out | The existing `RequireAuth` redirect to `/login` |
| The share sheet is closed | Nothing happens |
| The clipboard write fails | The popover with a selectable link |
| `GET /api/builds` fails | The existing My builds error and **Try again** |

## Testing

### API (`api/tests/`, pytest)

- `GET /api/builds`:
  - a posted build has `publishedId` equal to its `published_builds.id`
  - an unposted build has `null`
- Another user's posted build doesn't appear, and doesn't affect the user's own rows.
- After `DELETE /api/builds/{id}/published`, the list shows `null` for that build.
- If the saved build is deleted, its `published_builds` row stays (`source_build_id` becomes `NULL`), and the build disappears from the list.
- The list's order is unchanged by the join.

### Frontend (Vitest)

- **Redirects:**
  - `/builds?weight=5` → `/rack?weight=5`
  - `/builds/7` → `/rack/7`
  - `/builder/saved` → `/my-builds`
  - each with `replace`
- **Nav:**
  - signed out: Builder and Community Rack
  - signed in: also My builds
  - on `/my-builds`: only My builds has `aria-current="page"`
  - `UserMenu` no longer has a My Builds item
- **My builds:**
  - a posted row has "On the Rack" linking to `/rack/:id`, and a Share button
  - an unposted row has "Private"
  - the delete warning differs for posted and unposted builds
- **Wording:** the existing tests for `PublishControls`, `PublishDialog`, `PublishedListPage`, `PublishedBuildPage`, `HomePage`, `RecentBuilds`, `BuildCard`, `UserMenu` and `SiteHeader` change to the new text and paths. Their behavior doesn't change.
- **`ShareButton`:**
  - with `navigator.share` mocked and a coarse pointer: the sheet is called with `{ title, url }`
  - an `AbortError` shows nothing
  - on a fine pointer: copies, shows "Link copied", which clears after 2 seconds (fake timers)
  - when `writeText` rejects: the popover with the URL
  - the URL is absolute and ends in `/rack/:id`

### Manual browser script

1. Signed out, the nav shows Builder and Community Rack, and `/builder/saved` goes to login, then back to `/my-builds`.
2. Signed in, open My builds from the nav. Only My builds is highlighted.
3. Open a saved build with five parts. Post it, and check the dialog text, then "Posted to the Rack".
4. Return to My builds. The row says "On the Rack". Click Share on a laptop; the link is copied.
5. On a phone at 390px width, Share on `/rack/:id` opens the share sheet.
6. Visit an old `/builds/:id` link. It lands on `/rack/:id`, and Back doesn't return to the old path.
7. Take the build off the Rack. My builds shows "Private".

## Documentation

- **`docs/builds/published-builds.md`:**
  - the new routes and the Words table
  - a note that "published" in code means "on the Rack" in the UI
  - the redirects
  - `ShareButton`
- **`docs/builds/saved-builds.md`:**
  - `/my-builds`
  - `publishedId` on the list
  - the Rack column and the delete warning
- **`CLAUDE.md`:**
  - the UI sections (landing page, Builder, My builds, Community Rack)
  - `/rack` and `/my-builds` in place of `/builds` and `/builder/saved`

## PR breakdown

Two stacked PRs:

1. **`oa-rack-1-api` → main:**
   - `BuildListItem`
   - the join in `list_builds`
   - the pytest cases
2. **`oa-rack-2-web` → `oa-rack-1-api`:**
   - routes and redirects
   - nav and `UserMenu`
   - page headers and wording
   - My builds' Rack column
   - `ShareButton`
   - OG defaults
   - the docs above

   If this goes over 500 lines, split `ShareButton` and its placements into a third PR.

## Changes during implementation

- Share on `/rack/:id` sits next to **Open in Builder**, because the page has no `PageHeader`.
- The `ShareButton` copy fallback uses a native `<input>`, not an `Input` primitive.
- API error text is mapped in the client by `rackMessage`, not changed in the API.
- `ShareButton`'s `size='default'` maps to Button's `md`, because Button has no `default` size.
- `SiteFooter` also filters with `visibleNavItems`, because it renders the same nav items.
