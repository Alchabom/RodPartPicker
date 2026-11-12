# RodPartPicker API

FastAPI + SQLAlchemy (sync, PyMySQL) over the MySQL database. Reads DB settings
from the repo-root `.env`.

Schema design and the reasoning behind it: [`docs/database/schema-design.md`](../docs/database/schema-design.md).

## First-time setup

1. Install **MySQL Server 8.0.16 or later** (MySQL Community Installer on
   Windows; Workbench alone is only a client). Note the root password.
2. Copy `.env.example` to `.env` at the repo root and fill in `DB_PASSWORD`,
   `JWT_SECRET` and `CODE_HMAC_SECRET` (generate each secret with the command
   in `.env.example`; each must be at least 32 characters). Keep
   `COOKIE_SECURE=false` for local http. `.env` is gitignored; never commit
   credentials.
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

## After pulling

`.env` is gitignored, so pulling never changes yours. After you pull:

1. Compare your `.env` with `.env.example` and copy over any setting you're
   missing. Since auth landed, the ones that matter are `JWT_SECRET` and
   `CODE_HMAC_SECRET` (the API won't start without them, and names the missing
   one) and `COOKIE_SECURE=false` (without it Safari drops the session cookies
   on `http://localhost`, so you sign in and immediately look signed out).
2. Run `uv sync` in `api/` and `pnpm install` at the root if the lockfiles
   changed.
3. Run `pnpm db:migrate` to apply new migrations.
4. Restart the API. `fastapi dev` reloads on `.py` changes, not `.env` changes.

## Email (sign-in codes)

Sign-in is passwordless: `POST /api/auth/code` sends a 6-digit code, and
`EMAIL_BACKEND` picks how.

- **`console` (the default):** nothing is emailed. The code is printed in the
  API's terminal as `Login code for you@example.com: 123456`. This is all you
  need for local development.
- **`resend`:** emails the code through [Resend](https://resend.com).
  1. Create a free Resend account and an API key.
  2. In `.env`, set `EMAIL_BACKEND=resend` and `RESEND_API_KEY=re_...`.
  3. Restart the API.

  Each developer uses their own key; don't share one in chat or commit it.

**Who receives it.** The default `EMAIL_FROM` is Resend's shared test sender,
`onboarding@resend.dev`, which **only delivers to the email address of the
Resend account that owns the key**. Any other address is rejected and the login
page shows "Couldn't send the code, try again". To email anyone (teammates, a
demo audience), verify a domain you own in Resend by adding the DNS records it
lists, then set `EMAIL_FROM="RodPartPicker <login@yourdomain.com>"`.

**Rate limits.** Requesting codes is limited to one per minute and five per hour
per email, and 20 per hour per IP. While testing you'll hit "Try again in N
seconds"; that's the limiter, not a bug. See
[`docs/auth/rate-limiting.md`](../docs/auth/rate-limiting.md).

## Migrations

- **Never edit a migration that has been applied.** Add a new numbered file instead.
- MySQL commits DDL implicitly, so a migration that fails partway is not rolled
  back. Fix the file, drop what it created, and rerun.
