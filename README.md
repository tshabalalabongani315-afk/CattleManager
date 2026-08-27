# 🐄 Cattle Manager

A simple farm record-keeping app for tracking a cattle herd: register animals by tag and breed, log daily kraal counts, record movements (in/out/sold/died), and reconcile the register against today's count to spot anything unaccounted for.

## Tech stack

- **Backend**: Node.js, Express, SQLite (via `sqlite`/`sqlite3`)
- **Frontend**: React (Vite), Chakra UI, React Router, Recharts

## Project structure

```
backend/    Express API + SQLite database
frontend/   React app (Vite + Chakra UI)
```

## Running locally

Two terminals — one for each side:

```bash
cd backend
npm install
npm start
```

```bash
cd frontend
npm install
npm run dev
```

The backend runs on `http://localhost:4000`, the frontend on `http://localhost:5173`. The frontend talks to the backend URL from `VITE_API_URL` (copy `frontend/.env.example` to `frontend/.env` to override), falling back to `http://localhost:4000` if unset.

## Current limitations

- **Login is a role picker, not authentication.** Choosing "Farm Owner" or "Farm Worker" just stores that role in `localStorage` — there's no password or server-side session. Don't put real access control on it as-is.
- **No input validation on the API.** The backend trusts request bodies as given.

## Features

- **Dashboard** — live snapshot: registered cattle count, latest kraal count, and recent movements
- **Register** — add, edit, and delete cattle by tag and breed
- **Daily Counts** — log how many cattle were counted in the kraal each day
- **Movements** — record cattle moving in, out, sold, or died
- **Herd Reconciliation** — compares the register against the latest daily count and flags any gap
- **Reports** — breed distribution as a pie chart
