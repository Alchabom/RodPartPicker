# Published Builds Design

**Date:** 2026-11-18
**Follows:** `docs/superpowers/specs/2026-11-12-saved-builds-design.md`, whose "Out of scope" names this spec. It is the second half of the auth spec's "spec 2".
**Updates:** `docs/database/schema-design.md` (a new `published_builds` table)
**Followed by:** three separate specs that attach to a published build, in this order: comments, ratings, photos

## Goal

Give RodPartPicker a public catalog of finished setups, modeled on PCPartPicker's [Completed Builds](https://pcpartpicker.com/builds/). A signed-in user publishes one of their saved builds with a title and a write-up. Anyone, signed in or not, can browse the catalog at `/builds`, filter it by rod weight and total price, read a build at `/builds/:id`, and open it in the Builder as a starting point for their own draft.

The catalog is the first time one user's data is shown to others, so this spec also records how user-written text is kept safe (see "Untrusted text").

This spec is the foundation of the catalog. Comments, ratings and photos each get their own spec later. Each one attaches to `published_builds.id`, so nothing here has to be reworked for them.

The team will present this work, so every choice in "Decisions" records its reason.

## Success criteria

- A signed-in user can publish a saved build that has all five parts, giving it a title (3 to 80 characters) and a write-up (1 to 4,000 characters).
- Editing the saved build after publishing doesn't change the published build. **Update published build** copies the current parts on purpose, and **Unpublish** removes the build from the catalog.
- A saved build has at most one published build.
- `/builds` lists published builds newest first, 20 per page. It can be filtered by rod weight and by maximum total price, and the filters and page number live in the URL.
- `/builds/:id` shows the title, the author's display name, the publish date, the parts with prices, the total and the write-up. It works signed out.
- **Open in Builder** copies a published build's parts into the visitor's local draft, asking first if the draft isn't empty.
- No public response exposes a user's id, email or saved-build id.
- Titles and write-ups are stored and shown exactly as written. They can't change a SQL query or run as script (see "Untrusted text").
- Every API case in "Testing" has a passing pytest case, and every step of the manual script passes in the browser.
- `uv run pytest`, `npm run build` and `npm run lint` pass.
- Each PR is under 500 lines, excluding pure deletions and generated files.

## Out of scope

- **Comments, ratings and photos.** Each gets its own spec, in that order. Photos depend on choosing object storage for the Vercel deploy.
- Text search over titles and write-ups (no `FULLTEXT` index).
- Sorting other than newest first. "Top rated" arrives with ratings.
- Markdown, links or any other formatting in write-ups.
- Moderation, reporting or admin tools.
- A user profile page listing someone's published builds.
- Publishing a build with fewer than five parts.
- Showing a user their published builds in one place. Each saved build shows its own published state, which is enough for now.

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| What a published build holds | A **snapshot**: its own copy of the five part ids, plus a title and write-up | Saved builds autosave on every change. A live pointer would make the catalog change whenever the owner tinkers, and later comments and ratings would end up describing parts the build no longer has |
| Link back to the saved build | `source_build_id`, used only to update or unpublish from the builder | It keeps the "points at a saved build" split the saved-builds spec planned, without reading parts through it |
| Published builds per saved build | At most one, enforced by a unique key | One clear relationship: the builder can always show whether *this* build is public, and the catalog doesn't fill with near-duplicate versions |
| Deleting the saved build | The published build stays; `source_build_id` becomes NULL | Publishing is a deliberate act, and readers may still want the build. The owner just can't update it from the builder anymore |
| Deleting a user | `ON DELETE CASCADE` to their published builds | It matches migration 019 for saved builds |
| Part requirement | All five parts | It's a catalog of *completed* setups, and the rod-weight filter needs a rod |
| "Newest" | `published_at`, set once at first publish | An update shouldn't push an old build back to the top of the list |
| Text format | Plain text, line breaks kept | It's the safest thing to render, and comments will follow the same rule |
| Read model | The API returns parts, author and total already joined | The public pages don't need the builder's full parts catalog, and paging and filtering happen on the server where they belong |
| Filters | Rod weight and max total price, computed in SQL | They come from the snapshot's parts, so authors don't have to tag anything. Both work through the same joins that build the total |
| Owner routes | Nested on the saved build: `/api/builds/{id}/published` | They reuse `_get_owned_build`, so "only the owner can publish" is the same check as every other build route, and someone else's build is the same 404 |
| Publish request | `PUT` with only `{ title, writeup }`; the server copies the parts | A client can't publish parts it hasn't saved, or publish for someone else |
| Frontend slices | A new `catalog` feature for the public pages; publish controls stay in `builder` | Each feature owns one domain, and comments, ratings and photos will join `catalog` |
| Open in Builder | A `/builder?copy=<id>` link handled by the builder | Features can't import each other. A URL intent follows the existing `save=1` pattern in `SaveDraftButton` |
| Publishing and autosave | Publishing waits for pending autosaves first | The server copies from the saved row, so an edit still waiting in the debounce would otherwise be left out of the snapshot |

