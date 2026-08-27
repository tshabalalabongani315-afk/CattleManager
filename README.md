# Cattle Manager

A farm record-keeping app for commercial cattle owners: register animals by tag and breed, track vaccinations and weight per animal, log daily kraal counts and movements, and reconcile the register against today's count to spot anything unaccounted for.

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
cp .env.example .env   # set JWT_SECRET to a real random value
npm start
```

```bash
cd frontend
npm install
npm run dev
```

The backend runs on `http://localhost:4000`, the frontend on `http://localhost:5173`. The frontend talks to the backend URL from `VITE_API_URL` (copy `frontend/.env.example` to `frontend/.env` to override), falling back to `http://localhost:4000` if unset.

## Current limitations

- **Sign-up is open.** Anyone with the app URL can create an account (`/signup`) — there's no invite/approval step, which is fine for a single-farm deployment but not a public one.
- **No input validation on the API.** The backend trusts request bodies as given, beyond the auth endpoints' own checks.
- **No cascading delete.** Deleting an animal from the Register does not remove its vaccination or weight history rows — they're orphaned rather than cleaned up.

## Features

- **Authentication** — real sign-up/login (bcrypt-hashed passwords, JWT sessions); every API endpoint requires a valid login
- **Dashboard** — live snapshot: registered cattle count, latest kraal count, recent movements, and a vaccinations-due alert card
- **Register** — add, edit, delete, and search cattle by tag or breed, with CSV export; click a row to open that animal's profile
- **Animal Profile** (`/cattle/:id`) — one page per animal with its details plus full vaccination and weight history
- **Vaccinations** — log vaccinations per animal with a next-due date; a farm-wide view flags overdue and due-soon records, with CSV export and a live overdue count in the sidebar
- **Weight Tracking** — log weight entries per animal and see a growth trend chart once there's more than one record
- **Daily Counts** — log how many cattle were counted in the kraal each day
- **Movements** — record cattle moving in, out, sold, or died
- **Herd Reconciliation** — compares the register against the latest daily count and flags any gap
- **Reports** — breed distribution as a pie chart
