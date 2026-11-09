# Auth Design

**Date:** 2026-11-09
**Updates:** D4 in `docs/database/schema-design.md` (users move from "later" to now)
**Followed by:** a separate spec for owned builds and the public catalog

## Goal

Give RodPartPicker real user accounts so a later spec can attach builds to their owners and publish a catalog. Users sign in with a one-time code sent to their email, with no passwords. The team will present the implementation, so each security decision below records its reason.

## Success criteria

- A visitor can enter an email, receive a 6-digit code, and be signed in. The first sign-in creates the account.
- A new user picks a unique display name before using any page that requires sign-in.
- A session lasts up to 30 days of inactivity without re-entering a code, and logout ends it on the server.
- A reused refresh token revokes its whole token family, except during the 30-second multi-tab grace window.
- Codes, refresh tokens and rate-limit state live in MySQL only, never in process memory, so the API can run as serverless functions.
- Every row of the test table in "Testing" has a passing pytest case.
- `uv run pytest`, `pnpm exec tsc -b` and `pnpm lint` pass.
- Each PR is under 500 lines, excluding pure deletions.

## Out of scope

- `builds.user_id`, build ownership checks, the public/private flag and the catalog page. These go in spec 2.
- Deployment: Vercel project setup, TiDB Cloud provisioning, a domain and Resend domain verification. These get their own small spec.
- OAuth ("Sign in with Google"), passwords and multi-factor authentication.
- Changing your email address, deleting your account and profile pages.
- A "log out everywhere" button. The data model supports it, but no route is added.

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Who builds auth | The team, in FastAPI, on PyJWT plus the standard library (`secrets`, `hmac`, `hashlib`) | The app already uses MySQL, while Supabase would mean a second, Postgres-based backend. The team built its own API to learn (D11), and the cryptography still comes from vetted code |
| Credential | Email one-time codes, no passwords | Any password system still needs email for resets, so passwords only add attack surface (guessing, credentials reused from other sites) and extra flows (reset, change, strength rules). With codes, nothing long-lived is stored |
| Session | Short-lived access JWT plus a refresh token that's replaced on every use, both in httpOnly cookies | The access JWT is checked without a DB lookup. The refresh token makes sessions revocable and lets the server spot stolen tokens. httpOnly means injected scripts can't read either token |
| Display name | Unique, case-insensitive, chosen after first sign-in | The catalog needs a public author name, and emails must stay private. Uniqueness lets names back profile URLs later |
| Origin | The browser only ever calls `/api` on its own origin (Vite proxy in dev, the same Vercel project in prod) | First-party cookies: no third-party cookie blocking, and `SameSite=Lax` works |
| State | Nothing kept in process memory | Serverless instances come and go, so rate limits come from counting `login_codes` rows |
| Email | An `EmailSender` interface: a console sender for dev, Resend in prod | Development needs no domain or API key, and tests read the codes from a fake sender |
| Frontend session state | Shared code (`src/hooks/auth/`), not the auth feature | Spec 2's builder and catalog features both need it, and features can't import from each other |

## Data model

Migration `api/migrations/016_auth.sql`. All timestamps are UTC `DATETIME` values set by Python (see "Time").

**`users`**

