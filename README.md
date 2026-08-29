# MediConnect — Web

> Telemedicine platform for Rwanda. One React app for patients, doctors, hospitals, pharmacies, and admins — connecting to the MediConnect API for bookings, instant video consults, prescriptions, and pharmacy orders.

---

## Quick Navigation

| I want to… | Go to |
|---|---|
| Run the app locally | [Local Setup](#-local-setup) |
| Make a code change and push it | [Git Workflow](#-git-workflow) |
| Deploy frontend to production | [Frontend Deployment](#-frontend-deployment) |
| Deploy backend to production | [Backend Deployment](#-backend-deployment) |
| Access the database | [Database Access](#database) |
| SSH into the server | [SSH / Server](#ssh--server) |
| Test API endpoints | [API Documentation](#-api-documentation) |
| Use test accounts | [Test Credentials](#-test-credentials) |

---

## 📋 Table of Contents

1. [Tech Stack](#-tech-stack)
2. [Project Structure](#-project-structure)
3. [Local Setup](#-local-setup)
4. [Environment Variables](#-environment-variables)
5. [Scripts Reference](#-scripts-reference)
6. [Workspaces & Routes](#-workspaces--routes)
7. [Infrastructure Access](#-infrastructure-access)
8. [Git Workflow](#-git-workflow)
9. [Frontend Deployment](#-frontend-deployment)
10. [Backend Deployment](#-backend-deployment)
11. [Deploy Both Together](#-deploying-frontend--backend-together)
12. [Rollback](#-rollback)
13. [Quick Deploy Cheatsheet](#-quick-deploy-cheatsheet)
14. [Test Credentials](#-test-credentials)
15. [API Documentation](#-api-documentation)

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| Styling | Tailwind CSS + shadcn/ui |
| Forms | React Hook Form + Zod |
| Translations | i18next (English, French, Kinyarwanda) |
| Realtime | Laravel Echo + Pusher JS (Reverb) |
| Video calls | WebRTC + Daily.co |
| Rich text editor | Tiptap |
| Charts | Recharts |

---

## 📁 Project Structure

```
src/
├── components/        Reusable UI components (buttons, cards, modals, dialogs)
├── pages/             Full page views — one file per route
│   ├── patient/       Patient-specific pages
│   ├── doctor/        Doctor-specific pages
│   ├── hospital/      Hospital-specific pages
│   ├── pharmacy/      Pharmacy-specific pages
│   └── admin/         Admin-specific pages
├── hooks/             Custom React hooks + API call wrappers
├── lib/               API client, utilities, helper functions
├── locales/           Translation files — en.json, fr.json, rw.json
└── assets/            Images and icons imported in code

public/
└── images/            Static images referenced by URL (not imported)
```

---

## 🚀 Local Setup

Follow these steps exactly — in order.

### Prerequisites

- Node.js 18+ installed
- npm 9+ installed
- Git installed

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Telesphore-Uwabera/MEDICONNECT-WEB.git
cd MEDICONNECT-WEB

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env

# 4. Edit .env — set your API URL (staging for local dev)
#    VITE_APP_BASE_URL=https://staging-api.mediconnect.rw/api/v1

# 5. Start the development server
npm run dev
```

The app opens at **http://localhost:5173**

> **First time?** Also configure your git identity so commits show your name:
> ```bash
> git config --global user.name "Your Name"
> git config --global user.email "you@mediconnect.rw"
> ```

---

## ⚙️ Environment Variables

All `VITE_` variables are baked into the JS bundle at build time.  
**Never put secrets or passwords in `VITE_` variables** — they become visible in the browser.

```env
# ── API ───────────────────────────────────────────────────────────
# Use staging for local dev, switch to production for live deploys
VITE_APP_BASE_URL=https://staging-api.mediconnect.rw/api/v1

# ── WebSockets (Laravel Reverb) ───────────────────────────────────
VITE_REVERB_APP_KEY=mediconnect-staging-key
VITE_REVERB_HOST=ws.mediconnect.rw
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=wss

# ── WebRTC TURN server ────────────────────────────────────────────
VITE_TURN_HOST=197.243.29.114
VITE_TURN_PORT=3478
VITE_TURN_SECRET=mediconnect-turn-secret

# ── Mode ──────────────────────────────────────────────────────────
VITE_DEV=true   # set to false for production builds
```

**For production builds**, change these two lines:
```env
VITE_APP_BASE_URL=https://api.mediconnect.rw/api/v1
VITE_DEV=false
```

---

## 📜 Scripts Reference

| Command | What it does |
|---|---|
| `npm run dev` | Start local dev server with hot reload |
| `npm run build` | Build for production → outputs to `dist/` |
| `npm run build:dev` | Build with source maps (for staging) |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint checks |

---

## 🗺 Workspaces & Routes

| Role | Base path | Access |
|---|---|---|
| Patient | `/patient` | After phone verification |
| Doctor | `/doctor` | After admin approval |
| Hospital | `/hospital` | After admin approval |
| Pharmacy | `/pharmacy` | After admin approval |
| Admin | `/admin` | Super-admin only |
| Public | `/`, `/search`, `/doctors` | No login needed |

---

## 🌐 Infrastructure Access

### Live URLs

| Service | URL |
|---|---|
| Frontend — production | https://mediconnect.rw |
| Frontend — staging | https://staging.mediconnect.rw |
| API — production | https://api.mediconnect.rw |
| API — staging | https://staging-api.mediconnect.rw |
| WebSocket | wss://ws.mediconnect.rw |
| Database admin | https://db.mediconnect.rw |

---

### VPN

> ⚠️ **Connect VPN first** before using SSH, DB tunnels, or any internal IP.

| Field | Value |
|---|---|
| URL | `vpn.aos.rw` |
| Username | `user.mediconnect` |
| Group | `MEDICONNECT-LTD` |

Use Cisco AnyConnect or any OpenConnect client.

---

### SSH / Server

Once VPN is connected:

```bash
ssh root@10.10.141.148
```

The server runs **Ubuntu** with **Nginx** as the web server.

```bash
# Check Nginx status
systemctl status nginx

# Test config before applying changes — always do this first
nginx -t

# Reload Nginx (safe — no dropped connections)
systemctl reload nginx

# Watch logs live
tail -f /var/log/nginx/error.log
```

Config files live in `/etc/nginx/sites-available/`.

---

### Database

**Option 1 — Browser UI (phpMyAdmin)** — easiest, no VPN needed

```
https://db.mediconnect.rw
Username: medi.connect
```

**Option 2 — Desktop tool via SSH tunnel** (TablePlus, DBeaver, MySQL Workbench)

```bash
# Open tunnel — keep this terminal open
ssh -L 3307:127.0.0.1:3306 root@10.10.141.148
```

Then connect your tool to:

| Field | Value |
|---|---|
| Host | `127.0.0.1` |
| Port | `3307` |
| Database | `mediconnect` |
| Username | `root` |

**Option 3 — CLI directly on server**

```bash
ssh root@10.10.141.148
mysql -u root mediconnect
```

---

### DNS & Nameservers

Domains are `.rw` — registered through **RICTA** (Rwanda's registrar).

Check current DNS: https://www.ricta.org.rw/whois → search `mediconnect.rw`

To update DNS, log into the registrar panel or — if DNS is self-hosted — SSH in and edit `/etc/bind/`, then:

```bash
systemctl restart named
```

---

## 🌿 Git Workflow

### Branch Rules

```
main        ← production (what users see)
staging     ← pre-production testing
feature/*   ← new features
fix/*       ← bug fixes
hotfix/*    ← urgent production fixes (branches off main)
```

> Never commit directly to `main` or `staging`. Every change starts on its own branch.

---

### Normal Change Flow

**Step 1 — Start from latest staging**

```bash
git checkout staging
git pull origin staging
git checkout -b feature/your-feature-name
```

Name your branch clearly:
- `feature/doctor-profile-redesign`
- `fix/login-otp-not-clearing`
- `content/update-homepage-text`

**Step 2 — Make your changes, then verify**

```bash
npm run lint    # no lint errors
npm test        # all tests pass
npm run build   # no build errors
```

**Step 3 — Commit**

```bash
git status                            # see what changed
git add src/path/to/file.tsx          # stage specific files
git commit -m "feat: add doctor rating to card"
```

Commit message prefixes:

| Prefix | Use for |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `content:` | Text, image, or translation update |
| `style:` | Visual/CSS only |
| `refactor:` | Code restructure, no behavior change |
| `hotfix:` | Urgent production fix |

**Step 4 — Push and open a PR**

```bash
git push -u origin feature/your-feature-name
```

Then on GitHub:
1. Click **"Compare & pull request"**
2. Set base branch to **`staging`** (not `main`)
3. Describe what changed and why
4. Request a review → merge

---

### Hotfix Flow (urgent production bug)

```bash
# Branch off main — not staging
git checkout main
git pull origin main
git checkout -b hotfix/describe-the-fix

# Fix, commit, push
git add src/...
git commit -m "hotfix: fix crash on login screen"
git push -u origin hotfix/describe-the-fix
```

Open PR directly to `main`. After merging and deploying, **backport to staging**:

```bash
git checkout staging
git merge hotfix/describe-the-fix
git push origin staging
```

---

## 🖥 Frontend Deployment

### Full Flow at a Glance

```
feature branch → staging → test → main → build → Netlify → live
```

---

### Step 1 — Merge to staging, test

After your PR is merged to `staging`, Netlify auto-deploys to:
```
https://staging.mediconnect.rw
```

Test checklist before going to production:
- [ ] Login works for all roles
- [ ] Your specific change works correctly
- [ ] Mobile layout looks right
- [ ] Browser DevTools Console shows zero errors

---

### Step 2 — Merge staging → main

```bash
git checkout main
git pull origin main
git merge staging
git push origin main
```

Or open a PR from `staging → main` on GitHub.

---

### Step 3 — Build for production

```bash
# Make sure .env has production values:
# VITE_APP_BASE_URL=https://api.mediconnect.rw/api/v1
# VITE_DEV=false

npm run build
# Output: dist/
```

---

### Step 4 — Deploy to Netlify

**Option A — Netlify CLI** (recommended)

```bash
# Install once
npm install -g netlify-cli

# Login once
netlify login

# Deploy — --prod makes it live immediately
netlify deploy --dir=dist --prod
```

**Option B — Netlify dashboard drag-and-drop**

1. Go to **app.netlify.com** → MediConnect → **Deploys**
2. Drag the `dist/` folder into the deploy zone
3. Wait for **"Published"**

**Option C — Direct to server** (VPN required)

```bash
scp -r dist/* root@10.10.141.148:/var/www/mediconnect/
ssh root@10.10.141.148 "nginx -t && systemctl reload nginx"
```

---

### Step 5 — Verify

```
https://mediconnect.rw
```

- Press `Ctrl + Shift + R` (hard refresh — clears cache)
- Test your change on the live site
- Check DevTools → Network — API calls should return `200`

---

### Netlify Environment Variables

Set these once in Netlify so every deploy uses the right values:

**app.netlify.com → Site → Site configuration → Environment variables**

| Variable | Staging | Production |
|---|---|---|
| `VITE_APP_BASE_URL` | `https://staging-api.mediconnect.rw/api/v1` | `https://api.mediconnect.rw/api/v1` |
| `VITE_REVERB_APP_KEY` | `mediconnect-staging-key` | production key |
| `VITE_REVERB_HOST` | `ws.mediconnect.rw` | `ws.mediconnect.rw` |
| `VITE_REVERB_PORT` | `443` | `443` |
| `VITE_REVERB_SCHEME` | `wss` | `wss` |
| `VITE_DEV` | `true` | `false` |

After adding variables, trigger a new deploy for them to apply.

---

### Nginx Config for Frontend (server-side)

The critical rule is `try_files` — without it, refreshing any page other than `/` returns a 404.

```nginx
server {
    listen 443 ssl;
    server_name mediconnect.rw www.mediconnect.rw;

    root /var/www/mediconnect;
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/mediconnect.rw/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mediconnect.rw/privkey.pem;

    location / {
        try_files $uri $uri/ /index.html;  # critical for React Router
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}

server {
    listen 80;
    server_name mediconnect.rw www.mediconnect.rw;
    return 301 https://$host$request_uri;
}
```

---

## ⚙️ Backend Deployment

The backend is a **Laravel PHP API** at `/var/www/mediconnect-api` on the server.

> **Requires SSH access.** Connect VPN first, then `ssh root@10.10.141.148`.

---

### All steps — run on the server

```bash
# 1. Go to the API directory
cd /var/www/mediconnect-api

# 2. Pull latest code
git pull origin main

# 3. Install / update PHP dependencies
composer install --no-dev --optimize-autoloader

# 4. Run database migrations
php artisan migrate --force

# 5. Clear and rebuild all Laravel caches  ← critical step
php artisan optimize:clear && php artisan optimize

# 6. Fix file permissions (needed for uploads, logs, sessions)
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

# 7. Restart PHP-FPM (clears OPcache — loads new code)
systemctl restart php8.2-fpm

# 8. Reload Nginx
nginx -t && systemctl reload nginx

# 9. Verify the API is responding
curl -s https://api.mediconnect.rw/api/v1/public/instant-consultations/doctors
```

---

### What each step does

| Step | Why it matters |
|---|---|
| `git pull` | Gets the latest code onto the server |
| `composer install` | Installs/updates PHP packages |
| `php artisan migrate` | Applies any new database schema changes |
| `optimize:clear && optimize` | Rebuilds config, route, and view caches — without this Laravel serves stale data |
| `chown + chmod` | Lets PHP write to storage (uploads, logs will break without this) |
| `restart php8.2-fpm` | Clears PHP OPcache so new code is actually loaded |
| `nginx -t && reload` | Applies any Nginx config changes safely |

---

### Checking logs when something breaks

```bash
# Laravel application errors
tail -50 /var/www/mediconnect-api/storage/logs/laravel.log

# Nginx errors
tail -50 /var/log/nginx/error.log

# PHP-FPM errors
tail -50 /var/log/php8.2-fpm.log
```

---

### Seeding the database (reference data only)

```bash
# Only run if you know what the seeder does
php artisan db:seed --force
```

> ⚠️ Some seeders wipe and re-insert data. Never run on production without checking first.

---

## 🔄 Deploying Frontend + Backend Together

Most features touch both sides. Always deploy in this order:

```
1. ✅ Deploy backend first
      ↓  (API must be ready before frontend calls it)
2. ✅ Verify API works
      curl https://api.mediconnect.rw/api/v1/public/instant-consultations/doctors
      ↓
3. ✅ Deploy frontend
      ↓
4. ✅ Test end-to-end on the live site
```

> Deploying frontend before backend causes errors — users will see broken API calls until backend catches up.

---

## ↩️ Rollback

### Frontend — rollback via Netlify (30 seconds)

1. Go to **app.netlify.com** → MediConnect → **Deploys**
2. Find the last working deploy
3. Click it → **"Publish deploy"**

Done. No code changes needed.

### Frontend — rollback via git

```bash
git checkout main
git revert HEAD
git push origin main
npm run build
netlify deploy --dir=dist --prod
```

### Backend — rollback via git

```bash
# On the server
cd /var/www/mediconnect-api
git log --oneline -10         # find last working commit
git checkout <commit-hash>    # go back to it

# Re-run post-deploy steps
composer install --no-dev --optimize-autoloader
php artisan optimize:clear && php artisan optimize
systemctl restart php8.2-fpm
nginx -t && systemctl reload nginx
```

> If migrations ran, you may also need `php artisan migrate:rollback` before reverting code.

---

## ⚡ Quick Deploy Cheatsheet

### Frontend — production deploy

```bash
git checkout main && git pull origin main
# Edit .env: VITE_APP_BASE_URL=https://api.mediconnect.rw/api/v1 + VITE_DEV=false
npm run build
netlify deploy --dir=dist --prod
```

### Backend — production deploy (run on server)

```bash
cd /var/www/mediconnect-api
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize:clear && php artisan optimize
chown -R www-data:www-data storage bootstrap/cache
systemctl restart php8.2-fpm
nginx -t && systemctl reload nginx
```

### Sanity check after any deploy

```bash
# Is the API alive?
curl -s https://api.mediconnect.rw/api/v1/public/instant-consultations/doctors

# Is the frontend alive?
# Open https://mediconnect.rw → Ctrl+Shift+R
```

---

## 🔑 Test Credentials

Use these accounts on the **staging** environment only.

**Base URL:** `https://staging-api.mediconnect.rw/api/v1`

| Role | Email | Phone | Password |
|---|---|---|---|
| Admin | admin@mediconnect.rw | 0780000000 | `Admin@2026!` |
| Patient | patient@mediconnect.rw | 0781111111 | `Patient@2026!` |
| Doctor | doctor@mediconnect.rw | 0782222222 | `Doctor@2026!` |
| Hospital | hospital@mediconnect.rw | 0783333333 | `Hospital@2026!` |
| Pharmacy | pharmacy@mediconnect.rw | 0784444444 | `Pharmacy@2026!` |

Country code for all: `+250`

---

## 📡 API Documentation

### Base URLs

| Environment | URL |
|---|---|
| Staging | `https://staging-api.mediconnect.rw/api/v1` |
| Production | `https://api.mediconnect.rw/api/v1` |

### Required Headers

Every request needs:
```http
Content-Type: application/json
Accept: application/json
```

Protected routes (marked 🔒) also need:
```http
Authorization: Bearer {token}
```

---

<details>
<summary><strong>🔐 Authentication</strong> — register, login, OTP, social, guest</summary>

Base path: `/auth`

### Register
`POST /auth/register`
```json
{
  "name": "John Doe",
  "phone": "0781234567",
  "country_code": "+250",
  "role": "patient",
  "email": "john@example.com",
  "password": "password123",
  "password_confirmation": "password123",
  "accepted_terms": true
}
```
Response `201`: `{ "message": "Account created. Please verify your phone number.", "user_id": 1 }`

---

### Send OTP
`POST /auth/send-otp`

By phone: `{ "phone": "0781234567", "country_code": "+250", "type": "register" }`  
By email: `{ "email": "john@example.com", "type": "login" }`

`type`: `register` | `login` | `reset`

---

### Verify OTP
`POST /auth/verify-otp`
```json
{ "phone": "0781234567", "country_code": "+250", "code": "123456", "type": "register" }
```
Success returns `token` + `user` object.

---

### Login
`POST /auth/login`

| Method | Payload |
|---|---|
| Phone + OTP | `{ "phone": "...", "country_code": "+250", "auth_method": "otp" }` |
| Phone + Password | `{ "phone": "...", "country_code": "+250", "auth_method": "password", "password": "..." }` |
| Email + Password | `{ "email": "...", "auth_method": "password", "password": "..." }` |

---

### Other Auth Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/me` | 🔒 | Get current user |
| `POST` | `/auth/logout` | 🔒 | Logout |
| `POST` | `/auth/refresh-token` | 🔒 | Refresh token |
| `POST` | `/auth/guest` | Public | Create guest session |
| `POST` | `/auth/guest/convert` | Public | Convert guest to full account |
| `GET` | `/auth/social/{provider}/redirect` | Public | Google / Facebook OAuth |

</details>

---

<details>
<summary><strong>🧑‍⚕️ Patient</strong> — profile, appointments, search, service bookings, certificates</summary>

Base path: `/patient` — all routes 🔒

### Profile

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/profile` | Get profile |
| `POST` | `/profile` | Create / update profile |
| `POST` | `/profile/avatar` | Upload avatar (max 2MB) |
| `GET` | `/profile/medical` | Get medical info |
| `POST` | `/profile/medical` | Save medical info |
| `GET` | `/profile/insurance` | Get linked insurance |
| `POST` | `/profile/insurance` | Update insurance |

---

### Appointments

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/appointments` | List — filter by `status`, `type`, `date`, `date_from`, `date_to` |
| `POST` | `/appointments` | Book appointment |
| `GET` | `/appointments/{id}` | Get single |
| `POST` | `/appointments/{id}/pay` | Pay — methods: `mtn_momo`, `airtel_money`, `card`, `cash`, `insurance_full` |
| `POST` | `/appointments/{id}/join` | Join video session — returns `room_url` + `token` |
| `DELETE` | `/appointments/{id}` | Cancel |

Book payload: `doctor_id`, `type` (online/in_person), `appointment_date`, `appointment_time`, `hospital_id` (required if in_person), `insurance_id`

---

### Search

| Method | Endpoint | Key params |
|---|---|---|
| `GET` | `/search/doctors` | `q`, `specialization`, `type`, `city`, `gender`, `instant`, `available_today` |
| `GET` | `/search/hospitals` | `q`, `city`, `type`, `insurance_id`, `open_now` |
| `GET` | `/search/hospitals/{id}` | Hospital detail |
| `GET` | `/search/hospitals/{id}/services` | Services in hospital |
| `GET` | `/search/hospitals/{id}/departments` | Departments |

---

### Service Bookings

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/service-bookings/availability` | Check slot — requires `hospital_id`, `hospital_service_id`, `preferred_date`, `preferred_time` |
| `GET` | `/service-bookings` | List my bookings |
| `POST` | `/service-bookings` | Request booking |
| `DELETE` | `/service-bookings/{id}` | Cancel |

---

### Fitness Certificates

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/certificates/available-doctors` | Doctors available for cert |
| `POST` | `/certificates/step/{1-4}` | Save each step |
| `POST` | `/certificates/submit` | Submit for review |
| `POST` | `/certificates/withdraw` | Withdraw |
| `GET` | `/certificates/request` | Current in-progress request |
| `GET` | `/certificates` | List my certificates |
| `GET` | `/certificates/{id}/download` | Get PDF download URL |

---

### Dashboard & Records

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/patient/dashboard` | Stats — params: `period`, `chart_group`, `appointment_type`, `status` |
| `GET` | `/patient/my-record` | My medical record |
| `GET` | `/patient/my-visits` | Visit history — filter: `?visit_type=appointment\|instant_consultation` |
| `GET` | `/patient/my-files` | Files — filter: `?file_type=lab_result\|scan\|report\|prescription\|other` |

</details>

---

<details>
<summary><strong>👨‍⚕️ Doctor</strong> — profile, availability, slots, appointments, prescriptions, wallet</summary>

Base path: `/doctor` — all routes 🔒

### Profile & Toggles

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/doctor/profile` | Get or create/update profile |
| `POST` | `/doctor/profile/image` | Upload profile image |
| `PATCH` | `/doctor/toggle/instant` | Toggle instant consultation on/off |
| `PATCH` | `/doctor/toggle/pause` | Pause / resume new bookings |

---

### Availability & Slots

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/doctor/availability` | Get or create recurring slot |
| `PUT/DELETE` | `/doctor/availability/{id}` | Update or delete slot |
| `POST` | `/doctor/availability/periods` | Create date-range schedule |
| `GET` | `/doctor/slots` | View slots — filter by `date`, `status`, `type` |
| `PATCH` | `/doctor/slots/{id}` | Update single slot status |
| `POST` | `/doctor/slots/bulk` | Block/unblock all slots on a date |

---

### Appointments

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/doctor/appointments` | List — filter: `status`, `type`, `date`, `today`, `upcoming` |
| `GET` | `/doctor/appointments/{id}` | Get single |
| `POST` | `/doctor/appointments/{id}/accept` | Accept quick appointment |
| `POST` | `/doctor/appointments/{id}/join` | Join session |
| `POST` | `/doctor/appointments/{id}/notes` | Add notes |
| `PUT` | `/doctor/appointments/{id}/notes` | Update notes |
| `POST` | `/doctor/appointments/{id}/complete` | Complete |
| `POST` | `/doctor/appointments/{id}/running-late` | Notify delay — requires `delay_minutes` (5–120) |
| `POST` | `/doctor/appointments/{id}/ready-next` | Notify next patient |

---

### Instant Consultations

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/doctor/instant-consultations/queue` | Queue + stats |
| `GET` | `/doctor/instant-consultations/live-session` | Rejoin active session |
| `POST` | `/doctor/instant-consultations/{id}/accept` | Accept |
| `POST` | `/doctor/instant-consultations/{id}/join` | Join |
| `POST` | `/doctor/instant-consultations/{id}/decline` | Decline |
| `POST` | `/doctor/instant-consultations/{id}/complete` | Complete |
| `GET/PUT` | `/doctor/instant-consultations/{id}/notes` | Get or save notes |
| `POST` | `/doctor/instant-consultations/{id}/files` | Upload file |

---

### Prescriptions

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/doctor/prescriptions` | List or create draft |
| `GET/PUT` | `/doctor/prescriptions/{id}` | Get or update draft |
| `POST` | `/doctor/prescriptions/{id}/items` | Add medicine |
| `DELETE` | `/doctor/prescriptions/{id}/items/{itemId}` | Remove medicine |
| `POST` | `/doctor/prescriptions/{id}/issue` | Sign + generate PDF |
| `POST` | `/doctor/prescriptions/{id}/send-to-pharmacy` | Send to pharmacy |

---

### Patient Records (Doctor Access)

| Method | Endpoint | Notes |
|---|---|---|
| `GET/PUT` | `/doctor/patients/{id}/record` | View or update medical record |
| `GET` | `/doctor/patients/{id}/visits` | Visit history |
| `GET/POST` | `/doctor/patients/{id}/files` | View or upload files |

> Doctor can only access records of patients they have treated.

---

### Wallet

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/doctor/wallet` | Balance |
| `GET` | `/doctor/wallet/earnings` | Per-appointment breakdown |
| `GET` | `/doctor/wallet/withdrawals` | Withdrawal history |
| `POST` | `/doctor/wallet/withdraw` | Request withdrawal — method: `bank_transfer` or `mobile_money` |
| `POST` | `/doctor/wallet/cancel-withdrawal/{id}` | Cancel pending request |

</details>

---

<details>
<summary><strong>🏥 Hospital</strong> — profile, departments, services, bookings, working hours</summary>

Base path: `/hospital` — all routes 🔒

### Profile

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/hospital/profile` | Get or create/update profile |
| `POST` | `/hospital/profile/logo` | Upload logo |
| `POST` | `/hospital/profile/image` | Upload cover image |
| `PATCH` | `/hospital/toggle/active` | Show/hide hospital in search |
| `PATCH` | `/hospital/toggle/accepting` | Pause/resume bookings |

---

### Working Hours & Closures

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/hospital/working-hours` | Get or set all days (bulk upsert) |
| `PUT/DELETE` | `/hospital/working-hours/{id}` | Update or delete single day |
| `DELETE` | `/hospital/working-hours/reset` | Reset all |
| `GET/POST` | `/hospital/closures` | List or create closure |
| `PUT/DELETE` | `/hospital/closures/{id}` | Update or delete closure |
| `POST` | `/hospital/closures/check-date` | Check if closed on a date |

---

### Departments & Services

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/hospital/departments` | List or create |
| `GET/PUT/DELETE` | `/hospital/departments/{id}` | Get, update, or delete |
| `GET/POST` | `/hospital/services` | List or create |
| `GET/PUT/DELETE` | `/hospital/services/{id}` | Get, update, or delete |

Service `price_type`: `fixed` | `from` | `negotiable` | `free`

---

### Service Bookings

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/hospital/service-bookings` | List incoming bookings |
| `GET` | `/hospital/service-bookings/{id}` | Single booking |
| `POST` | `/hospital/service-bookings/{id}/accept` | Accept — triggers payment to patient |
| `POST` | `/hospital/service-bookings/{id}/reject` | Reject — requires `rejection_reason` |
| `POST` | `/hospital/service-bookings/{id}/complete` | Complete |

---

### Insurances

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/hospital/insurances` | List or link insurance |
| `PUT/DELETE` | `/hospital/insurances/{id}` | Update coverage or unlink |

</details>

---

<details>
<summary><strong>💊 Pharmacy</strong> — profile, inventory, orders, prescriptions, external providers</summary>

Base path: `/pharmacy` — all routes 🔒

### Profile

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/pharmacy/profile` | Get or create/update |
| `POST` | `/pharmacy/profile/submit` | Submit for admin approval |
| `POST` | `/pharmacy/profile/logo` | Upload logo |
| `POST` | `/pharmacy/profile/image` | Upload cover image |

---

### Inventory

| Method | Endpoint | Description |
|---|---|---|
| `GET/PATCH` | `/pharmacy/inventory/mode` | Get or switch mode (`internal`/`external`) |
| `GET/POST` | `/pharmacy/inventory/categories` | Categories |
| `GET/POST` | `/pharmacy/inventory/medicines` | Medicines list or add |
| `GET/PUT/DELETE` | `/pharmacy/inventory/medicines/{id}` | Get, update, delete |
| `GET` | `/pharmacy/inventory/stock` | Stock overview — filter: `?filter=low\|out\|expiring` |
| `POST` | `/pharmacy/inventory/stock/{medicineId}/adjust` | Add or deduct quantity |

---

### Orders & Prescriptions

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/pharmacy/orders` | List orders |
| `POST` | `/pharmacy/orders/{id}/accept` | Accept |
| `POST` | `/pharmacy/orders/{id}/reject` | Reject |
| `POST` | `/pharmacy/orders/{id}/complete` | Complete — auto deducts stock |
| `GET` | `/pharmacy/prescription-requests` | List prescription requests |
| `POST` | `/pharmacy/prescription-requests/{id}/review` | Mark as reviewing |
| `POST` | `/pharmacy/prescription-requests/{id}/approve` | Approve |
| `POST` | `/pharmacy/prescription-requests/{id}/reject` | Reject |
| `POST` | `/pharmacy/prescription-requests/{id}/fulfill` | Fulfill |

---

### External Providers

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/pharmacy/inventory/external/providers` | List or connect provider |
| `PUT/DELETE` | `/pharmacy/inventory/external/providers/{id}` | Update or remove |
| `POST` | `/pharmacy/inventory/external/providers/{id}/sync` | Manual sync (max 5/hour) |
| `GET` | `/pharmacy/inventory/external/items` | External inventory (read-only) |

</details>

---

<details>
<summary><strong>🔧 Admin</strong> — users, approvals, wallets, settings, whitelists</summary>

Base path: `/admin` — all routes 🔒 (admin token required)

### User Management

| Endpoint | Actions |
|---|---|
| `/admin/users/{id}` | `GET`, suspend `PUT`, activate `PUT`, delete `DELETE` |
| `/admin/patients/{id}` | `GET`, suspend, activate |
| `/admin/doctors/{id}` | `GET`, approve, reject, suspend |
| `/admin/hospitals/{id}` | `GET`, approve, reject, suspend |
| `/admin/pharmacies/{id}` | `GET`, approve, reject, suspend |

---

### Instant Consultation Whitelist

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/admin/instant-consultations` | List or add doctor |
| `PUT` | `/admin/instant-consultations/{id}` | Enable/disable — `{ "active": true/false }` |
| `DELETE` | `/admin/instant-consultations/{id}` | Remove — auto-disables doctor's instant flag |

---

### Specializations & Fees

| Endpoint | Description |
|---|---|
| `/admin/specializations` | CRUD |
| `/admin/specialization-fees` | CRUD — sets `online_fee` and `in_person_fee` per specialization |
| `/admin/doctor-consultations` | Assign doctors to fee tiers |
| `/admin/doctor-consultations/{doctorId}/fee-override` | Set or clear individual fee override |

---

### Wallet Management

| Endpoint | Description |
|---|---|
| `GET /admin/wallets/doctors` | All doctor wallets |
| `POST /admin/wallets/doctors/{id}/topup` | Top up |
| `POST /admin/wallets/doctors/{id}/deduct` | Deduct |
| `GET /admin/wallets/main` | Main platform wallet |
| `POST /admin/wallets/main/topup` | Top up main |
| `GET /admin/wallets/withdrawal-requests` | All withdrawal requests |
| `PUT /admin/wallets/withdrawal-requests/{id}/approve` | Approve |
| `PUT /admin/wallets/withdrawal-requests/{id}/complete` | Complete — deducts both wallets |
| `PUT /admin/wallets/withdrawal-requests/{id}/reject` | Reject |

Withdrawal status flow: `pending → processing → approved → completed`

---

### Other Admin

| Endpoint | Description |
|---|---|
| `/admin/insurances` | CRUD + logo upload |
| `/admin/reviews/{id}/approve` or `/reject` | Moderate reviews |
| `/admin/settings/{group}` | Get or update settings by group |
| `/admin/maintenance/toggle` | Toggle maintenance mode |
| `/admin/certification-doctors` | Manage fitness cert doctor team |

</details>

---

<details>
<summary><strong>🌍 Public / Guest</strong> — instant consultations, medicine search (no auth needed)</summary>

Base path: `/public`

### Instant Consultations (Guest)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/public/instant-consultations/doctors` | Available doctors + queue |
| `POST` | `/public/instant-consultations/request` | Request (specific doctor) |
| `POST` | `/public/instant-consultations/request-any` | Request (auto-assign) |
| `GET` | `/public/instant-consultations/{guest_token}/status` | Check status |
| `POST` | `/public/instant-consultations/{id}/pay` | Pay |
| `POST` | `/public/instant-consultations/bypass-payment/{id}` | Skip payment |
| `DELETE` | `/public/instant-consultations/{guest_token}` | Withdraw from queue |

**Request payload:**
```json
{
  "doctor_id": 1,
  "guest_phone": "+250781234567",
  "guest_name": "John Doe",
  "guest_email": "john@example.com",
  "description": "I have a headache",
  "password": "secret123"
}
```

`password` is optional — if provided, a patient account is auto-created and a login token is returned.

**Consultation status flow:**
```
pending → confirmed → accepted → in_progress → completed
           (paid)   (dr accepts)  (dr joins)   (dr completes)
```

> Save `guest_token` — it is the only way to track or withdraw the request.

---

### Medicine Search

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/public/medicines?q=amoxicillin` | Global search — add `lat`, `lng` for distance |
| `GET` | `/public/medicines/pharmacy/{slug}?q=...` | Search in specific pharmacy |
| `GET` | `/public/medicines/availability` | Check availability — params: `pharmacy_slug`, `medicine_id` |

</details>

---

<details>
<summary><strong>💬 Chat</strong> — appointment chat and instant consultation chat</summary>

All routes 🔒 Protected

### Appointment Chat

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/chat/{appointmentId}` | Get messages (cursor-paginated) |
| `POST` | `/chat/{appointmentId}` | Send: `{ "message": "..." }` |
| `POST` | `/chat/{appointmentId}/read` | Mark as read |

WebSocket:
```javascript
Echo.private(`appointment.${appointmentId}.chat`)
  .listen('.message.sent', (data) => console.log(data));
```

---

### Instant Consultation Chat

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/chat/instant/{consultationId}` | Get messages |
| `POST` | `/chat/instant/{consultationId}` | Send message |
| `POST` | `/chat/instant/{consultationId}/read` | Mark as read |

WebSocket channel: `private-instant-consultation.{consultationId}.chat`

</details>

---

<details>
<summary><strong>🗂 Medical Records</strong> — files, visit history, consultation summaries</summary>

All file URLs are **signed MinIO URLs** valid for 30 minutes.

### Doctor — Patient Files

| Method | Endpoint | Description |
|---|---|---|
| `GET/PUT` | `/doctor/patients/{id}/record` | View or update medical record |
| `GET` | `/doctor/patients/{id}/visits` | Visit history — filter: `?visit_type=appointment\|instant_consultation` |
| `GET/POST` | `/doctor/patients/{id}/files` | View files or upload — `multipart/form-data`, max 10MB |

Upload fields: `file`, `file_type` (`lab_result`/`scan`/`report`/`prescription`/`other`), `title`, `notes`

---

### Patient — Own Records

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/patient/my-record` | Medical record |
| `GET` | `/patient/my-visits` | Visit history |
| `GET` | `/patient/my-files` | Files |
| `GET` | `/patient/records/appointments/{id}` | Single appointment with notes + files |
| `GET` | `/patient/records/instant-consultations/{id}` | Single session with notes + files |

---

### Consultation Summaries

| Role | Endpoint | Description |
|---|---|---|
| Doctor | `POST /doctor/consultation-summaries` | Create structured summary |
| Doctor | `GET/PUT/DELETE /doctor/consultation-summaries/{id}` | Manage |
| Patient | `GET /patient/appointments/{id}/summary` | Read summary |
| Patient | `GET /patient/instant-consultations/{id}/summary` | Read summary |
| Admin | `GET /admin/records/patients/{id}` | All records for a patient |

</details>

---

*Last updated: August 2026*
