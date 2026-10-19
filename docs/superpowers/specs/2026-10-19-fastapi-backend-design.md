# FastAPI Backend — Design

**Date:** 2026-10-19
**Status:** Approved in chat, pending spec review

## Goal

Replace the Express server in `server/` with the FastAPI app in `api/`, as a showcase of real backend work. Omar writes every line of API code; Claude guides and reviews (the frontend change in PR 3 is paired).

The first version has three parts:

1. **Parity:** parts and builds endpoints, matching what Express does today.
2. **pytest suite:** runs against a real MySQL test database.
3. **Server-side compatibility:** the rod-matching rules move from the frontend into the API, so they live in one place.

## Success criteria

- The frontend runs against FastAPI with only one change: the compatibility swap in PR 3.
- `uv run pytest` passes against a freshly migrated test database.
- `src/features/builder/utils/compatibility.ts` is deleted, and no part IDs are hardcoded anywhere.
- `server/` is deleted.
- Each PR is under 500 lines (excluding pure deletions and file moves).

## Decisions

| Decision | Choice |
|---|---|
| Showcase feature | pytest suite |
| Test database | Separate MySQL DB (`rodpartpicker_test`), rebuilt each session, per-test transaction rollback |
| Parts endpoints | Five explicit routes, each with its own `response_model` |
| JSON keys | camelCase via Pydantic `alias_generator=to_camel` |
| Error body | FastAPI's `{"detail": ...}` everywhere (replaces Express's `{"error": ...}`) |
| Invalid input status | 422 (FastAPI default; Express used 400) |
| `POST /builds` response | 201 with the full `BuildOut` (Express returned `{"id": n}`) |
| Non-trout leaders | New column `leaders.is_trout`, set by name in migration 014 |
| Earlier decisions (2026-10-11) | SQLAlchemy ORM, sync PyMySQL, uv, feature folders, Python migration runner (no Alembic) |

## Layout

```text
api/
  migrations/            # git mv from server/db/migrations, filenames unchanged
  app/
    config.py            # + TEST_DB_NAME
    db.py                # + make_url(db_name), DbSession alias
    main.py              # includes feature routers under /api
    migrate.py           # migrate(db_name); `uv run python -m app.migrate`
    schemas.py           # CamelModel base
    parts/               # models.py, schemas.py, router.py
    builds/              # models.py, schemas.py, router.py
    compatibility/       # schemas.py, router.py
  tests/
    conftest.py
    test_parts.py
    test_builds.py
    test_compatibility.py
```

## Configuration and database

- **`config.py`:** add `TEST_DB_NAME: str = "rodpartpicker_test"` to `Settings`.
- **`db.py`:**
  - Move URL building into `make_url(db_name: str) -> URL`. The app's `engine` uses `make_url(settings.DB_NAME)`.
  - Add `DbSession = Annotated[Session, Depends(get_db)]` for handlers.
- **Schema ownership:** migrations own the schema. ORM models only mirror it, so `Base.metadata.create_all()` is never called.

## Migration runner (`app/migrate.py`)

This is a port of `server/scripts/migrate.ts`, with the same behaviour:

- `migrate(db_name)`:
  1. Connects with PyMySQL without selecting a database.
  2. Runs `CREATE DATABASE IF NOT EXISTS ... CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`, then calls `select_db`.
  3. Creates `schema_migrations (filename PK, applied_at)` if it's missing.
  4. Applies each unapplied `api/migrations/*.sql` file in filename order and records each one.
- Files contain many statements, so the connection needs `client_flag=CLIENT.MULTI_STATEMENTS`. Drain every result with `while cursor.nextset()` before recording the file.
- A `__main__` block calls `migrate(settings.DB_NAME)` and prints the same messages as the TS runner.
- **Filenames must not change when the files move.** `schema_migrations` matches files by name, so a renamed file would be re-applied to existing databases.
- MySQL commits DDL implicitly, so a migration that fails partway can't be rolled back. The TS runner has the same limitation, and the module docstring says so.

## Shared schema base (`app/schemas.py`)

```python
class CamelModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)
```

FastAPI serializes responses by alias, so snake_case fields go out as camelCase keys.

## PR 1: Foundation and parts

**Models** (`parts/models.py`):

