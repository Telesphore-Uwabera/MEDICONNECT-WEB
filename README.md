# MediConnect — Web Frontend

Telemedicine platform for Rwanda. Patients, doctors, hospitals, pharmacies, and admins share one React app that talks to the MediConnect API.

Book a specialist, start an instant video consult, receive a digital prescription, and send it to a pharmacy.

---

## Table of Contents

1. [Stack](#stack)
2. [Local Setup](#local-setup)
3. [Scripts](#scripts)
4. [Workspaces & Routes](#workspaces--routes)
5. [Environment Variables](#environment-variables)
6. [Infrastructure Access](#infrastructure-access)
   - [VPN](#vpn)
   - [SSH / Server](#ssh--server)
   - [Database](#database)
   - [DNS & Nameservers](#dns--nameservers)
7. [Deployment Process](#deployment-process)
   - [Stage 0 — One-time Setup](#stage-0--one-time-setup-do-this-once)
   - [Branch Strategy](#branch-strategy)
   - [Stage 1 — Start a New Change](#stage-1--start-a-new-change)
   - [Stage 2 — Make Your Changes](#stage-2--make-your-changes)
   - [Stage 3 — Check Your Work](#stage-3--check-your-work)
   - [Stage 4 — Commit Your Changes](#stage-4--commit-your-changes)
   - [Stage 5 — Push to GitHub](#stage-5--push-to-github)
   - [Stage 6 — Open a Pull Request](#stage-6--open-a-pull-request-pr)
   - [Stage 7 — Deploy to Staging](#stage-7--deploy-to-staging)
   - [Stage 8 — Promote to Production](#stage-8--promote-to-production-go-live)
   - [Stage 9 — Verify Production](#stage-9--verify-production)
   - [Hotfix — Urgent Production Fix](#hotfix--urgent-production-fix)
   - [Quick Reference Summary](#quick-reference--full-flow-summary)
   - [Netlify Environment Variables](#netlify-environment-variables)
   - [Nginx Config](#nginx-config-server-side)
8. [Full Deployment Guide — Frontend + Backend A to Z](#full-deployment-guide--frontend--backend-a-to-z)
   - [Frontend Deployment](#frontend-deployment--a-to-z)
   - [Backend Deployment](#backend-deployment--a-to-z)
   - [Combined Deployment](#combined-deployment--frontend--backend-together)
   - [Rollback](#rollback--undoing-a-bad-deploy)
   - [Quick Cheatsheet](#quick-cheatsheet)
9. [Test Credentials](#test-credentials)
9. [API Documentation](#api-documentation)
   - [Authentication](#authentication)
   - [Patient](#patient)
   - [Doctor](#doctor)
   - [Hospital](#hospital)
   - [Pharmacy](#pharmacy)
   - [Admin](#admin)
   - [Public / Guest](#public--guest)
   - [Chat — Appointments](#chat--appointments)
   - [Chat — Instant Consultations](#chat--instant-consultations)
   - [Medical Records](#medical-records)
   - [Consultation Summaries](#consultation-summaries)
   - [Quick Appointments](#quick-appointments)
   - [Doctor Wallet](#doctor-wallet)
   - [Admin Wallet](#admin-wallet)
   - [Instant Consultation Full Reference](#instant-consultation-full-reference)

---

## Stack

| Layer | Technology |
|---|---|
| UI framework | React 18, TypeScript |
| Build tool | Vite |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| Styling | Tailwind CSS, shadcn/ui |
| Forms | React Hook Form + Zod |
| Internationalisation | i18next (English, French, Kinyarwanda) |
| Realtime / WebSockets | Laravel Echo + Pusher JS (Reverb) |
| Video calls | WebRTC + Daily.co rooms |
| Rich text | Tiptap |
| Charts | Recharts |

---

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Edit .env — set VITE_APP_BASE_URL to staging or production
# Staging:    https://staging-api.mediconnect.rw/api/v1
# Production: https://api.mediconnect.rw/api/v1

# 4. Start dev server
npm run dev
```

The app runs at **http://localhost:5173** (Vite default).

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server (hot reload) |
| `npm run build` | Production build — outputs to `dist/` |
| `npm run build:dev` | Dev-mode build (source maps, no minification) |
| `npm run preview` | Serve the `dist/` folder locally |
| `npm test` | Run unit tests (single pass) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | ESLint check |

---

## Workspaces & Routes

| Role | Base route | Notes |
|---|---|---|
| Patient | `/patient` | Full access after phone verification |
| Doctor | `/doctor` | Requires admin approval |
| Hospital | `/hospital` | Requires admin approval |
| Pharmacy | `/pharmacy` | Requires admin approval |
| Admin | `/admin` | Super-admin only |
| Public | `/`, `/search`, `/doctors` | No login required |

---

## Environment Variables

All `VITE_` prefixed variables are baked into the JS bundle at build time. Never put secrets in `VITE_` variables.

```env
# API base URL (switch to production when deploying)
VITE_APP_BASE_URL=https://staging-api.mediconnect.rw/api/v1

# Laravel Reverb WebSocket
VITE_REVERB_APP_KEY=mediconnect-staging-key
VITE_REVERB_HOST=ws.mediconnect.rw
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=wss

# WebRTC TURN server
VITE_TURN_HOST=197.243.29.114
VITE_TURN_PORT=3478
VITE_TURN_SECRET=mediconnect-turn-secret

# Dev flag
VITE_DEV=true
```

For production builds, set `VITE_APP_BASE_URL=https://api.mediconnect.rw/api/v1` and `VITE_DEV=false`.

---

## Infrastructure Access

### VPN

The server lives on a private network. **Connect to VPN first** before SSH, direct DB access, or hitting internal URLs.

| Field | Value |
|---|---|
| URL | `vpn.aos.rw` |
| Username | `user.mediconnect` |
| Group | `MEDICONNECT-LTD` |

Use any standard OpenConnect or Cisco AnyConnect client.

---

### SSH / Server

Once VPN is active:

```powershell
ssh root@10.10.141.148
```

- **Host:** `10.10.141.148` (alias: `mediconnect`)
- **Username:** `root`

The server runs Nginx as the web server. Config files live in `/etc/nginx/sites-available/`.

To reload Nginx after config changes:

```bash
nginx -t          # test config first
systemctl reload nginx
```

---

### Database

**Option 1 — Browser (phpMyAdmin)**

Go to **https://db.mediconnect.rw**

- Username: `medi.connect`

No VPN required for this URL — it is publicly accessible over HTTPS with Nginx basic auth protecting it.

Nginx basic auth credentials:
- Username: `mediconnect`

**Option 2 — SSH Tunnel + desktop DB tool**

Open the tunnel (VPN must be active):

```powershell
ssh -L 3307:127.0.0.1:3306 root@10.10.141.148
```

Then connect your tool (TablePlus, DBeaver, MySQL Workbench):

| Field | Value |
|---|---|
| Host | `127.0.0.1` |
| Port | `3307` |
| Database | `mediconnect` |
| Username | `root` |

Leave the tunnel terminal open while you work.

**Option 3 — CLI on the server**

SSH in, then:

```bash
mysql -u root mediconnect
# enter password when prompted
```

---

### DNS & Nameservers

MediConnect uses `.rw` domains registered through **RICTA** (Rwanda's domain registrar).

To look up current DNS records:

```
https://www.ricta.org.rw/whois  →  search: mediconnect.rw
```

**Live URLs**

| Environment | URL |
|---|---|
| Frontend production | https://mediconnect.rw |
| Frontend staging | https://staging.mediconnect.rw |
| API production | https://api.mediconnect.rw |
| API staging | https://staging-api.mediconnect.rw |
| WebSocket | wss://ws.mediconnect.rw |
| Database admin | https://db.mediconnect.rw |

**To update DNS records**, log in to whichever DNS provider/panel is managing the zone (check WHOIS for the authoritative nameservers). If DNS is self-managed on the server, records live in `/etc/bind/` — SSH in and edit there, then restart Bind:

```bash
systemctl restart named
```

---

## Deployment Process

This section covers the full lifecycle — from writing code on your machine to going live on production. Follow these stages in order every time.

---

### Stage 0 — One-time Setup (do this once)

Before you can push anything, make sure git is configured and you have the repo cloned.

```powershell
# Set your identity (shows up in commit history)
git config --global user.name "Your Name"
git config --global user.email "you@mediconnect.rw"

# Clone the repo (if you haven't already)
git clone https://github.com/your-org/mediconnect-web.git
cd mediconnect-web

# Install dependencies
npm install

# Copy env file
cp .env.example .env
# Then edit .env and set VITE_APP_BASE_URL to staging
```

---

### Branch Strategy

```
main        ← production only — what users see on mediconnect.rw
staging     ← pre-production testing — connects to staging-api
feature/*   ← new features being built
fix/*       ← bug fixes
hotfix/*    ← urgent production fixes
```

**Rules:**
- Never commit directly to `main` or `staging`
- Every change starts on its own branch
- All branches merge into `staging` first, then `staging` → `main` for production

---

### Stage 1 — Start a New Change

Every update — whether a new feature, a bug fix, or content change — starts here.

```powershell
# Always start from the latest staging
git checkout staging
git pull origin staging

# Create your branch — name it clearly
git checkout -b feature/doctor-profile-page
# or
git checkout -b fix/login-otp-bug
# or
git checkout -b content/update-homepage-text
```

---

### Stage 2 — Make Your Changes

Edit files in `src/`. The dev server auto-refreshes as you save.

```powershell
# Start the dev server (run this in a separate terminal)
npm run dev
```

The app runs at **http://localhost:5173** connected to the **staging API**.

**For content changes** (text, images, translations):
- Text/UI content lives in `src/` component files
- Translations live in `src/locales/` — edit `en.json`, `fr.json`, `rw.json`
- Images go in `public/images/` or `src/assets/`

**For feature changes:**
- Components go in `src/components/`
- Pages go in `src/pages/`
- API calls go in `src/lib/` or `src/hooks/`

---

### Stage 3 — Check Your Work

Before committing, always verify nothing is broken.

```powershell
# Check for code errors
npm run lint

# Run tests
npm test

# Do a local production build to catch any build errors
npm run build
```

Fix any errors before moving to the next stage. Don't commit broken code.

---

### Stage 4 — Commit Your Changes

Stage only the files you actually changed — avoid `git add .` unless you're sure.

```powershell
# See what changed
git status

# Stage specific files
git add src/components/DoctorCard.tsx
git add src/pages/HomePage.tsx

# Or stage all changes in src/ only
git add src/

# Write a clear commit message
git commit -m "feat: add doctor rating display on card"
# or
git commit -m "fix: otp input not clearing on error"
# or
git commit -m "content: update homepage hero text"
```

**Commit message prefixes:**
| Prefix | Use for |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `content:` | Text, image, translation updates |
| `style:` | CSS / visual changes only |
| `refactor:` | Code restructure, no behavior change |
| `hotfix:` | Urgent production fix |

---

### Stage 5 — Push to GitHub

```powershell
# Push your branch to remote (first time)
git push -u origin feature/doctor-profile-page

# Subsequent pushes on the same branch
git push
```

---

### Stage 6 — Open a Pull Request (PR)

1. Go to your GitHub repository in the browser
2. Click **"Compare & pull request"** (appears after you push)
3. Set the base branch to **`staging`** (not `main`)
4. Write a short description of what changed and why
5. Assign a reviewer if working in a team
6. Click **"Create pull request"**

Once reviewed and approved, click **"Merge pull request"**.

---

### Stage 7 — Deploy to Staging

After merging into `staging`, deploy to the staging environment to test everything on a live server before touching production.

**Option A — Netlify auto-deploy (recommended)**

If Netlify is connected to the `staging` branch, it deploys automatically the moment you merge. Check the deploy at:
```
https://staging.mediconnect.rw
```

**Option B — Manual Netlify deploy**

```powershell
# Make sure .env has staging API URL
# VITE_APP_BASE_URL=https://staging-api.mediconnect.rw/api/v1

# Build for staging
npm run build:dev

# Deploy to Netlify staging (creates a preview URL)
npx netlify-cli deploy --dir=dist
```

**Test everything on staging** before going to production:
- Log in as each role (patient, doctor, hospital, pharmacy, admin)
- Test the specific feature or fix you made
- Check on mobile screen size
- Verify no console errors

---

### Stage 8 — Promote to Production (Go Live)

Only do this after staging is fully tested and signed off.

**Step 1 — Merge staging into main**

```powershell
git checkout main
git pull origin main
git merge staging
git push origin main
```

Or open a PR from `staging` → `main` on GitHub and merge it there.

**Step 2 — Build for production**

```powershell
# Switch .env to production API
# VITE_APP_BASE_URL=https://api.mediconnect.rw/api/v1

npm run build
```

**Step 3A — Deploy via Netlify CLI**

```powershell
# Install Netlify CLI if not already installed
npm install -g netlify-cli

# Log in (first time only)
netlify login

# Deploy to production — the --prod flag makes it live immediately
netlify deploy --dir=dist --prod
```

**Step 3B — Deploy via Netlify dashboard**

1. Go to **app.netlify.com**
2. Open the MediConnect site
3. Go to **Deploys** tab
4. Drag and drop the `dist/` folder onto the deploy area
5. Wait for "Published" status

**Step 3C — Deploy directly to server** (if not using Netlify)

```powershell
# Copy build files to server (VPN must be active)
scp -r dist/* root@10.10.141.148:/var/www/mediconnect/

# SSH in and reload Nginx
ssh root@10.10.141.148
nginx -t && systemctl reload nginx
```

---

### Stage 9 — Verify Production

After deploying, always verify on the live site:

```
https://mediconnect.rw
```

- Hard refresh the page (`Ctrl + Shift + R`) to clear cache
- Test the specific change you deployed
- Check that login still works
- Check that the API is responding (open browser DevTools → Network tab)

---

### Hotfix — Urgent Production Fix

When something is broken on production and needs an immediate fix, bypass the normal flow:

```powershell
# Branch off main directly (not staging)
git checkout main
git pull origin main
git checkout -b hotfix/fix-login-crash

# Make the fix, then commit
git add src/components/auth/SignInForm.tsx
git commit -m "hotfix: fix null crash on login OTP screen"

# Push and open a PR directly to main
git push -u origin hotfix/fix-login-crash
```

After merging to `main` and deploying, **also merge the hotfix back into staging** so it doesn't get lost:

```powershell
git checkout staging
git merge hotfix/fix-login-crash
git push origin staging
```

---

### Quick Reference — Full Flow Summary

```
Write code (feature/* or fix/* branch)
       ↓
npm run lint + npm test
       ↓
git add + git commit
       ↓
git push
       ↓
Open PR → merge into staging
       ↓
Deploy to staging → test at staging.mediconnect.rw
       ↓
Merge staging → main
       ↓
npm run build (production .env)
       ↓
netlify deploy --dir=dist --prod
       ↓
Verify at mediconnect.rw ✓
```

---

### Netlify Environment Variables

Netlify needs the same `VITE_*` variables from your `.env` to build correctly. Set them once in the dashboard — they apply to every deploy.

1. Go to **app.netlify.com** → your site → **Site configuration** → **Environment variables**
2. Add each variable:

| Key | Staging value | Production value |
|---|---|---|
| `VITE_APP_BASE_URL` | `https://staging-api.mediconnect.rw/api/v1` | `https://api.mediconnect.rw/api/v1` |
| `VITE_REVERB_APP_KEY` | `mediconnect-staging-key` | your production key |
| `VITE_REVERB_HOST` | `ws.mediconnect.rw` | `ws.mediconnect.rw` |
| `VITE_REVERB_PORT` | `443` | `443` |
| `VITE_REVERB_SCHEME` | `wss` | `wss` |
| `VITE_DEV` | `true` | `false` |

3. After adding variables, trigger a new deploy for them to take effect.

---

### Nginx Config (Server-side)

If deploying directly to the server, Nginx must be configured to serve the React app correctly. The key rule is `try_files` — without it, refreshing any page other than `/` returns a 404.

```nginx
server {
    listen 443 ssl;
    server_name mediconnect.rw www.mediconnect.rw;

    root /var/www/mediconnect;
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/mediconnect.rw/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mediconnect.rw/privkey.pem;

    location / {
        # This line is critical — sends all routes to React Router
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets for 1 year
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Never cache index.html — always serve the latest
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name mediconnect.rw www.mediconnect.rw;
    return 301 https://$host$request_uri;
}
```

After editing the Nginx config:

```bash
nginx -t                    # always test first
systemctl reload nginx      # apply without dropping connections
```

---

## Full Deployment Guide — Frontend + Backend A to Z

This section covers deploying **both** the React frontend and the Laravel backend API from scratch — from writing code all the way to users seeing the update live.

---

### Overview — Two Separate Codebases

```
mediconnect-web/          ← React frontend (this repo)
mediconnect-api/          ← Laravel backend (separate repo on the server)
```

| | Frontend | Backend |
|---|---|---|
| Language | TypeScript / React | PHP / Laravel |
| Hosted on | Netlify (or server `/var/www/mediconnect`) | Server `/var/www/mediconnect-api` |
| Build tool | Vite (`npm run build`) | Composer + Artisan |
| Runs via | Static files served by Nginx | PHP-FPM + Nginx |
| Database | — | MySQL (`mediconnect` database) |

---

## FRONTEND DEPLOYMENT — A to Z

### Step 1 — Pull the latest code

```powershell
git checkout staging
git pull origin staging
```

### Step 2 — Install any new dependencies

```powershell
npm install
```

Run this every time — someone may have added a new package since your last pull.

### Step 3 — Make your changes

Edit files inside `src/`. The dev server shows changes live:

```powershell
npm run dev
# App runs at http://localhost:5173
```

Where things live:

```
src/
├── components/        UI components (buttons, cards, modals)
├── pages/             Full page components (one per route)
├── hooks/             Custom React hooks + API calls
├── lib/               API client, utilities, helpers
├── locales/           Translations — en.json, fr.json, rw.json
└── assets/            Images, icons used in code
public/
└── images/            Public images (referenced by URL, not imported)
```

### Step 4 — Lint and test

```powershell
npm run lint
npm test
```

Fix all errors before continuing.

### Step 5 — Commit

```powershell
git add src/components/YourFile.tsx
git commit -m "feat: describe what you changed"
git push -u origin feature/your-branch-name
```

### Step 6 — Open PR and merge to staging

On GitHub:
1. Open a Pull Request: `feature/your-branch` → `staging`
2. Get it reviewed
3. Merge it

### Step 7 — Deploy to Staging

**Option A — Netlify auto-deploys** (if connected to `staging` branch)

Just merge the PR — Netlify picks it up automatically. Check progress at **app.netlify.com**.

**Option B — Manual deploy to staging**

```powershell
# Make sure .env points to staging API
# VITE_APP_BASE_URL=https://staging-api.mediconnect.rw/api/v1

npm run build:dev
npx netlify-cli deploy --dir=dist
```

This gives you a preview URL to test before going live.

**Test on staging:** `https://staging.mediconnect.rw`
- Login as each role and verify your change
- Check mobile layout
- Open DevTools → Console — should be zero errors

### Step 8 — Merge to Production

Once staging is signed off:

```powershell
git checkout main
git pull origin main
git merge staging
git push origin main
```

### Step 9 — Build for Production

```powershell
# Switch .env to production API
# VITE_APP_BASE_URL=https://api.mediconnect.rw/api/v1
# VITE_DEV=false

npm run build
```

Output goes to `dist/`.

### Step 10 — Deploy to Production

**Option A — Netlify CLI (recommended)**

```powershell
# Install CLI once
npm install -g netlify-cli

# Login once
netlify login

# Deploy live — this is what users see
netlify deploy --dir=dist --prod
```

**Option B — Netlify dashboard drag-and-drop**

1. Go to **app.netlify.com** → MediConnect site → **Deploys**
2. Drag the `dist/` folder onto the deploy zone
3. Wait for "Published"

**Option C — Direct to server** (if not using Netlify, VPN required)

```powershell
# Copy build to server
scp -r dist/* root@10.10.141.148:/var/www/mediconnect/
```

Then on the server:
```bash
nginx -t && systemctl reload nginx
```

### Step 11 — Verify Frontend is Live

```
https://mediconnect.rw
```

- Press `Ctrl + Shift + R` (hard refresh — clears browser cache)
- Test the exact feature you deployed
- Check DevTools → Network tab — API calls should return 200

---

## BACKEND DEPLOYMENT — A to Z

The backend is a **Laravel PHP API** running on the server at `/var/www/mediconnect-api`.

> **Note:** Backend deployment requires SSH access to the server. VPN must be active first.

### Step 1 — Connect VPN

Connect to VPN using your AnyConnect client:
- URL: `vpn.aos.rw`
- Username: `user.mediconnect`
- Group: `MEDICONNECT-LTD`

### Step 2 — SSH into the server

```powershell
ssh root@10.10.141.148
```

### Step 3 — Navigate to the API directory

```bash
cd /var/www/mediconnect-api
```

### Step 4 — Pull the latest backend code

```bash
git pull origin main
# or for staging backend
git pull origin staging
```

If git asks for credentials, the repo URL and token should already be cached. If not:
```bash
git remote -v   # check remote URL
```

### Step 5 — Install / update PHP dependencies

```bash
composer install --no-dev --optimize-autoloader
```

- `--no-dev` skips development-only packages (testing tools etc.)
- `--optimize-autoloader` speeds up class loading in production

### Step 6 — Run database migrations

```bash
php artisan migrate --force
```

`--force` is required in production (Laravel asks for confirmation otherwise).

To also seed reference data (only if needed):
```bash
php artisan db:seed --force
```

> **Warning:** Only run seeders if you know what they do. Some seeders wipe and re-insert data.

### Step 7 — Clear and rebuild all caches

Run all of these — in this order:

```bash
php artisan config:clear
php artisan config:cache

php artisan route:clear
php artisan route:cache

php artisan view:clear
php artisan view:cache

php artisan event:clear
php artisan event:cache
```

Or run them all in one line:
```bash
php artisan optimize:clear && php artisan optimize
```

This is critical — without it, Laravel may keep serving old config values or cached routes.

### Step 8 — Set correct file permissions

Laravel needs write access to `storage/` and `bootstrap/cache/`:

```bash
chown -R www-data:www-data /var/www/mediconnect-api/storage
chown -R www-data:www-data /var/www/mediconnect-api/bootstrap/cache
chmod -R 775 /var/www/mediconnect-api/storage
chmod -R 775 /var/www/mediconnect-api/bootstrap/cache
```

Without this, file uploads, logs, and sessions will fail silently.

### Step 9 — Restart PHP-FPM

PHP-FPM caches compiled PHP files (OPcache). Restart it to load the new code:

```bash
systemctl restart php8.2-fpm
```

If you're not sure which PHP version is running:
```bash
php -v
# Then use that version number: php8.1-fpm, php8.3-fpm, etc.
```

### Step 10 — Reload Nginx

```bash
nginx -t && systemctl reload nginx
```

Always run `nginx -t` first — it validates the config before applying it.

### Step 11 — Check the API is responding

```bash
curl -s https://api.mediconnect.rw/api/v1/public/instant-consultations/doctors | head -c 200
```

You should see a JSON response with doctors. If you see an error, check the logs:

```bash
# Laravel error log
tail -50 /var/www/mediconnect-api/storage/logs/laravel.log

# Nginx error log
tail -50 /var/log/nginx/error.log

# PHP-FPM log
tail -50 /var/log/php8.2-fpm.log
```

### Step 12 — Verify on staging/production

Test key API endpoints:
```
https://api.mediconnect.rw/api/v1/public/instant-consultations/doctors
```

Then test from the frontend — log in, book an appointment, check that everything flows end-to-end.

---

## COMBINED DEPLOYMENT — Frontend + Backend Together

When a feature requires both frontend and backend changes (most features do), deploy in this order:

```
1. Deploy backend first   ← API must be ready before frontend calls it
2. Verify API works       ← curl or Postman test
3. Deploy frontend        ← now frontend can use the new API endpoints
4. Verify end-to-end      ← test the full feature on live site
```

Never deploy frontend first if it depends on new API endpoints — users will see errors until the backend catches up.

---

## ROLLBACK — Undoing a Bad Deploy

### Frontend rollback

**Via Netlify dashboard:**
1. Go to **app.netlify.com** → MediConnect → **Deploys**
2. Find the last working deploy in the list
3. Click it → click **"Publish deploy"**

Takes effect in under 30 seconds.

**Via git:**
```powershell
git checkout main
git revert HEAD
git push origin main
# Then redeploy
netlify deploy --dir=dist --prod
```

### Backend rollback

```bash
# On the server — go back one commit
cd /var/www/mediconnect-api
git log --oneline -10    # find the last working commit hash

git checkout abc1234     # replace with actual commit hash

# Re-run the post-deploy steps
composer install --no-dev --optimize-autoloader
php artisan optimize:clear && php artisan optimize
systemctl restart php8.2-fpm
nginx -t && systemctl reload nginx
```

> If migrations were run, rolling back is more complex — you may need `php artisan migrate:rollback` before reverting the code.

---

## QUICK CHEATSHEET

### Frontend deploy (30 seconds once code is merged)

```powershell
git checkout main && git pull origin main
# Edit .env: VITE_APP_BASE_URL=https://api.mediconnect.rw/api/v1
npm run build
netlify deploy --dir=dist --prod
```

### Backend deploy (run on server via SSH)

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

### After every deploy — sanity check

```bash
# API alive?
curl -s https://api.mediconnect.rw/api/v1/public/instant-consultations/doctors

# Frontend alive?
# Open https://mediconnect.rw in browser — Ctrl+Shift+R
```

---

## Test Credentials

Use these against the **staging API** (`https://staging-api.mediconnect.rw/api/v1`).

| Role | Email | Phone | Country code |
|---|---|---|---|
| Admin | admin@mediconnect.rw | 0780000000 | +250 |
| Patient | patient@mediconnect.rw | 0781111111 | +250 |
| Doctor | doctor@mediconnect.rw | 0782222222 | +250 |
| Hospital | hospital@mediconnect.rw | 0783333333 | +250 |
| Pharmacy | pharmacy@mediconnect.rw | 0784444444 | +250 |

All test account passwords follow the pattern `Role@2026!` (e.g. `Admin@2026!`, `Doctor@2026!`).

---

## API Documentation

**Base URL (staging):** `https://staging-api.mediconnect.rw/api/v1`  
**Base URL (production):** `https://api.mediconnect.rw/api/v1`

**Required headers on every request:**

```http
Content-Type: application/json
Accept: application/json
```

Protected routes additionally need:

```http
Authorization: Bearer {token}
```

---

## Authentication

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

Response `201`:
```json
{
  "message": "Account created. Please verify your phone number.",
  "user_id": 1
}
```

---

### Send OTP

`POST /auth/send-otp`

Phone:
```json
{
  "phone": "0781234567",
  "country_code": "+250",
  "type": "register"
}
```

Email:
```json
{
  "email": "john@example.com",
  "type": "login"
}
```

`type` is `register`, `login`, or `reset`. Response `200`: `{ "message": "OTP sent successfully." }`

Rate limit error:
```json
{ "message": "Too many OTP requests. Try again in 3600 seconds." }
```

---

### Verify OTP

`POST /auth/verify-otp`

```json
{
  "phone": "0781234567",
  "country_code": "+250",
  "code": "123456",
  "type": "register"
}
```

Response `200`:
```json
{
  "message": "Verified successfully.",
  "token": "1|abc123...",
  "user": { "id": 1, "name": "John Doe", "role": "patient", "is_verified": true }
}
```

Errors: `"Incorrect OTP."` (with `attempts_remaining`), `"OTP has expired."`, `"Too many wrong attempts. Please wait 15 minutes."`

---

### Login

`POST /auth/login`

Phone + OTP:
```json
{ "phone": "0781234567", "country_code": "+250", "auth_method": "otp" }
```

Phone + Password:
```json
{ "phone": "0781234567", "country_code": "+250", "auth_method": "password", "password": "password123" }
```

Email + Password:
```json
{ "email": "john@example.com", "auth_method": "password", "password": "password123" }
```

Response `200`:
```json
{
  "message": "Logged in successfully.",
  "token": "1|abc123...",
  "user": { "id": 1, "name": "John Doe", "role": "patient", "is_verified": true }
}
```

---

### Other Auth Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/me` | 🔒 | Get current user |
| `POST` | `/auth/logout` | 🔒 | Logout |
| `POST` | `/auth/refresh-token` | 🔒 | Refresh token |
| `POST` | `/auth/guest` | Public | Create guest session |
| `POST` | `/auth/guest/convert` | Public | Convert guest to full account |
| `GET` | `/auth/social/{provider}/redirect` | Public | Google/Facebook redirect |

**Guest session** payload:
```json
{ "phone": "0781234567", "country_code": "+250", "name": "John Doe" }
```

Response includes `guest_token` and `expires_at`.

---

## Patient

Base path: `/patient` — all routes 🔒 Protected

### Profile

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/profile` | Get profile |
| `POST` | `/profile` | Create / update profile |
| `POST` | `/profile/avatar` | Upload avatar (`multipart/form-data`, max 2MB) |
| `GET` | `/profile/medical` | Get medical info |
| `POST` | `/profile/medical` | Save medical info |
| `GET` | `/profile/insurance` | Get linked insurance |
| `POST` | `/profile/insurance` | Update insurance |

Profile payload (all fields optional on update):
```json
{
  "name": "John Doe",
  "date_of_birth": "1990-01-01",
  "gender": "male",
  "national_id": "1199012345678901",
  "blood_type": "O+",
  "address": "KG 123 St",
  "city": "Kigali",
  "province": "Kigali",
  "country": "Rwanda",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_phone": "0789999999",
  "emergency_contact_relation": "Sister",
  "preferred_language": "en"
}
```

Medical info payload:
```json
{
  "allergies": ["Penicillin"],
  "chronic_conditions": ["Diabetes"],
  "current_medications": ["Metformin"],
  "previous_surgeries": [],
  "family_history": ["Hypertension"],
  "smoking_status": "never",
  "alcohol_use": "occasional",
  "notes": "Allergic to dust"
}
```

Insurance payload:
```json
{ "insurance_id": 1, "insurance_number": "RSSB-123456" }
```

---

### Appointments

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/appointments` | List appointments |
| `POST` | `/appointments` | Book appointment |
| `GET` | `/appointments/{id}` | Get single appointment |
| `POST` | `/appointments/{id}/pay` | Pay for appointment |
| `POST` | `/appointments/{id}/join` | Join video session |
| `DELETE` | `/appointments/{id}` | Cancel appointment |

**List** query params: `status`, `type`, `date`, `date_from`, `date_to`

**Book** payload:
```json
{
  "doctor_id": 1,
  "type": "online",
  "appointment_date": "2026-06-01",
  "appointment_time": "09:00",
  "hospital_id": null,
  "insurance_id": 1
}
```

`hospital_id` required when `type` is `in_person`.

**Pay** payload:
```json
{ "method": "mtn_momo", "phone": "07XXXXXXXX" }
```

Methods: `mtn_momo`, `airtel_money`, `card`, `cash`, `insurance_full`

**Join** response includes `room_url` and `token`.

---

### Search

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/search/doctors` | Search doctors |
| `GET` | `/search/hospitals` | Search hospitals |
| `GET` | `/search/hospitals/{id}` | Hospital detail |
| `GET` | `/search/hospitals/{id}/services` | Hospital services |
| `GET` | `/search/hospitals/{id}/departments` | Hospital departments |

**Doctor search params:** `q`, `specialization`, `type`, `language`, `city`, `gender`, `hospital_id`, `insurance_id`, `available_today`, `instant`

**Hospital search params:** `q`, `city`, `type`, `insurance_id`, `open_now`

---

### Service Bookings (Patient)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/service-bookings/availability` | Check availability |
| `GET` | `/service-bookings` | List my bookings |
| `GET` | `/service-bookings/{id}` | Get single booking |
| `POST` | `/service-bookings` | Request a service |
| `DELETE` | `/service-bookings/{id}` | Cancel booking |

**Availability** params (all required): `hospital_id`, `hospital_service_id`, `preferred_date` (Y-m-d), `preferred_time` (H:i)

**Book** payload:
```json
{
  "hospital_id": 1,
  "hospital_service_id": 3,
  "department_id": 2,
  "preferred_date": "2026-06-01",
  "preferred_time": "09:00",
  "notes": "I need this urgently"
}
```

---

### Fitness Certificates (Patient)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/certificates/available-doctors` | List available cert doctors |
| `POST` | `/certificates/step/{step}` | Save step (1–4) |
| `POST` | `/certificates/submit` | Submit request |
| `POST` | `/certificates/withdraw` | Withdraw request |
| `GET` | `/certificates/request` | Get current request |
| `GET` | `/certificates/request/step/{step}` | Get step data |
| `GET` | `/certificates` | List my certificates |
| `GET` | `/certificates/{id}` | Get single certificate |
| `GET` | `/certificates/{id}/download` | Download PDF URL |

**Step 1 payload:**
```json
{ "purpose": "general_fitness", "job_type": "None of the above" }
```

`purpose` values: `general_fitness`, `school_work`, `return_to_work`, `fitness_for_travel`, `other`

**Steps 2–3 payload:**
```json
{ "answers": { "fever_72h": "No", "headache_dizziness": "No" } }
```

**Step 4 payload:**
```json
{
  "answers": { "walk_without_difficulty": "Yes" },
  "temperature": "36.6",
  "blood_pressure": "120/80",
  "pulse": "72",
  "oxygen_saturation": "98",
  "notes": "Patient feels well"
}
```

---

### Patient Dashboard

```
GET /patient/dashboard?period=month&appointment_type=all&status=all&chart_group=day
```

Period options: `today`, `week`, `month`, `year`, `custom&start_date=...&end_date=...`  
Chart group options: `day`, `week`, `month`

---

### Patient Medical Records (Self)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/patient/my-record` | My medical record |
| `GET` | `/patient/my-visits` | My visit history |
| `GET` | `/patient/my-files` | My uploaded files |
| `GET` | `/patient/records/appointments` | Appointments with notes/files |
| `GET` | `/patient/records/appointments/{id}` | Single appointment summary |
| `GET` | `/patient/records/instant-consultations` | Instant consultations |
| `GET` | `/patient/records/instant-consultations/{id}` | Single session summary |

Filter visits by type: `?visit_type=appointment` or `?visit_type=instant_consultation`  
Filter files by type: `?file_type=lab_result|scan|report|prescription|other`

---

### Quick Appointments (Patient)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/patient/quick` | List my quick requests |
| `POST` | `/patient/quick` | Request quick appointment |
| `GET` | `/patient/quick/{id}/status` | Check status |
| `DELETE` | `/patient/quick/{id}` | Cancel request |

**Request** payload:
```json
{ "type": "online", "insurance_id": null }
```

---

### Instant Consultation (Patient — Active Session)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/patient/instant-consultations/active-session` | Active session (any status) |
| `GET` | `/patient/instant-consultations/active-session/live` | Live session (`in_progress` only) |

---

## Doctor

Base path: `/doctor` — all routes 🔒 Protected

### Profile

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/doctor/profile` | Get profile |
| `POST` | `/doctor/profile` | Create / update profile |
| `POST` | `/doctor/profile/image` | Upload image (`multipart/form-data`) |

Profile payload:
```json
{
  "specialization": "Cardiologist",
  "doctor_degree": "MD",
  "medical_license": "RW-12345",
  "bio_en": "Experienced cardiologist...",
  "consultation_type": "both",
  "preferred_language": "en",
  "is_available": true
}
```

`consultation_type`: `online`, `in_person`, or `both`

---

### Availability

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/doctor/availability` | Get availability |
| `POST` | `/doctor/availability` | Create recurring slot |
| `PUT` | `/doctor/availability/{id}` | Update recurring slot |
| `DELETE` | `/doctor/availability/{id}` | Delete recurring slot |
| `POST` | `/doctor/availability/periods` | Create availability period |
| `PUT` | `/doctor/availability/periods/{id}` | Update period |
| `DELETE` | `/doctor/availability/periods/{id}` | Delete period |

**Recurring slot** payload:
```json
{
  "day_of_week": "monday",
  "start_time": "09:00",
  "end_time": "17:00",
  "slot_duration_minutes": 30,
  "buffer_minutes": 5,
  "type": "online",
  "hospital_id": null
}
```

**Availability period** payload:
```json
{
  "from_date": "2026-06-01",
  "to_date": "2026-06-30",
  "days_of_week": ["monday", "wednesday", "friday"],
  "start_time": "09:00",
  "end_time": "13:00",
  "slot_duration_minutes": 30,
  "type": "in_person",
  "hospital_id": 1,
  "label": "June Schedule"
}
```

---

### Slots

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/doctor/slots` | Get slots |
| `PATCH` | `/doctor/slots/{id}` | Update single slot |
| `POST` | `/doctor/slots/bulk` | Bulk update by date |
| `POST` | `/doctor/slots/generate` | Generate slots manually |

Slot query params: `date`, `from`, `to`, `status` (`available`/`booked`/`blocked`/`reserved`), `type`

---

### Toggles

| Method | Endpoint | Description |
|---|---|---|
| `PATCH` | `/doctor/toggle/instant` | Toggle instant consultation on/off |
| `PATCH` | `/doctor/toggle/pause` | Pause / resume bookings |

---

### Appointments (Doctor)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/doctor/appointments` | List appointments |
| `GET` | `/doctor/appointments/{id}` | Get single appointment |
| `POST` | `/doctor/appointments/{id}/accept` | Accept quick appointment |
| `POST` | `/doctor/appointments/{id}/join` | Join session |
| `POST` | `/doctor/appointments/{id}/notes` | Add notes |
| `PUT` | `/doctor/appointments/{id}/notes` | Update notes |
| `POST` | `/doctor/appointments/{id}/complete` | Complete appointment |
| `POST` | `/doctor/appointments/{id}/running-late` | Notify delay |
| `POST` | `/doctor/appointments/{id}/ready-next` | Notify next patient |

**Notes** payload:
```json
{
  "chief_complaint": "Chest pain",
  "diagnosis": "Hypertension",
  "treatment_plan": "Prescribed lisinopril 10mg daily",
  "recommendations": "Low sodium diet",
  "additional_notes": "Return in 4 weeks",
  "blood_pressure": "140/90",
  "temperature": "37.2",
  "pulse_rate": "82",
  "weight": "75",
  "height": "170",
  "follow_up_date": "2026-06-22",
  "follow_up_notes": "Review blood pressure",
  "needs_follow_up": true,
  "is_visible_to_patient": true
}
```

**Running late** payload: `{ "delay_minutes": 15 }` (5–120)

---

### Instant Consultations (Doctor)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/doctor/instant-consultations/queue` | Queue + stats |
| `GET` | `/doctor/instant-consultations/live-session` | Current live session |
| `POST` | `/doctor/instant-consultations/{id}/accept` | Accept request |
| `POST` | `/doctor/instant-consultations/{id}/join` | Join session |
| `POST` | `/doctor/instant-consultations/{id}/decline` | Decline request |
| `POST` | `/doctor/instant-consultations/{id}/complete` | Complete session |
| `GET` | `/doctor/instant-consultations/{id}/notes` | Get session notes |
| `PUT` | `/doctor/instant-consultations/{id}/notes` | Save session notes |
| `POST` | `/doctor/instant-consultations/{id}/files` | Upload file to session |

**Notes** payload: `{ "notes": "Patient complaint details..." }`

**Upload file** — `multipart/form-data`: `file`, `file_type`, `title`, `notes`

---

### Prescriptions (Doctor)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/doctor/prescriptions` | List prescriptions |
| `POST` | `/doctor/prescriptions` | Create draft |
| `GET` | `/doctor/prescriptions/{id}` | Get single |
| `PUT` | `/doctor/prescriptions/{id}` | Update draft |
| `POST` | `/doctor/prescriptions/{id}/items` | Add medicine item |
| `DELETE` | `/doctor/prescriptions/{id}/items/{itemId}` | Remove item |
| `POST` | `/doctor/prescriptions/{id}/issue` | Issue (sign) prescription |
| `POST` | `/doctor/prescriptions/{id}/send-to-pharmacy` | Send to pharmacy |

**Create** payload:
```json
{
  "appointment_id": 1,
  "diagnosis": "Viral infection",
  "notes": "Take with food",
  "valid_until": "2026-06-30",
  "items": [
    {
      "medicine_name": "Paracetamol",
      "dosage": "500mg",
      "frequency": "3x daily",
      "duration": "5 days",
      "quantity": 15,
      "instructions": "Take after meals"
    }
  ]
}
```

**Send to pharmacy** payload:
```json
{
  "pharmacy_id": 1,
  "delivery_type": "home_delivery",
  "delivery_address": "KG 123 St, Kigali",
  "notes": "Call before delivery"
}
```

`delivery_type`: `pickup` or `home_delivery`

---

### Doctor Profile — Education, Experience, Qualifications, Social Links

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/doctor/education` | Add education |
| `PUT` | `/doctor/education/{id}` | Update education |
| `DELETE` | `/doctor/education/{id}` | Delete education |
| `POST` | `/doctor/experience` | Add experience |
| `PUT` | `/doctor/experience/{id}` | Update experience |
| `DELETE` | `/doctor/experience/{id}` | Delete experience |
| `GET` | `/doctor/qualifications` | List qualifications |
| `POST` | `/doctor/qualifications` | Add qualification (`multipart/form-data`) |
| `PUT` | `/doctor/qualifications/{id}` | Update qualification |
| `DELETE` | `/doctor/qualifications/{id}` | Delete qualification |
| `POST` | `/doctor/social-links` | Set social links |

---

### Doctor — Service Bookings

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/doctor/service-bookings/availability` | Check availability |
| `GET` | `/doctor/service-bookings` | List bookings |
| `GET` | `/doctor/service-bookings/{id}` | Get single booking |
| `POST` | `/doctor/service-bookings` | Book service for patient |
| `DELETE` | `/doctor/service-bookings/{id}` | Cancel booking |

**Book for patient** — all `patient_id`, `hospital_id`, `hospital_service_id`, `preferred_date`, `preferred_time` required.

---

### Doctor — Patient Medical Records (Doctor Access)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/doctor/patients/{patientId}/record` | View patient record |
| `PUT` | `/doctor/patients/{patientId}/record` | Update patient record |
| `GET` | `/doctor/patients/{patientId}/visits` | Patient visit history |
| `GET` | `/doctor/patients/{patientId}/files` | Patient files |
| `POST` | `/doctor/patients/{patientId}/files` | Upload file for patient |

Doctor can only access records of patients they have previously treated.

---

### Doctor Wallet

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/doctor/wallet` | Get wallet balance |
| `GET` | `/doctor/wallet/earnings` | Earnings breakdown |
| `GET` | `/doctor/wallet/withdrawals` | List withdrawal requests |
| `POST` | `/doctor/wallet/withdraw` | Request withdrawal |
| `POST` | `/doctor/wallet/cancel-withdrawal/{id}` | Cancel withdrawal |

**Withdrawal** payload:
```json
{
  "amount": 100,
  "method": "mobile_money",
  "account_number": "0781234567",
  "account_name": "John Doe",
  "note": "Monthly withdrawal"
}
```

`method`: `bank_transfer` or `mobile_money`

---

### Doctor Dashboard

```
GET /doctor/dashboard?period=month&chart_group=day
```

Same period/chart_group options as Patient Dashboard.

---

### Consultation Summaries (Doctor)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/doctor/consultation-summaries` | Create summary |
| `GET` | `/doctor/consultation-summaries` | List summaries |
| `GET` | `/doctor/consultation-summaries/{id}` | Get single summary |
| `PUT` | `/doctor/consultation-summaries/{id}` | Update summary |
| `DELETE` | `/doctor/consultation-summaries/{id}` | Delete summary |

**Create** payload includes: `appointment_id` or `instant_consultation_id`, `patient_id`, `chief_complaint`, `history_of_present_illness`, `review_of_systems`, `red_flag_screening`, `clinical_assessment`, `management_plan`.

---

## Hospital

Base path: `/hospital` — all routes 🔒 Protected

### Profile

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/hospital/profile` | Get profile |
| `POST` | `/hospital/profile` | Create / update profile |
| `POST` | `/hospital/profile/logo` | Upload logo |
| `POST` | `/hospital/profile/image` | Upload cover image |

`type` values: `hospital`, `clinic`, `health_center`, `pharmacy_clinic`

---

### Working Hours & Closures

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/hospital/working-hours` | Get working hours |
| `POST` | `/hospital/working-hours` | Set all days (bulk upsert) |
| `PUT` | `/hospital/working-hours/{id}` | Update single day |
| `DELETE` | `/hospital/working-hours/{id}` | Delete single day |
| `DELETE` | `/hospital/working-hours/reset` | Reset all |
| `GET` | `/hospital/closures` | List closures |
| `POST` | `/hospital/closures` | Create closure |
| `PUT` | `/hospital/closures/{id}` | Update closure |
| `DELETE` | `/hospital/closures/{id}` | Delete closure |
| `POST` | `/hospital/closures/check-date` | Check if closed on date |

**Working hours bulk** payload:
```json
{
  "hours": [
    { "day_of_week": "monday", "open_time": "08:00", "close_time": "20:00", "is_closed": false, "max_patients": 50 },
    { "day_of_week": "sunday", "is_closed": true }
  ]
}
```

---

### Departments

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/hospital/departments` | List departments |
| `GET` | `/hospital/departments/{id}` | Get single |
| `POST` | `/hospital/departments` | Create department |
| `PUT` | `/hospital/departments/{id}` | Update department |
| `DELETE` | `/hospital/departments/{id}` | Delete department |

---

### Services

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/hospital/services` | List services |
| `GET` | `/hospital/services/{id}` | Get single service |
| `POST` | `/hospital/services` | Create service |
| `PUT` | `/hospital/services/{id}` | Update service |
| `DELETE` | `/hospital/services/{id}` | Delete service |

`price_type`: `fixed`, `from`, `negotiable`, `free`  
`type`: `online`, `in_person`, `both`

---

### Insurances (Hospital)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/hospital/insurances` | List linked insurances |
| `POST` | `/hospital/insurances` | Link insurance |
| `PUT` | `/hospital/insurances/{id}` | Update coverage |
| `DELETE` | `/hospital/insurances/{id}` | Unlink insurance |

---

### Service Bookings (Hospital)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/hospital/service-bookings` | List incoming bookings |
| `GET` | `/hospital/service-bookings/{id}` | Get single booking |
| `POST` | `/hospital/service-bookings/{id}/accept` | Accept booking |
| `POST` | `/hospital/service-bookings/{id}/reject` | Reject booking |
| `POST` | `/hospital/service-bookings/{id}/complete` | Complete booking |

Accepting triggers a payment request to the patient. Booking expires automatically if not paid within 24h.

---

### Toggles (Hospital)

| Method | Endpoint | Description |
|---|---|---|
| `PATCH` | `/hospital/toggle/active` | Hide/show hospital entirely |
| `PATCH` | `/hospital/toggle/accepting` | Pause/resume bookings |

`is_active = false` → removed from search entirely.  
`is_accepting_bookings = false` → visible but no bookings.

---

### Hospital Dashboard

```
GET /hospital/dashboard?period=month&chart_group=day&department_id=1&status=completed
```

---

## Pharmacy

Base path: `/pharmacy` — all routes 🔒 Protected

### Profile

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/pharmacy/profile` | Get profile |
| `POST` | `/pharmacy/profile` | Create / update profile |
| `POST` | `/pharmacy/profile/submit` | Submit for approval + payment |
| `POST` | `/pharmacy/profile/logo` | Upload logo |
| `POST` | `/pharmacy/profile/image` | Upload cover image |

---

### Working Hours & Closures

Same structure as Hospital — endpoints prefixed with `/pharmacy/working-hours` and `/pharmacy/closures`.

---

### Inventory Mode

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/pharmacy/inventory/mode` | Get mode (`internal` or `external`) |
| `PATCH` | `/pharmacy/inventory/mode` | Switch mode |

`external` mode requires at least one active provider connected first.

---

### Medicine Categories

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/pharmacy/inventory/categories` | List categories |
| `POST` | `/pharmacy/inventory/categories` | Create category |
| `PUT` | `/pharmacy/inventory/categories/{id}` | Update category |
| `DELETE` | `/pharmacy/inventory/categories/{id}` | Delete category |

---

### Medicines (Internal)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/pharmacy/inventory/medicines` | List medicines |
| `GET` | `/pharmacy/inventory/medicines/{id}` | Get single |
| `POST` | `/pharmacy/inventory/medicines` | Add medicine |
| `PUT` | `/pharmacy/inventory/medicines/{id}` | Update medicine |
| `DELETE` | `/pharmacy/inventory/medicines/{id}` | Remove medicine |

`unit` values: `tablet`, `capsule`, `syrup`, `injection`, `cream`, `drops`, `sachet`, `other`

---

### Stock

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/pharmacy/inventory/stock` | List stock |
| `GET` | `/pharmacy/inventory/stock/{medicineId}` | Get stock for medicine |
| `PUT` | `/pharmacy/inventory/stock/{medicineId}` | Update stock details |
| `POST` | `/pharmacy/inventory/stock/{medicineId}/adjust` | Adjust quantity |

Adjust: positive = add, negative = deduct. Cannot go below 0.

---

### Stock Requests

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/pharmacy/inventory/stock-requests` | List requests |
| `POST` | `/pharmacy/inventory/stock-requests` | Create request |
| `POST` | `/pharmacy/inventory/stock-requests/{id}/approve` | Approve |
| `POST` | `/pharmacy/inventory/stock-requests/{id}/receive` | Receive stock |
| `POST` | `/pharmacy/inventory/stock-requests/{id}/reject` | Reject |
| `DELETE` | `/pharmacy/inventory/stock-requests/{id}` | Delete (pending only) |

---

### Prescription Requests (Pharmacy)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/pharmacy/prescription-requests` | List |
| `GET` | `/pharmacy/prescription-requests/{id}` | Get single |
| `POST` | `/pharmacy/prescription-requests/{id}/review` | Mark as reviewing |
| `POST` | `/pharmacy/prescription-requests/{id}/approve` | Approve |
| `POST` | `/pharmacy/prescription-requests/{id}/reject` | Reject |
| `POST` | `/pharmacy/prescription-requests/{id}/fulfill` | Mark fulfilled |

---

### Orders (Pharmacy)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/pharmacy/orders` | List orders |
| `GET` | `/pharmacy/orders/{id}` | Get single order |
| `POST` | `/pharmacy/orders/{id}/accept` | Accept |
| `POST` | `/pharmacy/orders/{id}/reject` | Reject |
| `POST` | `/pharmacy/orders/{id}/complete` | Complete (deducts stock for internal orders) |

---

### External Providers (Pharmacy)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/pharmacy/inventory/external/providers` | List providers |
| `POST` | `/pharmacy/inventory/external/providers` | Connect provider |
| `PUT` | `/pharmacy/inventory/external/providers/{id}` | Update provider |
| `DELETE` | `/pharmacy/inventory/external/providers/{id}` | Remove provider |
| `POST` | `/pharmacy/inventory/external/providers/{id}/sync` | Manual sync |
| `GET` | `/pharmacy/inventory/external/providers/{id}/sync-logs` | Sync logs |
| `GET` | `/pharmacy/inventory/external/items` | List external inventory |
| `GET` | `/pharmacy/inventory/external/items/{id}` | Get item |

`auth_type`: `api_key`, `bearer`, or `basic`. Rate limited to 5 manual syncs/hour.

---

### Gallery & Social Links (Pharmacy)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/pharmacy/images` | List gallery images |
| `POST` | `/pharmacy/images` | Upload image |
| `DELETE` | `/pharmacy/images/{id}` | Delete image |
| `GET` | `/pharmacy/social-links` | Get social links |
| `POST` | `/pharmacy/social-links` | Set social links |

---

### Pharmacy Dashboard

```
GET /pharmacy/dashboard?period=month&chart_group=day
```

---

## Admin

Base path: `/admin` — all routes 🔒 Protected (admin token required)

### Users & Roles

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/users` | List all users |
| `GET` | `/admin/users/{id}` | Get user |
| `PUT` | `/admin/users/{id}/suspend` | Suspend user |
| `PUT` | `/admin/users/{id}/activate` | Activate user |
| `DELETE` | `/admin/users/{id}` | Delete user |
| `GET` | `/admin/patients` | List patients |
| `GET` | `/admin/patients/{id}` | Get patient |
| `PUT` | `/admin/patients/{id}/suspend` | Suspend patient |
| `PUT` | `/admin/patients/{id}/activate` | Activate patient |

---

### Doctors (Admin)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/doctors` | List doctors |
| `GET` | `/admin/doctors/{id}` | Get doctor |
| `PUT` | `/admin/doctors/{id}/approve` | Approve |
| `PUT` | `/admin/doctors/{id}/reject` | Reject |
| `PUT` | `/admin/doctors/{id}/suspend` | Suspend |

---

### Hospitals & Pharmacies (Admin)

Same approve/reject/suspend pattern:

- Hospitals: `/admin/hospitals/*`
- Pharmacies: `/admin/pharmacies/*`

---

### Instant Consultation Whitelist

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/instant-consultations` | List whitelist |
| `POST` | `/admin/instant-consultations` | Add doctor to whitelist |
| `PUT` | `/admin/instant-consultations/{id}` | Enable/disable doctor |
| `DELETE` | `/admin/instant-consultations/{id}` | Remove from whitelist |

Setting `active: false` immediately removes the doctor from the patient-facing list.

---

### Certification Doctors

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/certification-doctors` | List |
| `POST` | `/admin/certification-doctors` | Add to team |
| `PUT` | `/admin/certification-doctors/{id}` | Update status/availability |
| `DELETE` | `/admin/certification-doctors/{id}` | Remove |

---

### Specializations & Fees

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/specializations` | List |
| `POST` | `/admin/specializations` | Create |
| `PUT` | `/admin/specializations/{id}` | Update |
| `DELETE` | `/admin/specializations/{id}` | Delete |
| `GET` | `/admin/specialization-fees` | List fees |
| `POST` | `/admin/specialization-fees` | Create fee |
| `PUT` | `/admin/specialization-fees/{id}` | Update fee |
| `DELETE` | `/admin/specialization-fees/{id}` | Delete fee |
| `GET` | `/admin/doctor-consultations` | List doctor consultations |
| `POST` | `/admin/doctor-consultations` | Assign doctor to fee tier |
| `PUT` | `/admin/doctor-consultations/{doctorId}` | Update |
| `PUT` | `/admin/doctor-consultations/{doctorId}/fee-override` | Set/clear fee override |

---

### Insurances (Admin)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/insurances` | List |
| `POST` | `/admin/insurances` | Create |
| `GET` | `/admin/insurances/{id}` | Get single |
| `PUT` | `/admin/insurances/{id}` | Update |
| `POST` | `/admin/insurances/{id}/logo` | Upload logo |
| `DELETE` | `/admin/insurances/{id}` | Delete |

---

### Reviews, Settings & Maintenance

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/reviews` | List reviews |
| `POST` | `/admin/reviews/{id}/approve` | Approve review |
| `POST` | `/admin/reviews/{id}/reject` | Reject review |
| `DELETE` | `/admin/reviews/{id}` | Delete review |
| `GET` | `/admin/settings/{group}` | Get settings by group |
| `PUT` | `/admin/settings/{group}` | Update settings |
| `GET` | `/admin/maintenance` | Get maintenance status |
| `PUT` | `/admin/maintenance` | Update maintenance message |
| `POST` | `/admin/maintenance/toggle` | Toggle maintenance mode |

---

### Admin Wallet

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/wallets/doctors` | List all doctor wallets |
| `GET` | `/admin/wallets/doctors/{doctorId}` | Get doctor wallet |
| `POST` | `/admin/wallets/doctors/{doctorId}/topup` | Top up doctor wallet |
| `POST` | `/admin/wallets/doctors/{doctorId}/deduct` | Deduct from doctor wallet |
| `DELETE` | `/admin/wallets/doctors/{doctorId}` | Remove doctor wallet |
| `GET` | `/admin/wallets/main` | Get main wallet |
| `POST` | `/admin/wallets/main/topup` | Top up main wallet |
| `POST` | `/admin/wallets/main/deduct` | Deduct from main wallet |
| `GET` | `/admin/wallets/withdrawal-requests` | List withdrawal requests |
| `GET` | `/admin/wallets/withdrawal-requests/{id}` | View + auto-move to processing |
| `PUT` | `/admin/wallets/withdrawal-requests/{id}/approve` | Approve |
| `PUT` | `/admin/wallets/withdrawal-requests/{id}/complete` | Complete (deducts both wallets) |
| `PUT` | `/admin/wallets/withdrawal-requests/{id}/reject` | Reject |
| `PUT` | `/admin/wallets/withdrawal-requests/{id}/cancel` | Cancel |

Withdrawal status flow: `pending → processing → approved → completed`

---

### Admin Medical Records

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/records/patients/{patientId}` | All records for patient |
| `GET` | `/admin/records/patients/{patientId}/instant-consultations` | Patient instant consultations |
| `GET` | `/admin/records/patients/{patientId}/appointments` | Patient appointments |
| `GET` | `/admin/records/instant-consultations/{id}` | Session summary |
| `GET` | `/admin/records/appointments/{id}` | Appointment summary |

---

### Admin Appointments

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/appointments` | List all appointments |
| `GET` | `/admin/appointments/{id}` | Get single |

Query params: `status`, `type`, `booking_type`, `date`, `doctor_id`

---

## Public / Guest

Base path: `/public` — no authentication needed

### Medicine Search

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/public/medicines` | Search medicines globally |
| `GET` | `/public/medicines/pharmacy/{slug}` | Search in specific pharmacy |
| `GET` | `/public/medicines/availability` | Check availability |

**Global search** params: `q` (min 2 chars, required), `lat`, `lng`, `radius` (km, default 10, max 100)

Distance is returned when `lat` and `lng` are provided.

---

### Instant Consultations (Public / Guest)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/public/instant-consultations/doctors` | Available doctors + queue |
| `POST` | `/public/instant-consultations/request` | Request (specific doctor) |
| `POST` | `/public/instant-consultations/request-any` | Request (auto-assign) |
| `GET` | `/public/instant-consultations/{guest_token}/status` | Check status |
| `POST` | `/public/instant-consultations/{id}/pay` | Pay |
| `POST` | `/public/instant-consultations/bypass-payment/{id}` | Skip payment |
| `DELETE` | `/public/instant-consultations/{guest_token}` | Withdraw from queue |

**Request** payload:
```json
{
  "doctor_id": 1,
  "guest_phone": "+250781234567",
  "guest_name": "John Doe",
  "guest_email": "john@example.com",
  "description": "I have a headache and fever since yesterday.",
  "password": "secret123"
}
```

`password` is optional — if provided a patient account is auto-created and a token is returned.

**Status response** when accepted:
```json
{
  "status": "accepted",
  "room_url": "https://mediconnect.daily.co/instant-abc123",
  "daily_guest_token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Consultation status flow:**  
`pending → (patient pays) → confirmed → (doctor accepts) → accepted → (doctor joins) → in_progress → (doctor completes) → completed`

Save `guest_token` — it is the only way to track or withdraw the request.

---

## Chat — Appointments

Base path: `/chat/{appointmentId}` — 🔒 Protected  
Chat is only available when the appointment status is `confirmed` or `in_progress`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/chat/{appointmentId}` | Get messages (cursor-paginated) |
| `POST` | `/chat/{appointmentId}` | Send message |
| `POST` | `/chat/{appointmentId}/read` | Mark as read |

**Send** payload: `{ "message": "Hello doctor" }`

**WebSocket (frontend):**
```javascript
Echo.private(`appointment.${appointmentId}.chat`)
  .listen('.message.sent', (data) => {
    console.log(data);
  });
```

Private channel: `appointment.{appointmentId}.chat`  
Event: `.message.sent`

---

## Chat — Instant Consultations

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/chat/instant/{consultationId}` | Get messages |
| `POST` | `/chat/instant/{consultationId}` | Send message |
| `POST` | `/chat/instant/{consultationId}/read` | Mark as read |

**WebSocket (frontend):**
```javascript
Echo.private(`private-instant-consultation.${consultationId}.chat`)
  .listen('.message.sent', (data) => {
    console.log(data);
  });
```

Private channel: `private-instant-consultation.{consultationId}.chat`

---

## Medical Records

### Doctor — Patient Files

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/doctor/patients/{patientId}/record` | Medical record |
| `PUT` | `/doctor/patients/{patientId}/record` | Update record |
| `GET` | `/doctor/patients/{patientId}/visits` | Visit history |
| `GET` | `/doctor/patients/{patientId}/files` | Patient files |
| `POST` | `/doctor/patients/{patientId}/files` | Upload file |

**Upload file** — `multipart/form-data`:

| Field | Required | Description |
|---|---|---|
| `file` | ✅ | PDF, JPG, PNG — max 10MB |
| `file_type` | ✅ | `lab_result`, `scan`, `report`, `prescription`, `other` |
| `title` | ✅ | Display name |
| `notes` | ❌ | Optional |
| `visit_type` | ❌ | `appointment` or `instant_consultation` |
| `source_id` | ❌ | Appointment or consultation ID |

File URLs in responses are signed MinIO URLs valid for 30 minutes.

---

## Consultation Summaries

Full structured summaries for appointments and instant consultations.

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/doctor/consultation-summaries` | Doctor | Create |
| `GET` | `/doctor/consultation-summaries` | Doctor | List |
| `GET` | `/doctor/consultation-summaries/{id}` | Doctor | Get single |
| `PUT` | `/doctor/consultation-summaries/{id}` | Doctor | Update |
| `DELETE` | `/doctor/consultation-summaries/{id}` | Doctor | Delete |
| `GET` | `/patient/appointments/{id}/summary` | Patient | Get summary |
| `GET` | `/patient/instant-consultations/{id}/summary` | Patient | Get summary |
| `GET` | `/admin/patients/{patientId}/appointments/{id}/summary` | Admin | Get summary |
| `GET` | `/admin/patients/{patientId}/instant-consultations/{id}/summary` | Admin | Get summary |

**Create payload** includes nested objects for: `chief_complaint`, `history_of_present_illness`, `review_of_systems`, `red_flag_screening`, `clinical_assessment`, `management_plan`.

Either `appointment_id` or `instant_consultation_id` is required (not both).

---

## Quick Appointments

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/patient/quick` | List my requests |
| `POST` | `/patient/quick` | Request quick appointment |
| `GET` | `/patient/quick/{id}/status` | Check status |
| `DELETE` | `/patient/quick/{id}` | Cancel |

**Request** payload: `{ "type": "online", "insurance_id": null }`

The system searches for available doctors automatically. If no doctor is found: `"No doctors are available right now."` If already has active request: returns existing `request_id`.

---

## Doctor Wallet

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/doctor/wallet` | Balance |
| `GET` | `/doctor/wallet/earnings` | Earnings with per-appointment breakdown |
| `GET` | `/doctor/wallet/withdrawals` | Withdrawal requests |
| `POST` | `/doctor/wallet/withdraw` | Request withdrawal |
| `POST` | `/doctor/wallet/cancel-withdrawal/{id}` | Cancel |

Status flow: `pending → processing → approved → completed`

---

## Admin Wallet

Full wallet management for admin:

- Doctor wallets: topup, deduct, list, get, delete
- Main wallet: topup, deduct, get
- Withdrawal requests: list, view (auto-moves to processing), approve, complete, reject, cancel

Completing a withdrawal deducts from both the main wallet and the doctor wallet simultaneously.

---

## Instant Consultation Full Reference

**Status flow:**
```
pending
  → (patient pays) → confirmed
    → (doctor accepts) → accepted
      → (doctor joins) → in_progress
        → (doctor completes) → completed
```

Patients can withdraw while `pending`.  
Doctors can decline while `pending` or `confirmed`.

**Rejoin session:**

| Role | Endpoint |
|---|---|
| Patient — any active status | `GET /patient/instant-consultations/active-session` |
| Patient — in_progress only | `GET /patient/instant-consultations/active-session/live` |
| Doctor — in_progress only | `GET /doctor/instant-consultations/live-session` |

---

*Last updated: August 2026*
