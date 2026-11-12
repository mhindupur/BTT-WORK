# NUCLICK Fleet — architecture for developers

## Packages

| Path | Role |
|------|------|
| `fleet-db/` | MySQL schema + numbered migrations |
| `fleet-api/` | Express REST API (JWT, uploads, WhatsApp, IFSC) |
| `fleet-web/` | React (Vite + Tailwind) SPA |
| `docs/` | Deploy + ops guides |
| `scripts/` | Local / cloud start helpers |
| `samples/` | Excel samples for fuel recon uploads |

## Roles

| Role | UI prefix | Typical login |
|------|-----------|---------------|
| Admin | `/admin/*` | email + password + WhatsApp OTP |
| Site manager | `/sm/*` | **site code** (8–10 alphanumeric) + password |
| Account manager | `/am/*` | email + password (read-only) |

## Request flow

```
Browser → fleet-web (Vite / Nginx static)
            └─ /api/*  → fleet-api (:4000)
                            └─ MySQL (btt_fleet)
            └─ /uploads/* → fleet-api static files
```

## fleet-api layout

```
fleet-api/src/
  index.js          # Express app + route mounts (grouped by role)
  loadEnv.js        # Always loads fleet-api/.env (PM2-safe)
  db.js             # mysql2 pool
  seed.js           # Demo users / site / vehicle
  middleware/       # JWT auth helpers
  routes/           # One file per domain (auth, clients, vehicles, …)
  utils/            # Pure helpers (vehicleReg, vehiclePayload, vehicleSla, date rules on web)
  constants/        # Shared enums (doc types, expiry docs)
  services/         # WhatsApp, Excel, notifications, expiry cron
  config/           # Public URL helpers
```

## fleet-web layout

```
fleet-web/src/
  main.jsx / App.jsx / api.js / authContext.jsx
  pages/
    Login.jsx
    admin/          # Sites, vehicles, approvals, indents, payments, …
    sm/             # Vehicles, drivers, indents
    am/             # Dashboard, sites, reports
  components/       # Shared UI (VehicleInfoFields, DocUploadCard, RcBookPanel, …)
  layouts/          # AdminLayout, SmLayout, AmLayout
  constants/        # Branding, vehicle fields/docs
  utils/            # vehicleReg, dateRules, listFilter, exportExcel
```

## Database

1. Fresh install: apply `fleet-db/schema.sql`
2. Existing DB: apply any unread `fleet-db/migration_0XX_*.sql` in order
3. Seed: `cd fleet-api && npm run seed`

## Key product rules (quick)

- Site code: **8–10** alphanumeric; used as site-manager login
- Document expiry must be **after today**
- Form 42/47 removed from UI (Permit covers it); DB column may still exist
- IFSC verify needs `INDIANAPI_IFSC_KEY` in `fleet-api/.env`
