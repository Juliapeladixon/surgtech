# Surgical Preference Cards API

Django REST API for the Xyten Technologies *Surgical Preference Cards* database (v1.3).
Covers all 13 tables, account creation, and token login.

> **No security yet, by design.** Every data endpoint is open (no login required), CORS allows
> all origins and `DEBUG` is on. See the "Security still to do" section of
> [API_DOCUMENTATION.md](API_DOCUMENTATION.md) before deploying anywhere real.

## Quick start

```bash
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

python manage.py migrate
python manage.py seed_sample_data        # fictional demo data (add --reset to wipe and reload)
python manage.py runserver
```

| URL | What |
|---|---|
| http://127.0.0.1:8000/api/ | Route index (browsable) |
| http://127.0.0.1:8000/api/docs/ | Swagger UI (generated, try-it-out) |
| http://127.0.0.1:8000/api/schema/ | OpenAPI schema |
| http://127.0.0.1:8000/admin/ | Django admin (log in as `superadmin`) |

All seeded users share the password **`Theatre#2026`**
(`superadmin`, `admin_chipo`, `editor_tendai`, `scrub_farai`, `viewer_rudo`).

Full route list, request bodies, responses and error messages: **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)**.

## Try it

```bash
# sign in
curl -X POST http://127.0.0.1:8000/api/auth/login/ -H "Content-Type: application/json" \
     -d '{"username":"editor_tendai","password":"Theatre#2026"}'

# search cards
curl "http://127.0.0.1:8000/api/cards/?search=lap+chole"
```

## Tests

```bash
python manage.py test cards        # 23 tests
```

## PostgreSQL

SQLite is used by default. For PostgreSQL: `pip install "psycopg[binary]"` and set
`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` before running.

## Layout

```
config/                  settings, root urls
cards/models.py          your models (unchanged)
cards/serializers.py     request/response shapes and validation
cards/views.py           auth views + viewsets (soft delete, restore, card actions)
cards/urls.py            all routes
cards/exceptions.py      uniform error format
cards/management/commands/seed_sample_data.py
cards/tests.py
```
