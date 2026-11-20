# Published builds: the Community Rack

How a saved build becomes a public, read-only entry on the Community Rack, and how a visitor copies one back into the Builder. The server side is
`api/app/published/` (`models.py`, `schemas.py`, `router.py`); the browser side
is `src/features/catalog/` (the public pages) and
`src/features/builder/` (`components/PublishControls.tsx`,
`components/PublishDialog.tsx`, `components/CopyPublishedIntent.tsx` and
`api/publish.ts`). The design spec
(`docs/superpowers/specs/2026-11-18-published-builds-design.md`) records the
rules and the reasons; this page shows how they play out.

## Words

In code a published build is "published". In the UI it is "on the Rack", so
the code names (`published_builds`, `PublishControls`, `publishedKeys`) stay
and only the text the user sees changes.

| Thing | Text the user sees |
|---|---|
| The public catalog | Community Rack (short form: "the Rack") |
| The user's saved builds | My builds |
| Publish button | Post to the Rack |
| Update button | Update on the Rack |
| Unpublish button | Take off the Rack |
| Status after posting | "Posted to the Rack" |
| Status after updating | "Updated on the Rack" |
| Link when posted | "On the Community Rack · View" |
| My builds marker, posted | "On the Rack" |
| My builds marker, not posted | "Private" |

The API's error messages keep their old wording. The builder maps them to the
Rack wording in `src/features/builder/utils/rackMessage.ts`.

## A published build is a snapshot

`published_builds` (migration 020) holds its own copy of the five part ids, a
title and a write-up. It is not a view of the saved build.

- Saved builds autosave on every change. If the catalog read through them, a
  public build would change whenever its owner tinkered. **Update on the
  Rack** copies the current parts on purpose, and nothing else does.
- `source_build_id` links back to the saved build, but only so the owner can
  update or unpublish from the builder. It is `UNIQUE`, so a saved build has at
  most one published build. Deleting the saved build sets it to `NULL` and the
  published build stays public.
- Publishing needs all five parts (400 otherwise) and a display name (409).
- `published_at` is set once, at the first publish. An update leaves it alone,
  so an old build keeps its place in the newest-first list.
- No public response includes `userId`, `sourceBuildId` or an email.

## Routes

Schemas are camelCase on the wire.

