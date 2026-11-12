# fleet-api

Express API for NUCLICK Fleet.

```bash
cp .env.example .env   # set DATABASE_URL, JWT_SECRET, INDIANAPI_IFSC_KEY, …
npm install
npm run seed
npm run dev            # or: node src/index.js / pm2
```

Health: `GET /api/health`

See [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for route groups and folder layout.
