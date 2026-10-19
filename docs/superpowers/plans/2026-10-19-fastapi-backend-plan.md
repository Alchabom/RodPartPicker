# FastAPI Backend — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-10-19-fastapi-backend-design.md`
**Date:** 2026-10-19
**Tooling:** uv, Python 3.14, MySQL running locally, pnpm for the frontend

**How this plan works:** Omar writes the code and Claude reviews it. Each task lists the files, what to build, and the known pitfalls. Snippets appear only where a detail is easy to get wrong; they are not finished code. Tasks that add behaviour are written test first: write the test, watch it fail, make it pass.

**After every task:** run `uv run ruff check . && uv run ruff format --check . && uv run pytest` (from `api/`), ask Claude to review, then commit.

**Branches:** one per phase, each cut from `main` after the previous phase's PR has merged. Budget: under 500 lines per PR, not counting pure deletions and file moves.

---

# Phase 1 — Foundation and parts (`api-parts`, ~400 lines)

## Task 1.1 — Move the migrations

**Files:** `server/db/migrations/*` → `api/migrations/*`

1. `git mv server/db/migrations api/migrations`. Change nothing inside the files.
2. In `server/scripts/migrate.ts`, point `migrationsDir` at `../../api/migrations`. Express still works until Phase 4.

**Verify:** `pnpm db:migrate` prints "Database is up to date."
**Commit:** `chore(db): move migrations into api/`

## Task 1.2 — `make_url`, `DbSession`, `TEST_DB_NAME`

**Files:** `api/app/config.py`, `api/app/db.py`

1. In `Settings`, add `TEST_DB_NAME: str = "rodpartpicker_test"`.
2. In `db.py`, move the `URL.create(...)` call into `make_url(db_name: str) -> URL`. Then `engine = create_engine(make_url(settings.DB_NAME), pool_pre_ping=True)`.
3. Add `DbSession = Annotated[Session, Depends(get_db)]` after `get_db`, and use it in `/health`.

**Verify:** `uv run fastapi dev app/main.py --port 3001`; `/api/health` still returns `{"api":"ok","db":"ok"}`.
**Commit:** `refactor(api): extract make_url and DbSession`

## Task 1.3 — Migration runner

**Files:** `api/app/migrate.py` (new)

1. `MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations"`
2. Write `migrate(db_name: str) -> None` so it follows `migrate.ts` step by step:
   - Connect with `pymysql.connect(host=..., port=..., user=..., password=..., client_flag=CLIENT.MULTI_STATEMENTS)`. Import `CLIENT` from `pymysql.constants`, and don't pass `database=`.
   - Run `CREATE DATABASE IF NOT EXISTS` with the charset and collation, then `conn.select_db(db_name)`. **Pitfall:** a database name is an identifier, not a value, so `%s` placeholders don't work for it. Wrap it in backticks yourself. This is safe because the name comes from your own settings.
   - `CREATE TABLE IF NOT EXISTS schema_migrations ...`, then load the applied filenames into a `set`.
   - For each `sorted(MIGRATIONS_DIR.glob("*.sql"))` file not yet applied:
     - Run `cursor.execute(sql)`, then drain it: `while cursor.nextset(): pass`.
     - **Pitfall:** if you skip the drain, the next `execute` fails with "Commands out of sync".
     - Insert the filename with a `%s` placeholder, then `conn.commit()`.
   - Close the connection in a `finally`.
3. Add `if __name__ == "__main__": migrate(settings.DB_NAME)`, printing the same messages as the TS version.
4. Give the module a docstring that mentions MySQL's implicit DDL commits.

**Verify:**
- `uv run python -m app.migrate` against your dev DB prints "Database is up to date." This proves the filenames still match.
- Then, in a MySQL shell, `DROP DATABASE rodpartpicker_test;` (if it exists). Temporarily call `migrate("rodpartpicker_test")` from a REPL. All 13 migrations should apply.

**Commit:** `feat(api): port the migration runner to Python`

## Task 1.4 — Test infrastructure

**Files:** `api/pyproject.toml`, `api/tests/__init__.py` (empty), `api/tests/conftest.py` (new), `api/tests/test_health.py` (new)

1. `uv add --dev pytest`. In `pyproject.toml`, add:
   ```toml
   [tool.pytest.ini_options]
   testpaths = ["tests"]
   ```
2. `conftest.py`, session-scoped `engine` fixture:
   - **First line:** `assert settings.TEST_DB_NAME != settings.DB_NAME`.
   - Drop the test DB, using a short PyMySQL connection or the dev engine with `text("DROP DATABASE IF EXISTS ...")`. Then call `migrate(settings.TEST_DB_NAME)`.
   - `yield create_engine(make_url(settings.TEST_DB_NAME))`, then `dispose()` it.
3. Function-scoped `db` fixture:
   ```python
   conn = engine.connect()
   trans = conn.begin()
   session = Session(bind=conn, join_transaction_mode="create_savepoint")
   yield session
   session.close(); trans.rollback(); conn.close()
   ```