## Data model

Migration `api/migrations/020_published_builds.sql`:

```sql
-- 020_published_builds: the public catalog of completed builds.
-- A published build is a snapshot of a saved build's parts, plus a title and
-- write-up. Design rationale: docs/superpowers/specs/2026-11-18-published-builds-design.md

CREATE TABLE published_builds (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          INT UNSIGNED NOT NULL,
  source_build_id  INT UNSIGNED NULL,
  title            VARCHAR(80)  NOT NULL,
  writeup          TEXT         NOT NULL,
  rod_id           INT UNSIGNED NULL,
  reel_id          INT UNSIGNED NULL,
  fly_line_id      INT UNSIGNED NULL,
  leader_id        INT UNSIGNED NULL,
  tippet_id        INT UNSIGNED NULL,
  published_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_published_source (source_build_id),
  KEY idx_published_newest (published_at, id),
  CONSTRAINT fk_published_user     FOREIGN KEY (user_id)         REFERENCES users (id)     ON DELETE CASCADE,
  CONSTRAINT fk_published_source   FOREIGN KEY (source_build_id) REFERENCES builds (id)    ON DELETE SET NULL,
  CONSTRAINT fk_published_rod      FOREIGN KEY (rod_id)          REFERENCES rods (id)      ON DELETE SET NULL,
  CONSTRAINT fk_published_reel     FOREIGN KEY (reel_id)         REFERENCES reels (id)     ON DELETE SET NULL,
  CONSTRAINT fk_published_fly_line FOREIGN KEY (fly_line_id)     REFERENCES fly_lines (id) ON DELETE SET NULL,
  CONSTRAINT fk_published_leader   FOREIGN KEY (leader_id)       REFERENCES leaders (id)   ON DELETE SET NULL,
  CONSTRAINT fk_published_tippet   FOREIGN KEY (tippet_id)       REFERENCES tippets (id)   ON DELETE SET NULL
) ENGINE=InnoDB;
```

- MySQL allows any number of NULLs under a unique key, so published builds whose source was deleted never collide on `uq_published_source`.
- The part columns can be NULL even though publishing requires all five: `SET NULL` clears a part that is later removed from the catalog.
- `fk_published_user` also gives `user_id` the index that user deletion and the cascade need.
- The SQLAlchemy model `PublishedBuild` (`app/published/models.py`) maps onto this table and doesn't create it, as with every other model.

## API (`api/app/published/`)

A new package with `models.py`, `schemas.py` and `router.py`, registered in `app/main.py` under `/api`. Schemas extend `CamelModel`, so fields are camelCase on the wire.

### Public routes

No sign-in. They are `GET`s, so the Origin middleware doesn't apply.

**`GET /api/published`**

| Query parameter | Type | Rule |
|---|---|---|
| `page` | int | ≥ 1, default 1 |
| `weight` | int | 1 to 15 (the `line_weights` range), optional; matches `rods.line_weight` |
| `maxPrice` | decimal | ≥ 0, optional; compared with the computed total |

Anything outside these rules is a 422 before a query runs.

Response: `{ items: PublishedSummaryOut[], page, pageSize: 20, total }`, ordered `published_at DESC, id DESC`. `total` is the number of matching builds, so the client can show "Page 2 of 4".

`PublishedSummaryOut`: `id`, `title`, `author` (the display name), `rod` (`{ brand, name, lineWeight }`, or `null` if the rod has been removed), `totalPrice` and `publishedAt`.

