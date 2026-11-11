# Rate limiting for login codes

`POST /api/auth/code` sends a real email for every request. That costs money
(Resend) and lands in a real person's inbox, so the endpoint is rate limited.
The code lives in `api/app/auth/rate_limit.py` (`retry_after`) and is called
from `request_code` in `api/app/auth/router.py`. The design spec's
"`POST /code`" section (`docs/superpowers/specs/2026-11-09-auth-design.md`)
records the rules; this page explains how they fit together.

## The three limits

| Limit | Scope | Stops |
|---|---|---|
| 60 s cooldown | per email | button mashing, clients stuck in a retry loop |
| 5 codes per hour | per email | steady spam aimed at one person's inbox |
| 20 codes per hour | per IP | one machine sending codes to many addresses |

The checks run in that order, and the first one that applies wins. A second
request 20 s after the first gets `Retry-After: 40`, not an hourly wait.

## No counters: `login_codes` is the record

There is no separate counter (no Redis, no in-memory dict). Every code sent is
already a `login_codes` row with `email`, `requester_ip` and `created_at`, so
"how many codes in the last hour?" is a `COUNT` over existing rows.

- It works across workers and restarts. Every process reads the same table,
  whereas an in-memory counter would reset on each deploy and differ per
  process.
- Nothing can drift. There is no second copy of the data to keep in sync.
- It's cheap. Migration `016_auth.sql` indexes `(email, created_at)` and
  `(requester_ip, created_at)`, which match the queries exactly, so each check
  is an index range scan.

## Where it sits in `POST /code`

```
normalize email -> delete rows older than 24 h -> commit
  -> retry_after(db, email, ip, now)
       int  -> 429, Retry-After: <int>
       None -> mark this email's old codes consumed
            -> insert new row -> send email
                 ok   -> commit   -> 202
                 fail -> rollback -> 503
```

- `retry_after` only reads. Once a request passes, the row the route inserts
  counts against the next request.
- A failed send isn't counted. The rollback removes the inserted row, so
  nobody gets a cooldown because the email provider was down.
- Consumed codes still count. Asking for a new code replaces the old one, but
  that request still cost an email, so `retry_after` never filters on
  `consumed_at`.
- Deleting rows older than 24 h is safe, because the longest window is one
  hour and those rows can never affect a decision.

## Cleanup and locking

MySQL's default isolation level (REPEATABLE READ) keeps the locks a statement
takes until its transaction commits. The 24 h cleanup is a range `DELETE`, so
two things keep it from blocking other sign-ins:

- **It's committed on its own,** before the rate-limit check. If it shared the
  transaction that sends the email, its locks would be held through the Resend
  call (up to a 10 s timeout), and every other `/code` and `/verify` would
  queue behind one slow send.
- **`created_at` has its own index** (migration `018`). Without it, the
  `DELETE` scans and locks every row in `login_codes`; with it, only the
  expired rows.

A failed send still rolls back everything after the cleanup, so it still
doesn't count against the limits.

## How the wait is computed

The limits use a sliding window: "the 60 minutes before now", not "this clock
hour".

- Cooldown: the wait ends at the newest code's `created_at` + 60 s.
- Hourly limits: the wait ends when the oldest row in the window turns one hour
  old. At that point the count drops below the limit.

The wait is rounded **up** to whole seconds (`math.ceil`), so a client that
waits exactly `Retry-After` seconds won't be blocked by that same limit again.
A different limit can still apply: passing the per-email limit doesn't clear
the per-IP one.

## Inputs come from dependencies

- `now` comes from `get_now` (naive UTC, matching the `DATETIME` columns).
  `retry_after` never reads the clock itself, which lets tests use `FakeClock`
  to jump ahead 61 s instead of sleeping.
- `ip` comes from `get_client_ip`. It trusts `X-Forwarded-For` only when
  `TRUST_PROXY_HEADERS` is on (behind our own proxy). Otherwise a client could
  put a fake address in the header and get a fresh 20-per-hour allowance with
  every request.

## Known limits

These are accepted trade-offs for this project.

- **A small race.** Two requests for the same email arriving within
  milliseconds can both pass the check before either inserts its row, so one
  extra code gets through. Closing that gap would need a lock or an atomic
  counter, which is overkill when the worst case is one extra email.
- **IP limits are blunt.** Everyone behind one school or office NAT shares a
  single allowance of 20, and an attacker with many IPs gets around the limit.
  The per-email limit still protects each inbox.
- **This only covers `/code`.** Code guessing at `/verify` is limited
  separately, by the 5-attempt `attempts` counter on each code.

## Tests

`api/tests/test_auth_code.py` covers the cooldown (`Retry-After: 40`), the
sixth code for one email, the 21st code for one IP, and the rule that a failed
send doesn't count.