4. Function-scoped `client` fixture: set `app.dependency_overrides[get_db] = lambda: db`, yield `TestClient(app)`, then `app.dependency_overrides.clear()`.
5. The first test: `GET /api/health` returns 200 with `db == "ok"`.

**Verify:** `uv run pytest -v` passes. In MySQL, `SHOW DATABASES` lists `rodpartpicker_test`.
**Commit:** `test(api): add pytest with a rolled-back MySQL test database`

## Task 1.5 — `CamelModel` and the parts models

**Files:** `api/app/schemas.py` (new), `api/app/parts/models.py`

1. `schemas.py`: `CamelModel`, exactly as in the spec. `to_camel` comes from `pydantic.alias_generators`.
2. `parts/models.py`:
   - `Brand` and `XSize` (id, label). Then `Rod`, `Reel`, `FlyLine`, `Leader` and `Tippet`, with the columns from the spec.
   - Map nullable columns as `Mapped[X | None]`.
   - DECIMAL columns are `Mapped[Decimal]`.
   - `brand: Mapped[Brand] = relationship()`.
   - `Leader.x_size: Mapped[XSize | None] = relationship()`.
   - **Pitfall:** don't put `ForeignKey` on line-weight columns, because `line_weights` isn't mapped.
3. Add test factory fixtures to `conftest.py`, for example `make_brand(name)`, which adds, flushes and returns the row. Use names like `"Test Brand A"` so they can't collide with the seed data. Required FK values have to exist: line weights 1–15 and x-size IDs 1–12 are seeded by `002`.

**Verify:** a quick test that inserts a rod through the factory, then `db.get(Rod, id).brand.name` returns the right brand. This checks the mappings before any route exists. You can delete the test later or keep it.
**Commit:** `feat(api): map catalog tables with SQLAlchemy`

## Task 1.6 — Parts schemas and routes (test first)

**Files:** `api/app/parts/schemas.py`, `api/app/parts/router.py`, `api/app/main.py`, `api/tests/test_parts.py`

1. **Write the tests first:**
   - Each `/api/parts/{rod,reel,line,leader,tippet}` returns 200 and a list.
   - A rod you inserted appears with exactly the expected camelCase keys and values. `isinstance(row["price"], float)` should be true, not `str`.
   - A leader with `x_size_id=None` returns `"xSize": None`.
   - Run them and watch them fail with 404.
2. Write the schemas: the five `*Out` classes. See the spec for the keys, the `AliasPath`s, the `Literal`s, and the rule that DECIMAL fields are `float`.
3. Write the router: five handlers using `select(X).join(X.brand).options(contains_eager(X.brand)).order_by(...)`, with the same `ORDER BY` as `server/src/routes/parts.ts`.
   - Leaders: `.outerjoin(Leader.x_size)` plus `contains_eager(Leader.x_size)`.
   - Tippets: `.join(Tippet.x_size)`.
   - Return `db.scalars(stmt).all()`.
4. In `main.py`, call `api.include_router(parts_router)` **before** `app.include_router(api)`.

**Verify:**
- The tests pass.
- With Vite and FastAPI running, the builder loads the full catalog and nothing looks different.
- `/docs` shows five parts routes, each with its own schema.

**Commit:** `feat(api): add parts endpoints`
**Open PR 1.**

---

# Phase 2 — Builds (`api-builds`, ~300 lines)

## Task 2.1 — Build model and schemas

**Files:** `api/app/builds/__init__.py`, `api/app/builds/models.py`, `api/app/builds/schemas.py`

1. `Build` model:
   - Five `Mapped[int | None]` columns, each with a `ForeignKey` to its part table. Use `"fly_lines.id"` for `fly_line_id`.
   - `created_at` and `updated_at` are `Mapped[datetime]` with `server_default=func.now()`.
2. `BuildIn` and `BuildOut`, as in the spec. `BuildOut` subclasses `BuildIn` and adds `id`, `created_at` and `updated_at`.

**Commit:** with Task 2.2.

## Task 2.2 — Read and create routes (test first)

**Files:** `api/app/builds/router.py`, `api/app/main.py`, `api/tests/test_builds.py`

1. **Tests:**
   - POST returns 201, and the body has `id`, `name`, the part IDs and `createdAt`.
   - GET by ID returns the same build.
   - A missing ID returns 404 with `detail`.
   - A part ID that doesn't exist returns 400.
   - An empty name, a whitespace-only name and a 121-character name each return 422. So does `/builds/0`.
   - **List order:** insert two builds, set their `updated_at` explicitly (with `db.execute(update(...))`), then check the order.
2. Routes:
   - `build_id: Annotated[int, Path(gt=0)]`.
   - `POST` uses `status_code=201` on the decorator and returns `BuildOut`.
   - **Pitfall:** after the commit, call `db.refresh(build)`. Otherwise `created_at` and `updated_at`, which MySQL fills in, aren't loaded.
3. Write the `_commit(db)` helper:
   ```python
   try:
       db.commit()
   except IntegrityError as err:
       db.rollback()
       if err.orig.args[0] == 1452:
           raise HTTPException(400, "Referenced part does not exist") from err
       raise
   ```