- SQLAlchemy 2.x typed mappings for `Brand`, `XSize`, `Rod`, `Reel`, `FlyLine`, `Leader` and `Tippet`.
- Every part class has a `brand` relationship. `Leader` has an optional `x_size` relationship, because `x_size_id` is nullable; `Tippet` has a required one.
- Columns follow the migrations up to `013`. These are nullable: `rods.pieces`, `fly_lines.type`, `fly_lines.sink_rate_ips`, `fly_lines.head_weight_grains`, `leaders.x_size_id`, `leaders.price`, `leaders.strength_lb` and `tippets.strength_lb`.
- `ForeignKey(...)` is declared only for mapped tables (`brands`, `x_sizes`). Line-weight columns stay plain integers because `line_weights` isn't mapped.
- MySQL `ENUM` columns are `Mapped[str]`.

**Schemas** (`parts/schemas.py`): `RodOut`, `ReelOut`, `LineOut`, `LeaderOut` and `TippetOut`, all subclasses of `CamelModel`.

- They emit the same keys as the Express queries in `server/src/routes/parts.ts`:
  - Every part: `id`, `brand`, `model`, `water` and `price`.
  - Rods add `action`, `lineWeight`, `lengthIn` and `pieces`.
  - Reels add `minLineWeight` and `maxLineWeight`.
  - Lines add `type`, `sinkRateIps`, `lineWeight` and `headWeightGrains`.
  - Leaders add `material`, `lengthFt`, `xSize`, `strengthLb` and `packCount`.
  - Tippets add `material`, `xSize`, `strengthLb` and `spoolYards`.
- `brand` reads `AliasPath("brand", "name")`. `model` reads `"name"`. `x_size` reads `AliasPath("x_size", "label")`.
- Enum-backed fields use `Literal[...]`.
- Every DECIMAL-backed field is declared as `float` (or `float | None`): `price`, `lengthFt`, `strengthLb` and `sinkRateIps`. Pydantic serializes `Decimal` as a JSON string, but the frontend expects numbers, as Express sent with `decimalNumbers: true`.

**Routes** (`parts/router.py`, `APIRouter(prefix="/parts", tags=["parts"])`):

- `GET /rod`, `/reel`, `/line`, `/leader` and `/tippet`. Each is annotated `-> list[XOut]`.
- Each query joins the brand and eager-loads it with `contains_eager`, so there are no N+1 lazy loads. Leaders outer-join `x_sizes`, and tippets inner-join it.
- `ORDER BY` matches the Express queries.
- `main.py` includes the router in the `/api` router.

**Test infrastructure** (`tests/conftest.py`):

- **Session fixture:**
  1. Refuse to run if `TEST_DB_NAME == DB_NAME`.
  2. Run `DROP DATABASE IF EXISTS` on the test DB, then call `migrate(TEST_DB_NAME)`.
  3. Create the test engine from `make_url(TEST_DB_NAME)`.
- **Per-test fixture:**
  1. Open a connection and call `begin()`.
  2. Create `Session(bind=conn, join_transaction_mode="create_savepoint")`.
  3. Override `get_db` with it and yield a `TestClient`.
  4. Afterwards, roll back and clear the overrides.
- Tests insert their own rows and assert on those rows only, never on total counts. The test DB also contains the seed data.
- Dev dependency: `pytest` (`httpx` already comes with `fastapi[standard]`).

**Tests** (`test_parts.py`):

- Each of the 5 routes returns 200.
- An inserted part appears with camelCase keys and the correct values.
- `price` is a JSON number.
- A leader with no x-size returns `"xSize": null`.

## PR 2: Builds

**Model** (`builds/models.py`):

- `Build` has `name` and the nullable foreign keys `rod_id`, `reel_id`, `fly_line_id`, `leader_id` and `tippet_id`.
- `created_at` and `updated_at` use `server_default=func.now()`. MySQL maintains `updated_at`, and the API never sets either one.

**Schemas** (`builds/schemas.py`):

- `BuildIn`:
  - `name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]`
  - Each part ID is `PositiveInt | None = None`.
- `BuildOut`: the `BuildIn` fields plus `id`, `created_at` and `updated_at`.

**Routes** (`builds/router.py`, `prefix="/builds"`; `build_id: Annotated[int, Path(gt=0)]`):

