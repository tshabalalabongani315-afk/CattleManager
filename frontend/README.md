# Cattle Manager — frontend

React + Vite + Chakra UI single-page app. See the [root README](../README.md) for the full project overview, architecture and deployment steps.

```bash
npm install
npm run dev     # http://localhost:5173 — proxies /api to http://localhost:4000
npm test        # Vitest + Testing Library
npm run lint
npm run build
```

The app calls the API on the same origin (`/api`). Set `VITE_API_URL` only if the API is hosted elsewhere (then also set `ALLOWED_ORIGINS` on the API).
