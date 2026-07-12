# LeaveOps

A full-stack employee leave management system with invite-based onboarding, role-based access control, real-time balance tracking, and a fully containerized deployment behind Nginx.

Built as a 3-week internship portfolio project. The goal was not just to make something that works, but to make something that survives a real security review — this repo went through a full audit pass covering authentication, authorization, input validation, rate limiting, and secrets handling, with every fix verified end-to-end rather than assumed.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Security](#security)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
  - [Option A: Docker Compose (recommended)](#option-a-docker-compose-recommended)
  - [Option B: Local development](#option-b-local-development)
- [Environment variables](#environment-variables)
- [First login / bootstrap superuser](#first-login--bootstrap-superuser)
- [API documentation](#api-documentation)
- [Known limitations](#known-limitations)
- [Roadmap ideas](#roadmap-ideas)

---

## Features

**Authentication & onboarding**
- JWT-based auth delivered via an `httpOnly`, `SameSite=Lax` cookie — never exposed to JavaScript, so a client-side XSS bug can't read or exfiltrate the session token the way it could with `localStorage`
- No public self-registration — HR invites employees by email
- Invite tokens are cryptographically random (`secrets.token_urlsafe(32)`), single-use, and expire automatically
- Real invite emails sent via Gmail SMTP with an activation link → set password → auto-login flow
- Full self-service password recovery: forgot-password request → real reset email → token-gated reset page → auto-login on success, using the same single-use, expiring token pattern as invites
- "Remember me" genuinely changes server-issued token lifetime (30 days vs. the default short session), not just a cosmetic checkbox
- Logout revokes the session cookie server-side (`delete_cookie`), not just a client-side "forget the token" instruction
- Deactivated accounts are blocked at both login and on every subsequent authenticated request, not just at sign-in

**Role-based access control**
- Two roles: HR (superuser) and Employee, enforced server-side on every route — not just hidden in the UI
- Field-level allowlisting on self-edit so an employee can never elevate their own permissions or reactivate a deactivated account
- Every `{id}`-based route checks ownership or role before returning data
- Only HR can delete an employee record — self-deletion is blocked, closing off what was previously a way for an employee to wipe their own leave/audit history
- Foreign keys use explicit `ON DELETE` behavior (`SET NULL` for approver references, `CASCADE` for notifications) so deleting a user never crashes on an unhandled integrity error

**Leave management**
- Apply, approve, reject, and withdraw leave requests
- Leave dates are validated server-side: no requests starting in the past, no overlapping requests against the same employee's existing pending/approved leave
- Real balance tracking for casual, sick, and annual leave — deduction happens on **approval**, not on apply, so rejected requests never touch the balance
- Approval is blocked with a clear error if it would overdraw the balance
- Once HR has approved or rejected a request, it becomes immutable — an employee can only withdraw a request that's still pending, preserving the audit trail
- State-transition guards prevent double-approval or re-deciding an already-decided request

**Holidays**
- Company-wide holiday calendar, read-only for employees, managed by HR
- Duplicate-date protection with a clean validation error instead of a server crash

**Notifications**
- In-app notifications: HR is notified when someone applies for leave, employees are notified when their request is approved or rejected
- Polling-based (20s interval) rather than WebSockets — a deliberate choice given the Nginx reverse-proxy deployment, since WebSockets need special upgrade-header configuration that adds real risk for this project's scope

**Global search**
- Role-aware: HR can search employees and all leave requests; employees can only search their own leave history
- Searching a leave-type name (e.g. "sick", "casual") filters to exactly that type — searching free text (like a reason) falls back to a text match
- Clicking or pressing Enter on a result navigates straight to that specific record and opens its details automatically, rather than dumping you into a generic filtered list

**Dashboard**
- Role-aware view: HR sees org-wide stats, employees see their personal leave summary
- Real leave-type distribution and monthly charts, built from the actual `leave_type` field — not guessed from free-text reasons

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router v6, React Hook Form + Zod, Axios, Recharts |
| Backend | FastAPI, SQLAlchemy, Pydantic v2, python-jose (JWT), passlib/bcrypt, slowapi (rate limiting) |
| Database | MySQL 8.0 |
| Deployment | Docker, Docker Compose, Nginx (reverse proxy + static file serving) |

---

## Architecture

```
                     ┌─────────────────────────┐
   Browser  ───────► │  Nginx (port 80)        │
                     │  - serves built React   │
                     │    static files          │
                     │  - proxies /api/* to     │
                     │    the backend           │
                     └───────────┬─────────────┘
                                 │  internal Docker network
                     ┌───────────▼─────────────┐
                     │  FastAPI backend         │
                     │  (uvicorn, port 8000,    │
                     │   not exposed to host)   │
                     └───────────┬─────────────┘
                                 │  internal Docker network
                     ┌───────────▼─────────────┐
                     │  MySQL 8.0                │
                     │  (not exposed to host)     │
                     └───────────────────────────┘
```

Only Nginx is reachable from outside the Docker network. The backend and database communicate over an internal Docker network by service name and are never published to the host — this was a deliberate hardening decision made during the security pass (the original scaffold exposed MySQL's port directly).

The frontend calls a relative `/api/...` path at runtime, which Nginx reverse-proxies to `http://backend:8000/` (stripping the `/api` prefix before forwarding). This means the same built frontend works regardless of the host/domain it's eventually served from — nothing is hardcoded to `localhost`.

---

## Security

This project went through a dedicated security audit, and the fixes were verified working, not just written. Highlights:

- **Secrets**: JWT secret, SMTP credentials, and database passwords are all environment-driven, never hardcoded, and `.env` files are gitignored at every level (root, `backend/`, `frontend/`)
- **IDOR & mass assignment**: every ownership-sensitive route was audited; self-edit endpoints use an explicit field allowlist so a user can never write to `is_active` or `is_superuser` on their own account
- **Input validation**: `profile_picture_url` is validated as a real `http(s)://` URL server-side (not just client-side), and free-text fields like `reason` have server-enforced length limits
- **Rate limiting**: login (5/min), invites (10/hr), leave applications (20/hr), and accept-invite (per-token, effectively unbrute-forceable given 32-byte random tokens) are all rate-limited via `slowapi`. Uvicorn runs with `--proxy-headers --forwarded-allow-ips=*` so the limiter reads the real client IP forwarded by Nginx, rather than seeing every request as coming from the same internal container address — a subtle bug that would otherwise make the whole rate-limiting story cosmetic in the Docker deployment
- **Debug/docs exposure**: `DEBUG` controls FastAPI's error verbosity; `ENABLE_DOCS` independently controls whether Swagger/ReDoc are exposed at all — the two are deliberately decoupled so docs can be hidden in a security-conscious deployment without also disabling proper error handling
- **Database isolation**: MySQL is not exposed to the host in the Docker deployment — only reachable over the internal network by the backend container

---

## Project structure

```
leave-management-system/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # FastAPI route modules (auth, employees, leaves, holidays, notifications, dashboard)
│   │   ├── core/             # config, security, database session, rate limiter, bootstrap logic
│   │   ├── crud/             # database access functions, kept separate from route/HTTP concerns
│   │   ├── models/           # SQLAlchemy models
│   │   └── schemas/          # Pydantic request/response schemas
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example          # documents every required variable with safe placeholder values
├── frontend/
│   ├── src/
│   │   ├── components/       # shared UI + layout components (navbar, sidebar, cards)
│   │   ├── context/          # auth and theme context providers
│   │   ├── pages/            # route-level page components
│   │   ├── routes/           # router config + root redirect logic
│   │   └── services/         # typed API client functions, one module per domain
│   └── .env.production       # build-time API base URL for the Docker/Nginx build
├── nginx/
│   ├── Dockerfile             # multi-stage: builds the frontend, then serves it via nginx:alpine
│   └── nginx.conf
└── docker-compose.yml
```

---

## Getting started

### Option A: Docker Compose (recommended)

This is the fastest way to run the whole stack — MySQL, backend, and Nginx — with a single command, and it's the closest to how the app is meant to be deployed.

**Prerequisites:** Docker and Docker Compose installed.

1. Clone the repo:
   ```bash
   git clone https://github.com/inayat-engineer/Employee-leave-Management-System.git
   cd Employee-leave-Management-System
   ```

2. Create the root `.env` file (used by `docker-compose.yml` for MySQL credentials):
   ```bash
   cat > .env << 'EOF'
   MYSQL_ROOT_PASSWORD=<generate a strong random value>
   MYSQL_DATABASE=leave_db
   MYSQL_USER=leave_user
   MYSQL_PASSWORD=<generate a strong random value>
   EOF
   ```

3. Create `backend/.env` from the template and fill in real values:
   ```bash
   cp backend/.env.example backend/.env
   ```
   At minimum, set `JWT_SECRET` to a long random value (e.g. `python3 -c "import secrets; print(secrets.token_urlsafe(64))"`), and set `BOOTSTRAP_SUPERUSER_EMAIL` / `BOOTSTRAP_SUPERUSER_PASSWORD` so you have a way to log in on first boot (see [First login](#first-login--bootstrap-superuser) below). SMTP credentials are only needed if you want real invite emails to send.

4. Build and start everything:
   ```bash
   docker compose up --build -d
   ```

5. Open the app:
   ```
   http://localhost
   ```

   Everything is served through Nginx on port 80 — the backend (port 8000) and MySQL (port 3306) are intentionally **not** exposed to your host machine.

To stop the stack:
```bash
docker compose down
```

To stop it **and wipe the database** (useful for testing a genuinely fresh deployment):
```bash
docker compose down -v
```

### Option B: Local development

Better for active development, since it gives you hot-reload on both the frontend and backend.

**Prerequisites:** Python 3.12+, Node.js 20+, a running MySQL instance (Docker is easiest for just this piece: `docker run -d --name leave_mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=<pw> -e MYSQL_DATABASE=leave_db -e MYSQL_USER=leave_user -e MYSQL_PASSWORD=<pw> mysql:8.0`).

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit .env with real values — DATABASE_URL should point at localhost:3306
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend** (in a separate terminal):
```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs at `http://localhost:5173` and talks directly to the backend at `http://localhost:8000` (set via `frontend/.env`, which is separate from `frontend/.env.production` used only for the Docker build).

---

## Environment variables

All variables are documented with safe placeholder values in `backend/.env.example`. Never commit a real `.env` file — every `.env` variant is gitignored.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLAlchemy connection string to MySQL |
| `JWT_SECRET` | Signing key for access tokens — must be long and random |
| `JWT_ALGORITHM` | JWT signing algorithm (default `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime |
| `DEBUG` | Controls FastAPI's error verbosity — should be `False` outside local development |
| `ENABLE_DOCS` | Independently controls whether `/docs` and `/redoc` are exposed |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` / `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | Credentials for sending real invite emails |
| `FRONTEND_URL` | Used to build the activation link sent in invite emails |
| `INVITE_TOKEN_EXPIRE_HOURS` | How long an invite link stays valid |
| `BOOTSTRAP_SUPERUSER_EMAIL` / `BOOTSTRAP_SUPERUSER_PASSWORD` / `BOOTSTRAP_SUPERUSER_FULL_NAME` | Seeds the first HR account automatically on a genuinely empty database — see below |

---

## First login / bootstrap superuser

Because registration is invite-only, a brand-new deployment with an empty database has no way to create the very first account — someone has to already be HR to invite anyone.

This is solved with an automatic, self-limiting bootstrap step: on every backend startup, if `BOOTSTRAP_SUPERUSER_EMAIL` and `BOOTSTRAP_SUPERUSER_PASSWORD` are set **and** the `users` table is empty, the backend creates that one superuser account automatically. On every subsequent startup it checks the user count first and does nothing once any user exists — so it's safe to leave these variables set permanently; they only ever act once.

To log in for the first time:
1. Set `BOOTSTRAP_SUPERUSER_EMAIL` and `BOOTSTRAP_SUPERUSER_PASSWORD` in `backend/.env` before first startup
2. Start the app
3. Log in with those credentials
4. From there, use the Employees page to invite everyone else

Consider rotating or removing the bootstrap password from `.env` after your first login, since it's no longer needed once the account exists.

---

## API documentation

When `ENABLE_DOCS=True`, interactive API docs are available at:

- Swagger UI: `http://localhost:8000/docs` (local dev) or `http://localhost/api/docs`-style path through Nginx, depending on proxy configuration
- ReDoc: `/redoc`
- Raw OpenAPI schema: `/openapi.json`

Set `ENABLE_DOCS=False` before any real deployment where you don't want the full API surface publicly browsable.

---

## Known limitations

These are deliberate scope decisions for a 3-week project, not oversights:

- No file upload backend — `profile_picture_url` is a validated URL string, not real image storage
- No WebSocket-based real-time notifications — polling every 20 seconds instead, to avoid the added Nginx configuration complexity WebSockets require
- No database migration tool (Alembic) — schema changes are applied manually via `Base.metadata.create_all()`
- Leave types `wedding`, `family_emergency`, `personal`, and `other` have no numeric balance cap — only `casual`, `sick`, and `annual` are tracked against a total/used balance
- No granular per-user notification preferences (e.g. muting specific alert types, email digests) — the Settings page is explicit about this rather than showing non-functional toggles

## Roadmap ideas

- Per-user notification preferences backed by a real schema field
- Email digest / weekly summary notifications
- File upload support for profile pictures
- Alembic migrations for safer schema evolution
- Configurable leave-balance caps per leave type, per employee