# Deploy BTT Fleet on AWS EC2 (step by step)

This guide runs **Frontend + Backend + MySQL** on **one Ubuntu EC2 instance**, with **Nginx** so the browser talks to one URL and Nginx routes `/api` and `/uploads` to the API.

**Target architecture (single EC2)**

```
Browser  →  http(s)://YOUR_EC2_IP_OR_DOMAIN
                │
            Nginx (:80 / :443)
           /        |         \
     static FE    /api/*    /uploads/*
   (fleet-web)      │            │
                    └──── fleet-api (:4000) ──→ MySQL (:3306)
```

Recommended instance: **Ubuntu 22.04 LTS**, **t3.small** or larger (2 GB RAM preferred).

---

## 0. Prerequisites

- AWS account
- GitHub access to this repo (`cursor/btt-fleet-proposal` or your merged main)
- SSH key pair for EC2
- Optional: a domain pointed to the EC2 Elastic IP

---

## 1. Launch EC2

1. **EC2 → Launch instance**
2. AMI: **Ubuntu Server 22.04 LTS**
3. Instance type: `t3.small` (or `t3.medium` if many users)
4. Storage: **20 GB** gp3 (minimum)
5. **Key pair**: create/download `.pem`
6. **Security group** inbound rules:

| Type | Port | Source | Why |
|------|------|--------|-----|
| SSH | 22 | Your IP only | Admin access |
| HTTP | 80 | `0.0.0.0/0` | Web app |
| HTTPS | 443 | `0.0.0.0/0` | Optional TLS |

Do **not** open MySQL `3306` or API `4000` to the public internet.

7. Launch → note **Public IPv4** (or attach an **Elastic IP**)

---

## 2. SSH into the server

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

Update packages:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential nginx
```

---

## 3. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
npm -v
```

Install process manager:

```bash
sudo npm install -g pm2
```

---

## 4. Install MySQL 8

```bash
sudo apt install -y mysql-server
sudo systemctl enable mysql
sudo systemctl start mysql
```

Secure / set root password (interactive):

```bash
sudo mysql_secure_installation
```

Create database + app user:

```bash
sudo mysql -u root -p
```

In MySQL:

```sql
CREATE DATABASE btt_fleet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'btt'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON btt_fleet.* TO 'btt'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 5. Clone the application

```bash
sudo mkdir -p /opt/btt
sudo chown ubuntu:ubuntu /opt/btt
cd /opt/btt
git clone https://github.com/mhindupur/BTT-WORK.git
cd BTT-WORK
git checkout cursor/btt-fleet-proposal
# After merge, you may use: git checkout main
```

---

## 6. Load database schema

```bash
cd /opt/btt/BTT-WORK

mysql -u btt -p btt_fleet < fleet-db/schema.sql

# If you started from an older dump instead of full schema.sql, also run:
# mysql -u btt -p btt_fleet < fleet-db/migration_002_indent_serial_batches.sql
# mysql -u btt -p btt_fleet < fleet-db/migration_003_password_reset_otps.sql
# mysql -u btt -p btt_fleet < fleet-db/migration_004_vehicle_approval.sql
# mysql -u btt -p btt_fleet < fleet-db/migration_005_vehicle_types.sql
```

`schema.sql` already includes the latest tables (vehicles approval, OTP, vehicle types, etc.).

---

## 7. Configure and start Backend (API)

```bash
cd /opt/btt/BTT-WORK/fleet-api
cp .env.example .env
nano .env
```

Set at least:

```env
PORT=4000
DATABASE_URL=mysql://btt:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:3306/btt_fleet
JWT_SECRET=GENERATE_A_LONG_RANDOM_STRING_HERE

# Browser origin — use your public URL (no trailing slash)
PUBLIC_WEB_ORIGIN=http://YOUR_EC2_PUBLIC_IP
# Later with domain + HTTPS:
# PUBLIC_WEB_ORIGIN=https://fleet.yourdomain.com

PAYMENT_PUBLIC_BASE_URL=http://YOUR_EC2_PUBLIC_IP
UPLOAD_DIR=/opt/btt/BTT-WORK/fleet-api/uploads
WHATSAPP_PROVIDER=stub