| Route | Who | Behavior |
|---|---|---|
| `GET /api/published` | anyone | One page of builds, newest first (`published_at DESC, id DESC`), 20 per page. Query: `page` (>= 1), `weight` (1 to 15, the rod's line weight), `maxPrice` (>= 0, against the computed total). Anything else is a 422. Returns `{ items, page, pageSize, total }` |
| `GET /api/published/{id}` | anyone | The summary fields plus `writeup`, `updatedAt` and `parts` (`{ id, brand, name, price }` or `null` per slot). Unknown id: 404 |
| `GET /api/builds/{id}/published` | owner | `{ id, title, writeup, updatedAt }`, or 404 if the build isn't published |
| `PUT /api/builds/{id}/published` | owner | Body `{ title, writeup }`. Copies the saved build's parts. Creates (201) or updates (200) |
| `DELETE /api/builds/{id}/published` | owner | Unpublishes. 204, or 404 if it wasn't published |

- **Owner routes reuse the ownership check.** They call `get_owned_build` from
  `app/builds/ownership.py`, the same helper the builds router uses, so someone
  else's build is the same 404 as a missing one (see `saved-builds.md`).
- **The server copies the parts.** `PublishIn` has only `title` (3 to 80
  characters) and `writeup` (1 to 4,000), both trimmed. A client can't publish
  parts it hasn't saved, or publish for another user.
- **`total` and `totalPrice` come from SQL.** The five part tables are LEFT
  JOINed, and the total sums `COALESCE(price, 0)`, so a removed or unpriced part
  counts as 0. The `maxPrice` filter uses the same expression. A build whose rod
  was removed has no weight, so the `weight` filter leaves it out.
- **Two first publishes can race.** The second hits `uq_published_source` (MySQL
  error 1062); the route rolls back and returns 409 "Already published".

## Untrusted text

A title or write-up is written by one user and read by everyone.

- **SQL:** every query in `app/published/` is a SQLAlchemy expression, so values
  travel as bound parameters. No f-strings, `%` formatting, concatenation or
  `text()` build SQL from input. Query parameters are typed, so a bad value is a
  422 before any query runs.
- **Script:** the frontend renders text only as React text nodes, which escape
  `<`, `>` and `&`. `dangerouslySetInnerHTML` isn't used. Line breaks come from
  the CSS `whitespace-pre-line`, and nothing in a write-up becomes a link.
- The API stores and returns the text as written after trimming. Escaping is the
  renderer's job, and stripping would silently change what the user wrote.

## Flows

### Publish

1. The owner, on `/builder/42` with all five parts, clicks **Post to the Rack**
   (`PublishControls`). The button is disabled with "Add all five parts to
   post" until then.
2. `PublishDialog` asks for a title (pre-filled with the build's name) and a
   write-up, with a live counter.
3. On submit it runs `flushSave()` first. The server copies from the saved row,
   so an edit still in the autosave debounce would otherwise be left out. If
   that save fails, nothing is published.
4. `PUT /api/builds/42/published` returns 201. The dialog closes, the
   `['builds', 42, 'published']` and `['published']` queries are invalidated,
   and the controls show "Posted to the Rack" in a `role="status"` element, then
   "On the Community Rack · View", **Update on the Rack** and **Take off the Rack**.

### Update, and unpublish

**Update on the Rack** runs the same dialog with the published title and
write-up and shows "Updated on the Rack" on success. **Take off the Rack** confirms in an
`AlertDialog`, then calls `DELETE`. If that gets a 404 (already unpublished
elsewhere), the controls resync silently, since it is the outcome asked for. If
the publish-status load fails, the controls show "Couldn't load Rack status"
and **Try again**.

### Browse

`/rack` (`PublishedListPage`) keeps `weight`, `maxPrice` and `page` in the URL,
so a filtered list can be linked to. A bad value in the URL means "no filter".
`useQuery` with `keepPreviousData` keeps the current page on screen while the
next loads. With no filters, an empty first page reads "No builds on the Rack yet";
an empty page past the end (with `total > 0`) reads "No builds on this page".
`/rack/:id` (`PublishedBuildPage`) shows the parts table, the total, the
write-up and **Open in Builder**; a 404 renders `NotFound`. Dates go through the
shared `src/utils/formatApiDate.ts`, because the API's timestamps carry no
offset. Both routes sit outside `BuilderLayout`, so they don't load the parts
catalog.

### Old URLs and Share

`src/routes/redirects.tsx` keeps old links working, all with `replace`:
`/builds` goes to `/rack` (the query string is kept), `/builds/:id` to
`/rack/:id`, and `/builder/saved` to `/my-builds`.

`ShareButton` (`src/components/shop/ShareButton.tsx`, with
`src/components/ui/popover.tsx`) shares a Rack URL. It appears on `/rack/:id`
next to **Open in Builder**, in `PublishControls` once the build is posted, and
in the Rack column of My builds. A post, update or take-down also invalidates
`buildKeys.list()`, so My builds shows the new status.

### Open in Builder

**Open in Builder** links to `/builder?copy=<id>`. Features can't import each
other, so the builder handles it the way it handles `save=1`:

1. `CopyPublishedIntent` (draft mode only, rendered by `BuilderPage`) reads
   `copy` once into state and removes it from the URL with `replace`.
2. An id that isn't a positive integer shows the notice at once and makes no
   request. Otherwise it calls `useQuery` with `publishedKeys.detail(id)`, the
   same cache entry the catalog's detail page uses, through
   `getPublicBuildParts` in `api/publish.ts`.
3. If the draft is empty, it applies at once. Otherwise an `AlertDialog` asks
   "Replace your current draft with {title}?" (**Replace** / **Keep my draft**).
4. Applying is `clearBuild()`, then `selectPart(slot, `${slot}-${id}`)` for each
   part that isn't `null`. `clearBuild` also clears the questionnaire's "Why:"
   notes. A `useRef` guard makes it happen once under StrictMode.
5. A 404, or an invalid id, shows a dismissible "That build is no longer
   published" and leaves the draft alone. The query client doesn't retry 4xx
   errors. Other fetch errors show the dismissible notice "Couldn't load that
   build" and leave the draft alone.

Once applied it is an ordinary local draft: change it, or save it to an account.

## Cache keys

- `buildKeys.published(id)` (`['builds', id, 'published']`) is the owner's
  status. It sits under `['builds']`, so sign-out and session expiry remove it.
- `publishedKeys` (`src/lib/publishedKeys.ts`) is the public catalog:
  `all`, `list(params)` and `detail(id)`. It lives in `lib/` because the builder
  invalidates it after a publish, update or unpublish without importing the
  catalog. It isn't cleared on sign-out, since the data is public.