The query joins `users` and LEFT JOINs the five part tables (and each part's brand). `totalPrice` is the sum of `COALESCE(price, 0)` over the five parts. The `maxPrice` filter is applied to that same expression, and the `weight` filter to `rods.line_weight`. A build whose rod has been removed has no weight, so the weight filter leaves it out.

**`GET /api/published/{id}`**

`PublishedBuildOut`: the summary fields plus `writeup`, `updatedAt` and `parts`. `parts` has one entry per slot (`rod`, `reel`, `line`, `leader`, `tippet`), each `{ id, brand, name, price }`, or `null` when the part has been removed. An unknown id is a 404.

Public responses never include `user_id`, `source_build_id` or the author's email.

### Owner routes

Nested on the saved build. Each takes `CurrentUserId` and starts with `_get_owned_build(db, build_id, user_id)` (moved from `app/builds/router.py` to a shared spot in `app/builds/`, so both routers use the same check). Someone else's build, or a missing one, is a 404. `PUT` and `DELETE` are writes, so they need the `Origin` header like every other write.

| Route | Behavior |
|---|---|
| `GET /api/builds/{id}/published` | `PublishedRefOut` (`id`, `title`, `writeup`, `updatedAt`), or 404 if the build isn't published |
| `PUT /api/builds/{id}/published` | Body `PublishIn` (`title`, `writeup`). Copies the saved build's five part ids into the published build: creates it (201) or updates it (200). Returns `PublishedRefOut` |
| `DELETE /api/builds/{id}/published` | Unpublishes: 204, or 404 if it wasn't published |

`PublishIn`:
- `title`: string, whitespace stripped, 3 to 80 characters.
- `writeup`: string, whitespace stripped, 1 to 4,000 characters.

`PUT` errors:
- **400** "Add all five parts before publishing" if any part id on the saved build is NULL.
- **409** "Choose a display name first" if the user has no display name. The UI can't reach this (`RequireAuth` sends the user to `/welcome`), but the API guards it so every published build has an author.
- **409** "Already published" if two first publishes race and the second one hits `uq_published_source` (MySQL error 1062). The route rolls back first.

On update, `published_at` is left alone; MySQL updates `updated_at`.

The owner is always taken from the access cookie. Neither request body names a user or a part.

## Untrusted text

Titles and write-ups are written by one user and read by everyone. Two rules keep them inert.

**SQL injection.**
- Every query uses SQLAlchemy expressions (`select(...)`, `.where(...)`, ORM attribute assignment). They send values to MySQL as bound parameters, separate from the SQL text, so a value can never change what a query does.
- Building SQL from user input with f-strings, `%` formatting, string concatenation or `text()` is not allowed anywhere in `app/published/`.
- Query parameters are typed (an int `page` and `weight`, a decimal `maxPrice`), so FastAPI rejects anything else with a 422 before any query runs.

**Script injection (XSS).**
- The frontend renders titles and write-ups only as React text nodes, which escape `<`, `>` and `&`. `dangerouslySetInnerHTML` is not allowed in the catalog feature.
- Line breaks in write-ups are shown with the CSS `whitespace-pre-line`, not by turning them into HTML.
- Nothing in a write-up becomes a link.

The API stores and returns the text exactly as written, after trimming whitespace. It doesn't strip or escape it, because escaping is the renderer's job and stripping would silently change what a user wrote. "Testing" has a case for each attack.

## Frontend

### Catalog feature (`src/features/catalog/`)

```
src/features/catalog/
├── api/published.ts          listPublished(params, signal), getPublished(id, signal)
├── components/
│   ├── PublishedListPage.tsx   /builds
│   ├── PublishedCard.tsx
│   ├── CatalogFilters.tsx
│   └── PublishedBuildPage.tsx  /builds/:id
├── types/index.ts            PublishedSummary, PublishedBuild, PublishedList
└── index.ts                  exports PublishedListPage, PublishedBuildPage
```

**`/builds` (`PublishedListPage`)**
- Reads `weight`, `maxPrice` and `page` from the URL search params. Changing a filter writes it to the URL and resets `page` to 1, so a filtered list can be linked to, and Back works.
- The filters are a rod-weight select ("Any weight", then 1wt to 15wt) and a max-price number input. The price input updates the URL on blur or Enter, not on every keystroke.
- `useQuery({ queryKey: publishedKeys.list(params), queryFn, placeholderData: keepPreviousData })` keeps the current page on screen while the next one loads.
- Each card shows the title, the author, the rod's brand and name, its weight and the total (`formatPrice`), and links to `/builds/:id`.
- Paging shows **Previous**, **Next** and "Page 2 of 4". Previous is disabled on page 1, and Next is disabled on the last page.
- It has loading, empty ("No builds match these filters", with a **Clear filters** button, or "No builds published yet" when no filters are set) and error states (a message and a **Try again** button that calls `refetch`).

**`/builds/:id` (`PublishedBuildPage`)**
- Shows the title as the `h1`, then "by {author} · {publish date}" (`Intl.DateTimeFormat`).
- A table of the five slots: component, brand and name, price. A `null` part shows "No longer available", and the total underneath skips it.
- The write-up is in a `<p className="whitespace-pre-line">`.
- An **Open in Builder** link goes to `/builder?copy={id}`.
- A 404 renders the existing `NotFound` component. Other errors show a message and **Try again**.

**Routes and navbar**
- `AppRoutes.tsx` adds `builds` and `builds/:id` at the top level, outside `BuilderLayout`, so the public pages don't load the parts catalog.
- The navbar's **Completed Builds** placeholder (`#completed-builds`) becomes a `Link` to `/builds`.

### Builder changes (`src/features/builder/`)

**API client:** a new `api/publish.ts` with `getMyPublished(buildId, signal)`, `publishBuild(buildId, input)` and `unpublishBuild(buildId)`. Its query key is `['builds', id, 'published']`. It sits under `['builds']`, so the existing sign-out and session-expiry cleanup removes it.

**`flushSave` on `SavedBuildProvider`:** the saved-mode context gains `flushSave(): Promise<void>`. It sends any debounced save immediately, then waits until no save is in flight. It reuses the provider's existing pending-save and in-flight tracking (the same logic that flushes on leaving the page and that a reopened build waits on). It rejects if that save fails.

**`PublishControls` (in `BuildHeader`, saved mode only):**
- **Not published** (the `GET` returns 404): a **Publish** button. It's disabled until all five parts are picked, with the hint "Add all five parts to publish".
- **Published:** "Published · View" (a link to `/builds/:id`), **Update published build** and **Unpublish**.
- **`PublishDialog`** (shadcn `Dialog`):
  - A title input, pre-filled with the build's name the first time or with the published title on update.
  - A write-up textarea with a live "123 / 4000" counter.
  - Errors from the API.
  - Submit runs `await flushSave()`, then `publishBuild`. On success it closes, invalidates `['builds', id, 'published']` and `publishedKeys.all`, and shows "Published" (or "Updated").
- **Unpublish** confirms with an `AlertDialog` (as Delete does on My Builds), calls `unpublishBuild`, and invalidates the same keys.

**`CopyPublishedIntent` (draft mode, rendered by `BuilderPage` when `kind === 'draft'`):** handles `?copy=<id>`, following the `save=1` pattern.
1. It reads `copy` and removes it from the URL (`replace`). A `useRef` guard makes it run once, even under StrictMode.
2. It fetches the published build with the catalog's public route. To avoid importing the catalog feature, it calls `apiFetch('/published/{id}')` through its own small client in `api/publish.ts`.
3. If the draft is empty, it fills it right away. Otherwise it opens an `AlertDialog`: "Replace your current draft with {title}?" (**Replace** / **Keep my draft**).
4. Filling the draft calls `clearBuild()`, then `selectPart` for each part that isn't `null`. `clearBuild` already clears the questionnaire's "Why:" notes.
5. A 404 shows a dismissible notice, "That build is no longer published", and leaves the draft alone.

### Shared code

- `formatPrice` moves from `src/features/builder/utils/formatPrice.ts` to `src/utils/formatPrice.ts` (`@utils/formatPrice`), since both features now need it. The builder's imports are updated.
- `src/lib/publishedKeys.ts` exports `publishedKeys` (`all: ['published']`, `list(params)`, `detail(id)`). The catalog uses them for its queries, and the builder invalidates `publishedKeys.all` after a publish, update or unpublish, without importing the catalog. These keys aren't cleared on sign-out, because the data is public.
- No other code moves. The catalog's types describe the API's read model and don't reuse the builder's `Part` or `Build` types.

## Flows

**Publish**
1. On `/builder/42` with all five parts, the owner clicks **Publish**.
2. The dialog opens with the title "Creek setup" (the build's name). The owner writes a write-up and submits.
3. `flushSave()` sends the last debounced edit and waits for it.
4. `PUT /api/builds/42/published` copies the five part ids and returns 201 with the new published id, 7.
5. The dialog closes. The header shows "Published · View", **Update published build** and **Unpublish**. `/builds` shows the build first.

**Edit, then update**
1. The owner swaps the reel on `/builder/42`. Autosave updates the saved build. `/builds/7` still shows the old reel.
2. The owner clicks **Update published build** and submits.
3. `PUT` copies the new reel and returns 200. `published_at` is unchanged, so the build keeps its place in the list.

**Open in Builder**
1. A signed-out visitor on `/builds/7` clicks **Open in Builder**, which goes to `/builder?copy=7`.
2. `CopyPublishedIntent` removes `copy` from the URL and fetches `/api/published/7`.
3. The visitor's draft already has a rod, so the dialog asks to replace it. They click **Replace**.
4. The draft now holds build 7's five parts. It's an ordinary local draft, so the visitor can change it and save it to their own account.

**Saved build deleted**
1. The owner deletes saved build 42 from My Builds.
2. `fk_published_source` sets `published_builds.source_build_id` to NULL. `/builds/7` is still public.
3. The owner can no longer update or unpublish build 7 from the builder. A management page for this case is out of scope.

## Error handling

| Case | Where | What the user sees |
|---|---|---|
| Publish with a part missing | API 400 | The Publish button is disabled with a hint; if a request gets through anyway, the dialog shows the API's message |
| Title or write-up out of range | Form check, then API 422 | An inline message on that field |
| No display name | API 409 | Not reachable from the UI (`RequireAuth`); the dialog would show the message |
| Two first publishes race | API 409 "Already published" | The dialog refetches `['builds', id, 'published']` and switches to the update state |
| Autosave failing during publish | `flushSave` rejects | "Couldn't save your latest changes; retry before publishing", and the publish isn't sent |
| Network or server error on publish, update or unpublish | API 5xx or fetch error | An error message in the dialog; the dialog stays open |
| Bad filter value in the URL (`?weight=abc`) | Client | Ignored and treated as no filter, so the URL never makes the page fail |
| Unknown or unpublished id on `/builds/:id` | API 404 | `NotFound` |
| `?copy=` with an unknown id | API 404 | A dismissible notice "That build is no longer published"; the draft isn't touched |
| A part removed from the catalog | `SET NULL` | "No longer available" on that slot, and the total skips it |

## Testing

New file `api/tests/test_published.py`, using the existing `client`, `login`, `make_user`, `make_part` and `db` fixtures (plus a helper that creates a saved build with all five parts). As elsewhere, tests call `db.rollback()` before re-reading, to catch a missing `commit()`.

**Publishing**
- `PUT` on a five-part build returns 201, and the row holds the build's part ids, the title and the write-up.
- A second `PUT` returns 200 and updates the title, write-up and parts. `published_at` is unchanged.
- Changing the saved build without a `PUT` leaves the published parts unchanged.
- `PUT` on a build missing any one part returns 400 (parametrized over the five slots).
- `PUT` by a user with no display name returns 409.
- A title of 2 or 81 characters, and a write-up that's empty or 4,001 characters, return 422.
- `GET` and `DELETE` on `/api/builds/{id}/published` return 404 when the build isn't published.
- `DELETE` returns 204, after which the build is gone from `GET /api/published`.
- Someone else's build returns 404 on all three owner routes, and nothing changes.
- The owner routes need sign-in (401), and the two write routes reject a missing `Origin` (403).

**Deletion**
- Deleting the saved build keeps the published build, with `source_build_id` NULL.
- Deleting the user deletes their published builds.

**The list**
- Builds come back newest first, with a higher `id` first when `published_at` is the same.
- 21 builds give a first page of 20 and a second page of 1, with `total` 21.
- `weight=5` returns only builds with a 5wt rod.
- `maxPrice` keeps builds whose total is at or below it and drops ones above it. A build with a NULL part counts that part as 0.
- `page=0`, `weight=0`, `weight=16`, `weight=abc` and `maxPrice=-1` each return 422.

**The detail route**
- It returns the parts, author, total and write-up.
- A part removed from the catalog comes back as `null`, and the total skips it.
- An unknown id returns 404.
- Neither public route's JSON contains `userId`, `sourceBuildId` or an email.

**Untrusted text**
- A build published with the title `x'); DROP TABLE builds; --` reads back unchanged from `GET /api/published/{id}`, and the `builds` table still exists with its rows.
- A write-up of `<script>alert(1)</script>` reads back as that exact string.
- `maxPrice=1 OR 1=1` returns 422.

**Frontend.** There's no frontend test runner, so `npm run build` (type check) and `npm run lint` must pass, plus this manual script:
1. Sign in, make a five-part saved build and publish it. It appears first on `/builds`.
2. Filter `/builds` by its rod weight and by a max price just below its total. It's hidden only by the second filter. Reload the page: the filters stay.
3. Open `/builds/:id`. A write-up with line breaks shows them, and a write-up containing `<b>hi</b>` shows the tags as text.
4. Change a part on the saved build. The published page doesn't change. Click **Update published build**: now it does.
5. Change a part and click **Publish**/**Update** within a second. The published build has the new part (`flushSave`).
6. Sign out. `/builds` and `/builds/:id` still load. **Open in Builder** fills an empty draft. With a non-empty draft, it asks first, and **Keep my draft** leaves the draft alone.
7. Visit `/builder?copy=99999`. The notice appears and the draft is untouched.
8. Sign back in and unpublish. The build is gone from `/builds`, and its detail page is a 404.
9. Regression: autosave, My Builds, Save build from a signed-out draft and the questionnaire still work.

## Documentation

- A new `docs/builds/published-builds.md`, like `saved-builds.md`: the snapshot model, the routes, the "Untrusted text" rules and the flows.
- `docs/database/schema-design.md` gets the `published_builds` table and its key decisions.
- CLAUDE.md: the catalog feature and `/builds` routes in "Architecture", and `app/published/` in "API".

## PR breakdown

One branch, `oa-published-builds`. If the total goes over the 500-line guideline, it becomes a stack with one PR per step:

1. **API:** migration 020, `app/published/` (model, schemas, router), `_get_owned_build` moved to a shared spot, and `tests/test_published.py`.
2. **Catalog pages:** `formatPrice` moved to `src/utils`, `src/lib/publishedKeys.ts`, the `catalog` feature, the routes and the navbar link.
3. **Publishing from the builder:** `flushSave`, `api/publish.ts`, `PublishControls` and `PublishDialog`.
4. **Open in Builder and docs:** `CopyPublishedIntent`, `docs/builds/published-builds.md`, `schema-design.md` and CLAUDE.md.

## Changes during implementation

Deviations from this spec:

- `_get_owned_build` moves to `app/builds/ownership.py` as the public `get_owned_build`. The spec only said "a shared spot in `app/builds/`".
- The owner's query key is `buildKeys.published(id)` (`['builds', id, 'published']`), added to the existing `buildKeys`, not a separate keys object.
- `CopyPublishedIntent` fetches through `useQuery` with `publishedKeys.detail(id)`, so it shares a cache entry with the catalog's detail page.

Rulings made during execution:

- An empty page past the end with no filters set (and `total > 0`) says "No builds on this page".
- After a publish or update succeeds, the controls show "Published"/"Updated" in a `role="status"` element.
- A failed publish-status load shows "Couldn't load publish status" and Try again.
- An Unpublish that gets a 404 resyncs the controls silently.
- Dates go through the shared `src/utils/formatApiDate.ts`.
- Deleting a saved build leaves its public copy up, and the owner can no longer unpublish it. That stays; the delete dialog warns about it ("If this build is published, its public copy stays on Completed Builds and can't be unpublished afterwards, so unpublish it first.").