| Column | Type | Notes |
|---|---|---|
| `id` | `INT UNSIGNED AUTO_INCREMENT` PK | |
| `email` | `VARCHAR(254) NOT NULL UNIQUE` | Lowercased and trimmed before storage |
| `display_name` | `VARCHAR(30) NULL UNIQUE`, `COLLATE utf8mb4_0900_ai_ci` | `NULL` until onboarding. The collation is set explicitly, so "TroutBum" and "troutbum" collide on both MySQL and TiDB (TiDB's default collation may be case-sensitive) |
| `created_at` | `DATETIME NOT NULL` | |

**`login_codes`**

| Column | Type | Notes |
|---|---|---|
| `id` | `INT UNSIGNED AUTO_INCREMENT` PK | |
| `email` | `VARCHAR(254) NOT NULL` | An email, not a `user_id`, because on first sign-in the user doesn't exist yet |
| `code_hash` | `CHAR(64) NOT NULL` | Hex HMAC-SHA256 of the code, keyed with `CODE_HMAC_SECRET`. A plain hash of a 6-digit code could be reversed by trying all 10⁶ values |
| `attempts` | `TINYINT UNSIGNED NOT NULL DEFAULT 0` | Wrong guesses |
| `requester_ip` | `VARCHAR(45) NOT NULL` | Long enough for IPv6 |
| `expires_at` | `DATETIME NOT NULL` | `created_at` + 10 minutes |
| `consumed_at` | `DATETIME NULL` | Set when the code is used, replaced or exhausted |
| `created_at` | `DATETIME NOT NULL` | |

Indexes: `(email, created_at)` and `(requester_ip, created_at)`, for the rate-limit counts and for looking up the latest code.

**`refresh_tokens`**

| Column | Type | Notes |
|---|---|---|
| `id` | `INT UNSIGNED AUTO_INCREMENT` PK | |
| `user_id` | `INT UNSIGNED NOT NULL`, FK → `users(id)` `ON DELETE CASCADE` | |
| `family_id` | `CHAR(36) NOT NULL` | A UUID shared by a sign-in's first token and every token that replaces it |
| `token_hash` | `CHAR(64) NOT NULL UNIQUE` | Hex SHA-256 of the token. A plain hash is enough here because the token is 256 random bits |
| `expires_at` | `DATETIME NOT NULL` | Issue time + 30 days |
| `revoked_at` | `DATETIME NULL` | Set when the token is replaced, logged out or revoked with its family |
| `created_at` | `DATETIME NOT NULL` | |

Index: `(family_id)`.

**Access tokens are not stored.** They're HS256 JWTs signed with `JWT_SECRET`, with the claims `sub` (the user ID as a string) and `exp` (15 minutes). Decoding pins `algorithms=["HS256"]`, so a token with `alg: none` or any other algorithm is rejected.

## API

### Module layout: `api/app/auth/`

| File | Responsibility |
|---|---|
| `models.py` | `User`, `LoginCode` and `RefreshToken` SQLAlchemy models, mapped onto the migration's tables |
| `schemas.py` | `CodeRequestIn`, `VerifyIn`, `DisplayNameIn`, `UserOut` (`CamelModel`) |
| `codes.py` | `generate_code()` (`secrets.randbelow(10**6)`, zero-padded to 6 digits), `hash_code(email, code)`, `codes_match(hash, email, code)` using `hmac.compare_digest` |
| `tokens.py` | `issue_access_token(user_id, now)`, `decode_access_token(token, now)`, `issue_refresh_token(db, user_id, family_id, now)`, `rotate_refresh_token(db, raw, now)`, `revoke_family(db, family_id, now)` |
| `email.py` | `EmailSender` protocol with `send_login_code(to, code)`, plus `ConsoleEmailSender` (logs the code), `ResendEmailSender` (calls Resend's HTTP API with `httpx`) and the `get_email_sender` dependency, which `EMAIL_BACKEND` selects |
| `deps.py` | `get_now`, `get_client_ip`, `CurrentUserId` |
| `cookies.py` | `set_auth_cookies(response, access, refresh)` and `clear_auth_cookies(response)` |
| `router.py` | The routes below |

The origin check is middleware registered in `app/main.py`.

### Routes (prefix `/api/auth`)

| Route | Body | Success | Failures |
|---|---|---|---|
| `POST /code` | `{email}` | `202 {}` | `422` invalid email; `429` + `Retry-After`; `503` send failed |
| `POST /verify` | `{email, code}` | `200 UserOut` + both cookies set | `400 "Invalid or expired code"`; `422` malformed body |
| `POST /refresh` | none (cookie) | `200 UserOut` + both cookies replaced | `401` |
| `POST /logout` | none (cookie) | `204` + both cookies cleared | none (idempotent) |
| `GET /me` | none | `200 UserOut` | `401` |
| `PUT /me` | `{displayName}` | `200 UserOut` | `401`; `409 "Display name taken"`; `422` pattern mismatch |

`UserOut` is `{id, email, displayName}`, where `displayName` may be `null`.

### `POST /code`

1. Normalize the email (trim, lowercase) and validate it with pydantic `EmailStr`. `email-validator` already comes with `fastapi[standard]`.
2. Delete `login_codes` rows older than 24 hours.
3. Rate limits, counted from `login_codes`:
   - The newest code for this email is under 60 seconds old → `429`, with `Retry-After` set to the remaining seconds.
   - The email has 5 or more codes in the last hour → `429`, with `Retry-After` set to when the oldest of those rows turns one hour old.
   - The IP has 20 or more codes in the last hour → `429`, with `Retry-After` computed the same way.
4. Mark this email's unconsumed codes as consumed, so only the newest code works.
5. Insert the new code row, then send the email, then commit. If sending raises, roll back and return `503 "Couldn't send the code, try again"`. A failed send doesn't count against the rate limit.
6. Return `202`, whether or not an account exists for the email. The response never reveals which emails are registered.

### `POST /verify`

1. Normalize the email and select the newest unconsumed, unexpired code for it with `SELECT … FOR UPDATE`, so concurrent guesses can't overrun the attempt cap.
2. No code, or the HMAC doesn't match: add 1 to `attempts`. When `attempts` reaches 5, set `consumed_at`. Return `400 "Invalid or expired code"`. All failure cases share that one message.
3. Match: set `consumed_at`, find or create the `User`, issue an access token and a refresh token (with a new `family_id`), set the cookies and return `UserOut`.

### `POST /refresh`

1. Read the `refresh_token` cookie. Missing → `401`.
2. Select the token by `token_hash` with `SELECT … FOR UPDATE`. Without the lock, two simultaneous refreshes could both replace the same token and leave two live tokens in one family.
3. The token is unknown or expired → `401`.
4. The token is revoked:
   - `revoked_at` is less than 30 seconds ago **and** the family still has a live token (unrevoked and unexpired) → `401` and change nothing. This is the multi-tab race: another tab just replaced the token, and the browser's shared cookie jar already holds the new one.
   - Otherwise → revoke every token in the family and return `401`. This is reuse detection: a replaced token came back outside the grace window, or after logout.
5. The token is valid: set its `revoked_at`, issue a new refresh token in the same family, issue a new access token, delete this user's expired refresh tokens, set the cookies and return `UserOut`.

During the grace window, an attacker replaying a stolen token gets a `401` and no new tokens. The window only means that replay doesn't trigger family revocation.

### `POST /logout`

If the `refresh_token` cookie maps to a token, revoke its family. Always clear both cookies and return `204`.

### `PUT /me`

`displayName` must match `^[A-Za-z0-9_]{3,30}$`. An `IntegrityError` on the unique index → `409`. A user can change the name later through the same route.

### `CurrentUserId`

Reads the `access_token` cookie, decodes it with `decode_access_token` and returns `int(sub)` **without touching the database**. Skipping the DB lookup is what the access JWT buys. A missing, expired, tampered or wrong-algorithm token returns `401` with no reason given. Routes that need the user row (`GET`/`PUT /me`) load it by primary key and return `401` if it's gone. Account deletion is out of scope, so in practice it never is.

### Cookies

| Cookie | Path | Max-Age | Flags |
|---|---|---|---|
| `access_token` | `/api` | 15 min | `HttpOnly`, `SameSite=Lax`, `Secure` when `COOKIE_SECURE` |
| `refresh_token` | `/api/auth` | 30 days | `HttpOnly`, `SameSite=Lax`, `Secure` when `COOKIE_SECURE` |

The refresh cookie's narrower `Path` means the browser sends it only to `/refresh` and `/logout`. Ordinary API requests never carry it, so it travels over the network far less often.

### CSRF

- **`SameSite=Lax`:** a `POST`, `PUT` or `DELETE` started by another site arrives without cookies, so it's treated as anonymous.
- **Origin middleware (defense in depth):** for every `POST`, `PUT`, `PATCH` and `DELETE` under `/api`, the `Origin` header must equal `APP_ORIGIN`, or the request gets `403 "Origin not allowed"`. A missing `Origin` header is also rejected. Browsers send `Origin` on these methods, and the test client sends it by default.
- **`GET` routes never change state.** `Lax` still sends cookies on cross-site top-level `GET` navigations.

### Time

`get_now()` returns `datetime.now(UTC)` without its timezone info, so it matches the naive UTC `DATETIME` columns. Every expiry, rate-limit window and grace-window check uses its value, and tests override it.

### Client IP

`get_client_ip` returns the first address in `X-Forwarded-For` when `TRUST_PROXY_HEADERS` is true (in prod behind Vercel). Otherwise it returns `request.client.host`. Any client can set that header, so trusting it without a proxy in front would let an attacker dodge the per-IP limit by inventing addresses.

### Settings (`app/config.py`, `.env.example`)

| Setting | Default | Notes |
|---|---|---|
| `JWT_SECRET` | required | At least 32 random bytes |
| `CODE_HMAC_SECRET` | required | Separate from `JWT_SECRET`, so leaking one doesn't expose the other |
| `APP_ORIGIN` | `http://localhost:5173` | The single allowed origin |
| `COOKIE_SECURE` | `true` | `false` in dev and tests (plain http) |
| `TRUST_PROXY_HEADERS` | `false` | `true` in prod |
| `EMAIL_BACKEND` | `console` | `console` or `resend` |
| `RESEND_API_KEY` | `""` | Required when `EMAIL_BACKEND=resend` |
| `EMAIL_FROM` | `RodPartPicker <onboarding@resend.dev>` | Resend's test sender until a domain is verified |

New dependency: `pyjwt`.

## Frontend

### `src/lib/api.ts`

- Add `ApiError extends Error` with `status: number` and `detail: unknown` (the parsed JSON body, if any). `apiFetch` throws it for every non-OK response.
- On a `401` from a path that doesn't start with `/auth/`:
  1. Call `POST /api/auth/refresh` through a module-level `refreshPromise`. Concurrent callers wait on the same promise, and it resets once settled.
  2. The refresh succeeded → retry the original request once and return its result, or throw its error.
  3. The refresh failed → notify the `onSessionExpired` listeners and throw the original `401` as an `ApiError`.
- Export `onSessionExpired(listener): () => void`, which returns an unsubscribe function.

### `src/hooks/auth/` (shared)

- `authContext.ts`: an `AuthContext` holding `{status: 'loading' | 'anonymous' | 'authenticated', user: User | null, setUser, signOut}`.
- `AuthProvider.tsx`:
  - On mount it calls `GET /api/auth/me`, which refreshes silently if the access token has expired. Success sets `authenticated` and failure sets `anonymous`.
  - It subscribes to `onSessionExpired` to switch to `anonymous`.
  - `signOut` calls `POST /auth/logout`, then switches to `anonymous`.
- `useAuth.ts`: reads the context and throws if used outside the provider.
- `index.ts`: the barrel, imported as `@hooks/auth`.

`main.tsx` wraps the app in `AuthProvider`, outside `BuildProvider`.

### `src/features/auth/` (screens)

| File | Responsibility |
|---|---|
| `api/auth.ts` | `requestCode(email)`, `verifyCode(email, code)`, `updateDisplayName(name)` |
| `components/LoginPage.tsx` | Step 1: an email form that always moves to step 2 on `202` and says "Check your email". Step 2: a code input (`inputMode="numeric"`, `autoComplete="one-time-code"`, `maxLength={6}`); a "Resend code" button that becomes active after 60 seconds; `429` → "Try again in N seconds" from `Retry-After`; `400` → "That code is wrong or expired". After verifying: `setUser`, then go to `/welcome` if `displayName` is null, otherwise to `next` or `/` |
| `components/DisplayNamePage.tsx` | Checks the name pattern before submitting; `409` → "That name is taken"; success → `next` or `/` |
| `components/RequireAuth.tsx` | `loading` → nothing shown; `anonymous` → `/login?next=<path>`; signed in without a display name → `/welcome` (except on `/welcome` itself) |
| `components/UserMenu.tsx` | Signed out: a "Log in" link. Signed in: the shadcn dropdown with the display name and "Log out" |
| `index.ts` | The barrel |

A `next` value is used only if it starts with `/` and not `//`, so no one can craft a login link that redirects to another site.

### Routes (`src/routes/AppRoutes.tsx`)

- Add `/login` (`LoginPage`) and `/welcome` (`DisplayNamePage` inside `RequireAuth`).
- Replace the navbar's mock user button and its `alert()` with `UserMenu`.
- No existing route gets `RequireAuth`. Spec 2 adds it to the save-build and "my builds" routes.

## Testing

### Fixtures (`api/tests/conftest.py`)

- `client`: as now, and it also sends `Origin: <APP_ORIGIN>` by default.
- `fake_email`: overrides `get_email_sender` and records `(to, code)` in `fake_email.sent`.
- `clock`: overrides `get_now` with a settable time, starting at a fixed datetime, with `clock.advance(seconds=…)`.
- `make_user(**columns)`: a factory in the same style as `make_build`.
- `login(client, fake_email, email)`: runs `/code` and `/verify` and leaves the cookies in the client.
- Tests run with `COOKIE_SECURE=False`, because `TestClient` uses plain http.

### Cases

| Area | Cases |
|---|---|
| `codes.py` | Codes are always 6 digits, zero-padded; `codes_match` accepts the right code and rejects a wrong code and a different email |
| `tokens.py` | An issued access token decodes to its user; expired → error; tampered signature → error; `alg: none` → error; `HS512` → error |
| Request a code | `202` for both new and existing emails; email stored lowercased and trimmed; a new code consumes the previous one; under 60 s → `429` with the right `Retry-After`; 6th in an hour per email → `429`; 21st per IP → `429`; send failure → `503` with no row stored; rows older than 24 h deleted |
| Verify a code | Correct code → `200`, cookies set, user created; existing user → no duplicate; wrong code → `400` and `attempts` goes up; 5th wrong guess consumes the code, so the right code then fails; expired → `400`; consumed → `400`; the stored `code_hash` isn't the raw code |
| Current user | `GET /me` with valid cookies → `200`; no cookie, expired or tampered → `401` |
| Refresh | Valid → new cookies, and the old token no longer works; reuse within 30 s while the family is live → `401` and the family stays live; reuse after 30 s → family revoked; reuse after logout → `401`; expired → `401`; missing → `401` |
| Logout | Revokes the family and clears the cookies; a second call → `204` |
| Display name | Set → `200`; taken with different case → `409`; `"ab"` and `"bad name!"` → `422`; without a login → `401` |
| CSRF | `POST /api/auth/code` with `Origin: https://evil.example` → `403`; with no `Origin` → `403` |
| Client IP | `X-Forwarded-For` is ignored when `TRUST_PROXY_HEADERS` is false and used when it's true |

The frontend has no test runner. It's checked with `tsc -b`, `pnpm lint` and a manual pass through the flow: sign in with a code from the API console, choose a display name, reload (the session should survive), wait out or clear the access cookie (a silent refresh should happen) and log out.

## PR breakdown

Each PR stacks on the previous one. Per our working agreement, Omar writes the models, schemas and routes, and Claude writes the fixtures and tooling, writes each PR's tests first and reviews.

1. **Schema and settings:** `016_auth.sql`, `auth/models.py`, the new settings, `pyjwt`, `test_models.py` cases, and updating D4 in `docs/database/schema-design.md`.
2. **Primitives:** `codes.py`, `tokens.py`, `email.py`, `cookies.py`, `deps.py`, plus their unit tests and the `clock`/`fake_email` fixtures.
3. **Sign-in:** `POST /code`, `POST /verify`, `GET`/`PUT /me`, the origin middleware, and their tests.
4. **Sessions:** `POST /refresh` (rotation, grace window, family revocation), `POST /logout`, and their tests.
5. **Frontend session:** `ApiError`, refresh-and-retry and `onSessionExpired` in `api.ts`; `src/hooks/auth/`; `AuthProvider` in `main.tsx`.
6. **Frontend screens:** `features/auth`, the routes and `UserMenu`.

PR 6 also adds the auth module and `src/hooks/auth` to `CLAUDE.md`.
