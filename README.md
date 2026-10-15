# Employee Roster Dashboard

Single-admin employee roster app for 15-50 employees. No login/auth.

## Stack
- `client/` — React + Vite
- `server/` — Node/Express + SQLite (uses Node's built-in `node:sqlite`, so it needs **Node 22.5+**; tested on Node 24)

## Running locally

Two terminals:

```
cd server
npm install
npm run dev        # http://localhost:4000
```

```
cd client
npm install
npm run dev         # http://localhost:5173
```

The client dev server proxies `/api/*` requests to `http://localhost:4000`, so open http://localhost:5173.

The SQLite database file is created automatically at `server/data/roster.db` on first run.

## Features
- Employee list (add/edit/delete, department, role, default shift)
- Roster grid dashboard — click any employee/date cell to add or edit that day's shift and log breaks
- Leave tracking with type and approval status
- "Currently active" widget — who's on shift, on break, or on leave right now (refreshes every 60s)
- Department and status filters on the dashboard
- Weekly summary report — hours worked and leave days per employee
