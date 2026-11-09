# RodPartPicker API

FastAPI + SQLAlchemy (sync, PyMySQL) over the MySQL database. Reads DB settings
from the repo-root `.env`.

Schema design and the reasoning behind it: [`docs/database/schema-design.md`](../docs/database/schema-design.md).

## First-time setup

1. Install **MySQL Server 8.0.16 or later** (MySQL Community Installer on
   Windows; Workbench alone is only a client). Note the root password.
2. Copy `.env.example` to `.env` at the repo root and fill in `DB_PASSWORD`,
   `JWT_SECRET` and `CODE_HMAC_SECRET` (generate each secret with the command
   in `.env.example`). `.env` is gitignored; never commit credentials.
3. From `api/`, run `uv sync`, then `uv run python -m app.migrate`. This creates
   the database and applies every file in `migrations/` that hasn't run yet.
   `pnpm db:migrate` at the repo root does the same.

## Running

```sh
cd api
uv sync                                       # first time / after pulling
uv run fastapi dev app/main.py --port 3001    # restarts on file changes
```

Run `pnpm dev` at the repo root as well; Vite proxies `/api` to port 3001.
Check `http://localhost:5173/api/health` for `{"api":"ok","db":"ok"}`.
`"db":"unreachable"` means MySQL isn't running or `.env` is wrong.
Interactive docs: `http://localhost:3001/docs`.

## Migrations

- **Never edit a migration that has been applied.** Add a new numbered file instead.
- MySQL commits DDL implicitly, so a migration that fails partway is not rolled
  back. Fix the file, drop what it created, and rerun.