ADMIN_EMAIL=admin@btt.fleet
ADMIN_PASSWORD=Admin@123
DEMO_SM_EMAIL=supervisor@btt.fleet
DEMO_SM_PASSWORD=Supervisor@123
```

Install, seed, start with PM2:

```bash
mkdir -p /opt/btt/BTT-WORK/fleet-api/uploads
npm install --omit=dev
npm run seed
pm2 start src/index.js --name btt-fleet-api
pm2 save
pm2 startup
# run the command PM2 prints (sudo env PATH=...)
```

Quick API check (on the server):

```bash
curl http://127.0.0.1:4000/api/health
# {"status":"ok","app":"btt-fleet-api"}
```

---

## 8. Build Frontend (production)

The browser must call **same host** `/api/...` (not localhost). The web app already uses `baseURL: "/api"`.

```bash
cd /opt/btt/BTT-WORK/fleet-web
npm install
npm run build
# creates fleet-web/dist/
```

---

## 9. Nginx — glue FE + BE together

Create site config:

```bash
sudo nano /etc/nginx/sites-available/btt-fleet
```

Paste (replace nothing required if using IP only):

```nginx
server {
    listen 80;
    server_name _;   # or your domain: fleet.yourdomain.com

    client_max_body_size 20M;

    # Frontend (Vite production build)
    root /opt/btt/BTT-WORK/fleet-web/dist;
    index index.html;

    # API → Express
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploaded files (indent photos, vehicle docs) → Express static
    location /uploads/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SPA routes (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable and reload:

```bash
sudo ln -sf /etc/nginx/sites-available/btt-fleet /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 10. Verify end-to-end

From your laptop browser:

1. Open `http://YOUR_EC2_PUBLIC_IP/`
2. Login:
   - Admin: `admin@btt.fleet` / `Admin@123`
   - Site manager: `supervisor@btt.fleet` / `Supervisor@123`
3. Confirm:
   - Dashboard loads
   - Admin → Vehicles / Vehicle types works
   - Site manager → Vehicles upload works
   - Network tab: `/api/...` returns 200 (same host)

On the server:

```bash
pm2 status
pm2 logs btt-fleet-api --lines 50
sudo systemctl status nginx
sudo systemctl status mysql
```

---

## 11. (Recommended) HTTPS with Let’s Encrypt

If you have a domain `fleet.yourdomain.com` → Elastic IP:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d fleet.yourdomain.com
```

Then update `fleet-api/.env`:

```env
PUBLIC_WEB_ORIGIN=https://fleet.yourdomain.com
PAYMENT_PUBLIC_BASE_URL=https://fleet.yourdomain.com
```

```bash
pm2 restart btt-fleet-api
```

---

## 12. Updating the app later

```bash
cd /opt/btt/BTT-WORK
git pull

# DB migrations (only new additive files since last deploy)
# mysql -u btt -p btt_fleet < fleet-db/migration_00X_....sql

cd fleet-api
npm install --omit=dev
pm2 restart btt-fleet-api

cd ../fleet-web
npm install
npm run build
# Nginx already points at dist/ — no restart needed after build
```

---

## Communication checklist (why it works)

| Piece | Listens | Who talks to it |
|-------|---------|-----------------|
| Nginx | `:80` / `:443` public | Browser |
| fleet-web `dist` | via Nginx `/` | Browser (HTML/JS/CSS) |
| fleet-api | `127.0.0.1:4000` private | Nginx proxies `/api` + `/uploads` |
| MySQL | `127.0.0.1:3306` private | fleet-api only via `DATABASE_URL` |

Critical env:

- `PUBLIC_WEB_ORIGIN` = the **exact URL** users open (CORS)
- Frontend uses relative `/api` → same origin → Nginx → API
- Uploads served under `/uploads` via Nginx → API

---

## Optional: split Database to Amazon RDS

For production hardening:

1. Create **RDS MySQL 8** in same VPC
2. Security group: allow `3306` **only from EC2 security group**
3. Set:

```env
DATABASE_URL=mysql://btt:PASSWORD@your-rds-endpoint:3306/btt_fleet
```

4. Load schema from your laptop/EC2 against RDS endpoint
5. Keep Nginx + Node on EC2 as above

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Site not loading | Security group port 80; `sudo systemctl status nginx` |
| Login fails / CORS | `PUBLIC_WEB_ORIGIN` must match browser URL exactly |
| `/api` 502 | `pm2 status`; `curl 127.0.0.1:4000/api/health` |
| DB connection error | `DATABASE_URL` password; `sudo systemctl status mysql` |
| Uploads 404 | Nginx `/uploads/` proxy; `UPLOAD_DIR` path exists + writable |
| Blank page after refresh on `/admin` | Nginx `try_files ... /index.html` for SPA |

---

## Demo credentials (change after first login)

| Role | Email | Password |
|------|--------|----------|
| Admin | `admin@btt.fleet` | `Admin@123` |
| Site manager | `supervisor@btt.fleet` | `Supervisor@123` |

Change `ADMIN_PASSWORD` / `DEMO_SM_PASSWORD` before `npm run seed` on a fresh DB, or use Admin → Site managers → Set password after deploy.
