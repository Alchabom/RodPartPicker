# RodPartPicker API

FastAPI + SQLAlchemy (sync, PyMySQL) over the MySQL database. Replacing the
Express server in `server/`. Reads DB settings from the repo-root `.env`.

## Running

```sh
cd api
uv sync                                       # first time / after pulling
uv run fastapi dev app/main.py --port 3001    # restarts on file changes
```

Run `pnpm dev` at the repo root as well; Vite proxies `/api` to port 3001.
Check `http://localhost:5173/api/health` for `{"api":"ok","db":"ok"}`.
Interactive docs: `http://localhost:3001/docs`.
