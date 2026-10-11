# RodPartPicker API

Express 5 + `mysql2` REST API backed by MySQL 8. Node runs the TypeScript
files directly (Node 24 type stripping), so there is no compile step for the
server. `tsc -b` (inside `pnpm build`) type-checks it via `tsconfig.server.json`.

Schema design and the reasoning behind it: [`docs/database/schema-design.md`](../docs/database/schema-design.md).

## First-time setup

1. Install **MySQL Server 8.0.16 or later** (MySQL Community Installer on
   Windows; Workbench alone is only a client). Note the root password.
2. Copy `.env.example` to `.env` at the repo root and fill in `DB_PASSWORD`.
   `.env` is gitignored; never commit credentials.
3. `pnpm install`
4. `pnpm db:migrate` creates the `rodpartpicker` database and applies every
   file in `server/db/migrations/` that hasn't run yet.

## Running

Two terminals:

```sh
pnpm dev:server   # API on http://localhost:3001, restarts on file changes
pnpm dev          # Vite on http://localhost:5173, proxies /api to the API
```

Check `http://localhost:5173/api/health`: `{"api":"ok","db":"ok"}` means
everything is connected. `"db":"unreachable"` means MySQL isn't running or
`.env` is wrong.

## Layout

```text
server/
├── db/migrations/     # numbered .sql files, applied in order, once each
├── scripts/migrate.ts # migration runner (records applied files in schema_migrations)
└── src/
    ├── index.ts       # starts the HTTP server
    ├── app.ts         # Express app: JSON body parsing, routers, error handler
    ├── env.ts         # validated environment variables
    ├── db.ts          # shared mysql2 connection pool
    └── routes/
        ├── parts.ts   # GET /api/parts/:category
        └── builds.ts  # /api/builds CRUD
```

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | API and database status |
| GET | `/api/parts/:category` | `rod`, `reel`, `line`, `leader` or `tippet`; variants joined with model and brand |
| GET | `/api/builds` | all builds, most recently updated first |
| GET | `/api/builds/:id` | one build |
| POST | `/api/builds` | body `{ name, rodId?, reelId?, flyLineId?, leaderId?, tippetId? }` → `{ id }` |
| PUT | `/api/builds/:id` | same body; replaces the build |
| DELETE | `/api/builds/:id` | |

Invalid input returns `400` with zod's `issues`; a part id that doesn't exist
returns `400`; unknown ids return `404`.

## Conventions

- **Always use `?` placeholders.** Never build SQL by concatenating request
  values. `parts.ts` keeps a fixed query per category so the URL never
  touches the SQL text.
- **Validate every request body and param with zod** before it reaches the database.
- **Never edit a migration that has been applied.** Add a new numbered file instead.
- MySQL commits DDL implicitly, so a migration that fails partway is not
  rolled back. Fix the file, drop what it created, and rerun.
- SQL columns are `snake_case`; JSON is `camelCase` (aliased in the `SELECT`).

Front-end code calls the API through `apiFetch` in `src/lib/api.ts`.