**Commit:** `feat(api): add build create and read endpoints`

## Task 2.3 — Update and delete (test first)

1. **Tests:**
   - PUT returns 204; a GET afterwards shows the new values and that unset part IDs are now `null` (full replace).
   - PUT and DELETE on a missing ID return 404.
   - PUT with a part ID that doesn't exist returns 400.
   - DELETE returns 204, and a GET afterwards returns 404.
2. **PUT:**
   - Fetch the build (404 if it's missing).
   - `for key, value in payload.model_dump().items(): setattr(build, key, value)`
   - Call `_commit(db)`.
   - The decorator has `status_code=204`, and the handler returns `None`.
3. **DELETE:** fetch the build (404 if it's missing), `db.delete(build)`, `_commit(db)`.

**Verify:** the tests pass, and you can run through the full CRUD flow by hand in `/docs`.
**Commit:** `feat(api): add build update and delete endpoints`
**Open PR 2.**

---

# Phase 3 — Compatibility (`api-compatibility`, ~250 lines)

## Task 3.1 — `is_trout` migration

**Files:** `api/migrations/014_leader_trout.sql` (new), `api/app/parts/models.py`

1. The SQL from the spec, with a header comment in the same style as the other migrations.
2. On `Leader`, add `is_trout: Mapped[bool]`.
3. Run `uv run python -m app.migrate` against the dev DB. Then confirm: `SELECT id, name FROM leaders WHERE NOT is_trout` returns exactly IDs 11, 12 and 13.

**Commit:** `feat(db): flag non-trout leaders with is_trout`

## Task 3.2 — Compatible-parts endpoint (test first)

**Files:** `api/app/compatibility/__init__.py`, `api/app/compatibility/schemas.py`, `api/app/compatibility/router.py`, `api/app/main.py`, `api/tests/test_compatibility.py`

1. **Tests:** the boundary cases from the spec, using a weight-5 rod.
   - Assert with `in` and `not in` on the IDs you inserted, because seeded parts will also appear in the lists.
   - Leaders: create one with `is_trout=True` and one with `False`.
   - A missing rod returns 404.
2. `CompatibleParts(CamelModel)` with `reel`, `line` and `leader`, each `list[int]`.
3. The router uses `prefix="/rods"` and `GET /{rod_id}/compatible-parts`. It runs three `db.scalars(select(X.id).where(...)).all()` queries.

**Commit:** `feat(api): serve rod compatibility from the API`

## Task 3.3 — Frontend swap (paired)

**Files:** `src/features/builder/api/compatibility.ts` (new), `src/features/builder/components/BrandPartsPage.tsx`, `src/features/builder/utils/compatibility.ts` (delete)

1. `fetchCompatibleParts(rodId: number, signal?)` calls `apiFetch<{ reel: number[]; line: number[]; leader: number[] }>` and returns `Partial<Record<ComponentType, Set<number>>>`.
2. In `BrandPartsPage`:
   - Use `useEffect` on `rod?.dbId` and an `AbortController`, following the same pattern as `BuilderLayout`. Store the result in state.
   - `fitsRod(p, rod)` becomes `compatible?.[component.type]?.has(p.dbId) ?? false`.
   - When the request fails, show no highlights and log the error. A failed highlight must not break the page.
3. Delete `utils/compatibility.ts`. Also update the export in `index.ts` if it re-exports the file.

**Verify:**
- `pnpm exec tsc -b && pnpm lint`.
- In the browser, with a 5-weight rod selected, the reels, lines and leaders highlighted match the ones highlighted before the change. Compare against `main`.

**Commit:** `feat(builder): highlight compatible parts from the API`
**Open PR 3.**

---

# Phase 4 — Cutover (`api-cutover`)

## Task 4.1 — Remove Express

1. Delete `server/` and `tsconfig.server.json`. Remove its reference from `tsconfig.json` if there is one.
2. `pnpm remove express mysql2 zod @types/express`
3. In `package.json`, delete `dev:server` and `start:server`, and set `"db:migrate": "cd api && uv run python -m app.migrate"`.
4. Update the Express references in `vite.config.ts`, the root `README.md`, `src/lib/api.ts` and `src/features/builder/api/parts.ts`. To find them: `grep -rn -i "express\|server/" --exclude-dir=node_modules .`

**Verify:**
- `pnpm exec tsc -b && pnpm lint && pnpm build`.
- `pnpm db:migrate` prints "up to date".
- `uv run pytest` passes.
- The whole app works with only `pnpm dev` and `uv run fastapi dev` running.

**Commit:** `chore: remove the Express server`
**Open PR 4.**

---

## Risks

- **Python 3.14 and the PyMySQL wheels:** already working, since `/health` passes, so this risk is low.
- **Savepoint mode and `IntegrityError`:** a failed flush inside a savepoint should roll back only the savepoint. If the 400 test leaves the session unusable, check that `_commit` calls `db.rollback()` before raising.
- **Test speed:** `DROP` plus all migrations runs once per session. If it gets slow, it's still correct. Only optimize if it actually hurts.
