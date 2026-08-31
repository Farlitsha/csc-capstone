# Legacy prototype (not used by the running app)

This folder holds an earlier server-rendered prototype (FastAPI + Jinja2
templates) that predates the current architecture: a FastAPI + MySQL
**backend** (`backend/`) paired with a **React/Vite frontend** (`frontend/`),
wired together by the root `docker-compose.yml`.

Nothing in here is referenced by `docker-compose.yml`, `backend/`, or
`frontend/` — it's kept only for reference/history.

Contents:
- `app.py` — the old FastAPI app serving Jinja2 templates directly
- `translations.py` — translation helper used by `app.py`
- `templates/` — the Jinja2 HTML templates (home, login, register, adverts, etc.)
- `static/` — CSS and images used by those templates

If you ever need to run this prototype standalone, do so from inside this
`legacy/` folder (`uvicorn app:app`) since `templates` and `static` are
referenced as relative paths.