| Route | Success | Failure |
|---|---|---|
| `GET /builds` | 200, ordered by `updated_at` DESC | |
| `GET /builds/{build_id}` | 200 `BuildOut` | 404 |
| `POST /builds` | 201 `BuildOut` | 400 if a part ID doesn't exist, 422 if the body is invalid |
| `PUT /builds/{build_id}` | 204, full replace | 404, 400, 422 |
| `DELETE /builds/{build_id}` | 204 | 404 |

**Error handling:**

- **Missing build:** `HTTPException(404, detail="Build not found")`.
- **Part ID that doesn't exist:** the database foreign key is the check, with no pre-query. A `_commit(db)` helper in the builds router catches `IntegrityError`, rolls back, and raises `HTTPException(400, detail="Referenced part does not exist")` when MySQL error code `1452` is the cause (`err.orig.args[0] == 1452`). It re-raises anything else.
- **Already handled by FastAPI:** 422 validation errors, the JSON 404 for unknown paths, and 500 for unhandled errors. Express's catch-all and error middleware are not ported.

**Tests** (`test_builds.py`):

- Create a build, then fetch it back.
- Update a build, then confirm the change.
- Delete a build, then confirm it returns 404.
- PUT and DELETE on a missing ID return 404.
- A part ID that doesn't exist returns 400.
- An empty name, a whitespace-only name and a 121-character name each return 422. So does `build_id=0`.
- The ordering test sets `updated_at` explicitly, because rows created within the same second would tie.

## PR 3: Compatibility

**Migration `api/migrations/014_leader_trout.sql`:**

```sql
ALTER TABLE leaders ADD COLUMN is_trout BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE leaders SET is_trout = FALSE
WHERE name IN ('Mirage Big Game Leader', 'Absolute Streamer Leader', 'Absolute Saltwater Leader');
```

The update matches rows by name, as `013` does. These three names are the rows behind the frontend's IDs 11–13. `Leader` gains `is_trout: Mapped[bool]`.

**Endpoint** (`compatibility/router.py`): `GET /api/rods/{rod_id}/compatible-parts` returns `CompatibleParts`, which has the fields `reel`, `line` and `leader`, each a `list[int]` of part IDs.

- `db.get(Rod, rod_id)`. If it's `None`, raise `HTTPException(404, detail="Rod not found")`.
- With `w = rod.line_weight`:
  - **reel:** `min_line_weight <= w AND max_line_weight >= w`
  - **line:** `line_weight == w`
  - **leader:** `is_trout` is true. This rule doesn't depend on the rod; every rod in the current catalog is a trout rod. Revisit it if saltwater rods are added.

**Tests** (`test_compatibility.py`): a weight-5 rod against

- reels rated 3–5 and 5–7, which match;
- reels rated 6–8 and 2–4, which don't match;
- lines of weight 5 (match) and 6 (no match);
- a trout leader (included) and a non-trout leader (excluded);
- a rod ID that doesn't exist, which returns 404.

**Frontend** (paired):

- Add `fetchCompatibleParts(rodId, signal)` in `src/features/builder/api/`. It returns a `Set<number>` of database IDs per component.
- `BrandPartsPage.tsx` fetches once when a rod is selected, using an `AbortController`, following the same pattern `BuilderLayout` uses for `fetchCatalog`.
- The `fitsRod(part, rod)` call becomes a set lookup on `part.dbId`. Nothing is highlighted until the response arrives.
- Delete `src/features/builder/utils/compatibility.ts`.

## PR 4: Cutover

- Delete `server/` and `tsconfig.server.json`.
- Remove `express`, `mysql2`, `zod` and `@types/express` from `package.json` (`@types/node` stays; Vite config uses it). Nothing in `src/` uses them.
- Remove the scripts `dev:server` and `start:server`. Change `db:migrate` to `cd api && uv run python -m app.migrate`.
- Update the Express references in the `vite.config.ts` comment, the root `README.md`, `src/lib/api.ts` and `src/features/builder/api/parts.ts`.

## Out of scope

- Authentication and user accounts.
- Filtering and pagination on parts.
- Making the leader rule depend on the rod.
- Frontend use of the builds endpoints.
- Async database access and Alembic.
