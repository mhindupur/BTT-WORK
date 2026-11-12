# fleet-web

React SPA (Vite + Tailwind). Talks to the API via relative `/api` (dev proxy or Nginx).

```bash
npm install
npm run dev      # http://127.0.0.1:5174
npm run build    # production → dist/
```

Pages are grouped by role under `src/pages/{admin,sm,am}/`.
Shared form/UI pieces live in `src/components/`.
