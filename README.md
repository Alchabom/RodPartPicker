# RodPartPicker

A capstone project: a PCPartPicker-style web app for building fly fishing setups. Pick a rod, reel, line, leader and tippet, see the total price, and find out whether the parts work together.

## Features

- **Build a setup:** choose one part per component and browse by brand. Your build is saved in the browser.
- **Compatibility highlights:** parts pages highlight the parts that fit the rest of your build. A highlighted part never causes a warning.
- **Build warnings:** the build page flags mismatches in line weight, tippet size and fresh or salt water. Warnings are advice and never stop you from choosing a part.
- **Line recommendations:** lines heavier than standard for their weight are recommended for fast-action rods.

The Products and Completed Builds pages aren't built yet. The API can already save builds, but the frontend doesn't use that yet. A questionnaire that recommends parts for fresh or salt water is planned.

## Tech stack

| Area | Tools |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, React Router, Tailwind CSS, shadcn/ui |
| API | FastAPI, SQLAlchemy 2, PyMySQL, Python 3.14 |
| Database | MySQL 8, with plain SQL migrations |
| Tooling | pnpm, uv, oxlint, ruff, pytest |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 24 and [pnpm](https://pnpm.io/)
- [uv](https://docs.astral.sh/uv/), which also installs Python 3.14
- [MySQL Server](https://dev.mysql.com/downloads/mysql/) 8.0.16 or later

### Setup

1. Copy `.env.example` to `.env` and set `DB_PASSWORD` to your MySQL password. Never commit `.env`.
2. Install the dependencies:
   ```sh
   pnpm install
   cd api && uv sync && cd ..
   ```
3. Create the database and load the catalog:
   ```sh
   pnpm db:migrate
   ```

### Running

Use two terminals:

```sh
# Terminal 1: API on http://localhost:3001
cd api
uv run fastapi dev app/main.py --port 3001

# Terminal 2: app on http://localhost:5173
pnpm dev
```

Open <http://localhost:5173>. To check the connection, <http://localhost:5173/api/health> should return `{"api":"ok","db":"ok"}`. If it says `"db":"unreachable"`, MySQL isn't running or `.env` is wrong.

The interactive API docs are at <http://localhost:3001/docs>.

## Commands

Run these from the repo root:

| Command | What it does |
|---|---|
| `pnpm dev` | Start the frontend with hot reload |
| `pnpm build` | Type-check and build for production |
| `pnpm lint` | Lint the frontend with oxlint |
| `pnpm preview` | Serve the production build |
| `pnpm db:migrate` | Apply any new database migrations |

Run these from `api/`:

| Command | What it does |
|---|---|
| `uv run pytest` | Run the API tests |
| `uv run ruff check .` | Lint the API |
| `uv run ruff format .` | Format the API |

The tests use a separate `rodpartpicker_test` database, which they drop and rebuild on each run, so your MySQL user needs permission to create databases. Your development data isn't touched. The frontend has no test runner yet.

## API

All routes start with `/api`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | API and database status |
| GET | `/parts/{rod,reel,line,leader,tippet}` | List a component's parts |
| GET, POST | `/builds` | List or create saved builds |
| GET, PUT, DELETE | `/builds/{id}` | Read, replace or delete a saved build |
| GET | `/compatibility/parts` | Parts that fit the selected build |
| GET | `/compatibility/check` | Warnings for the selected build |

Both compatibility routes take any of `rodId`, `reelId`, `flyLineId`, `leaderId` and `tippetId`. `/compatibility/parts` also takes `water=fresh` or `water=salt`.

## Project structure

```text
api/                  FastAPI app
  app/
    builds/           Saved builds
    compatibility/    Compatibility rules and endpoints
    parts/            Parts catalog
  migrations/         Numbered SQL migrations
  tests/              pytest suite
docs/                 Architecture, database and design records
src/
  components/         Shared components, including shadcn/ui
  features/builder/   The builder feature
  lib/                Shared utilities and the API client
  routes/             App routes
```

The frontend is organized by feature. Each feature in `src/features/` exposes its public API through an `index.ts`, and features don't import from each other.

## Documentation

- [Frontend architecture guidelines](docs/architecture_guidelines.md)
- [Database design record](docs/database/schema-design.md), including the compatibility rules
- [Seed data notes](docs/database/seed-data-notes.md)
- [API setup and migrations](api/README.md)
- [Design specs](docs/superpowers/specs/) and [implementation plans](docs/superpowers/plans/)
