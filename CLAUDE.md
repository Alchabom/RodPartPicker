# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

RodPartPicker is a capstone project: a PCPartPicker-style web app for building fishing rods (current UI sections: Builder, Products, Completed Builds). It is an early-stage React 19 + TypeScript + Vite 8 SPA (react-router) backed by MySQL 8. The team is building its own REST API with FastAPI in `api/` (for the learning experience); it replaces the older Express 5 + mysql2 server in `server/`. The API has pytest tests; the frontend has no tests yet.

## Commands

- `npm run dev`: start the Vite dev server with HMR
- `npm run build`: type-check (`tsc -b`, project references) and then run a production build
- `npm run lint`: run oxlint (config in `.oxlintrc.json`: react, typescript and oxc plugins; `rules-of-hooks` is an error)
- `npm run preview`: serve the production build
- `cd api && uv run fastapi dev app/main.py --port 3001`: start the FastAPI API with auto-reload (Vite proxies `/api` to port 3001; run it alongside `npm run dev`). Run `uv sync` in `api/` first.
- `npm run dev:server`: start the legacy Express API on the same port (don't run both APIs at once)
- `cd api && uv run python -m app.migrate`: create the database and apply unapplied `api/migrations/*.sql` files (`npm run db:migrate` is the legacy Node runner over the same folder and `schema_migrations` table)
- `cd api && uv run pytest`: run the API tests. They drop, re-migrate and use a separate `TEST_DB_NAME` database, and each test's writes are rolled back.

The frontend has no test runner; `tsc -b` inside `npm run build` is its only type check.

Both `package-lock.json` and `pnpm-lock.yaml` are committed, but pnpm is the package manager actually in use (`node_modules/.pnpm`); install with `pnpm add`. `package-lock.json` is stale.

## Build notes

- The React Compiler runs through `@rolldown/plugin-babel` with `reactCompilerPreset()` (see `vite.config.ts`). It memoizes automatically, so don't add `useMemo`/`useCallback`/`React.memo` by hand unless profiling shows a need.
- Path aliases are defined in **two places** that must stay in sync: `resolve.alias` in `vite.config.ts` and `compilerOptions.paths` in `tsconfig.app.json`. The aliases are `@/*`, `@components`, `@features`, `@hooks`, `@styles`, `@utils` and `@types`, each pointing to the matching `src/` subdirectory. Note that `@types/*` can shadow npm `@types/` package names.
- Global CSS lives in `src/styles/` (`index.css` is imported in `main.tsx`, `App.css` in `App.tsx`). It does not live at the `src/` root, even though the architecture doc's tree shows it there.

## Architecture

The project uses a feature-based architecture. `docs/architecture_guidelines.md` is the source of truth; read it before adding modules. The key rules are:

- Each domain is a vertical slice in `src/features/<featureName>/`, with optional `api/`, `components/`, `hooks/`, `styles/`, `types/` and `utils/` subfolders and a **required `index.ts` barrel**. Code outside the feature imports only from the barrel (`@features/userProfile`), never from deep paths inside it.
- Features must not import from other features. Code that two or more features share moves to the global `src/components`, `src/hooks`, `src/utils`, `src/lib` (configured third-party clients), `src/types` or `src/routes`.
- Co-location comes first. Keep code in the file that uses it, then in the feature that uses it, and promote it to global only when two or more features need it.

Most of these directories don't exist on disk yet (git doesn't track empty folders). Create them as needed. `src/App.tsx` currently holds placeholder layout markup (navbar and sections) that should be split into features as they are built.

## Agent skills

`.agents/skills/` holds third-party agent skills that are pinned in `skills-lock.json`: brainstorming, frontend-design, grill-with-docs, improve-codebase-architecture and vercel-react-best-practices. The `vercel-react-best-practices` rules are useful for React performance guidance. Many of them are Next.js/server-oriented and don't apply to this client-only Vite app.

## API (FastAPI, `api/`)

`api/README.md` covers setup. FastAPI + SQLAlchemy 2 (sync, PyMySQL), Python 3.14, managed with `uv`; `ruff` is the dev linter.

- `app/config.py` loads DB settings with pydantic-settings from the repo-root `.env` (the same file the Express server uses).
- `app/db.py` holds the engine, `Base` (DeclarativeBase) and the `get_db` session dependency.
- All routes live under the `/api` prefix (`app/main.py`); `/api/health` checks the DB. Domain code goes in a package per resource (e.g. `app/parts/` with `models.py`, `schemas.py`, `router.py`).
- The schema is owned by the SQL migrations in `api/migrations/` (applied by `app/migrate.py`); SQLAlchemy models map onto those tables rather than creating them. Never edit an applied migration; add a new numbered file.

## Legacy server (Express, `server/`)

Being replaced by `api/`. `server/README.md` covers setup, endpoints and conventions; `docs/database/schema-design.md` records the schema decisions. Key points:

- Node 24 runs `server/**/*.ts` directly via type stripping: imports need `.ts` extensions and only erasable syntax is allowed (no enums or parameter properties). `tsconfig.server.json` type-checks it as part of `tsc -b`.
- DB credentials come from a gitignored root `.env` (template: `.env.example`).
- Always use `?` placeholders; validate request input with zod. SQL is `snake_case`, JSON is `camelCase` via `SELECT` aliases.
- Never edit an applied migration; add a new numbered file. The line tables are `fly_lines`/`fly_line_models` because `LINES` is reserved in MySQL.
