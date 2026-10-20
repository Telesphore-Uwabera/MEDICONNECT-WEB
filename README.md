# MediConnect

Telemedicine and care-coordination platform for Rwanda. Patients find doctors and facilities, pay in Rwandan Francs (RWF), join video or in-person visits, and continue into prescriptions, pharmacy fulfillment, referrals, laboratory or imaging packets, and facility bookings.

This repository is the **web application and Node.js API**. Android and iOS clients (when present) use the same API. Currency everywhere is **RWF**. Payments go through **IremboPay** (MoMo, Airtel, card).

| Live site | Staging | API | WebSocket |
|---|---|---|---|
| [mediconnect.rw](https://mediconnect.rw) | [staging.mediconnect.rw](https://staging.mediconnect.rw) | [api.mediconnect.rw](https://api.mediconnect.rw) | `wss://ws.mediconnect.rw` |

Sign in at `/auth`. Public browsing (home, doctor search, hospital pages) does not require an account.

---

## Read this first

MediConnect is **one React app** with five workspaces (patient, doctor, hospital, pharmacy, admin) talking to **one Express API** (`server/`) and **MySQL**. Ending a video call is **not** the end of care. After a visit the doctor finalizes a clinical note (SOAP summary), may issue a prescription, and may open a **care packet** (lab, imaging, pharmacy, facility visit, admission). Those follow-up objects stay open on their own timelines even when the consult is marked complete.

If you only remember one product rule: **consultation documented ≠ pharmacy served ≠ investigation reviewed**. Track each separately.

---

## Quick navigation

| I want to… | Go to |
|---|---|
| Understand what the product does | [What MediConnect does](#what-mediconnect-does) |
| Understand a patient journey | [Patient journeys](#patient-journeys) |
| See how the code is arranged | [Architecture](#architecture) · [Repository map](#repository-map) |
| Run locally | [Local setup](#local-setup) |
| Use the product as a role | [User guide](#user-guide) |
| Push and deploy | [Git workflow](#git-workflow) · [Frontend deploy](#frontend-deployment) · [Backend deploy](#backend-deployment) |
| Call the API | [API documentation](#api-documentation) |
| Use staging accounts | [Test credentials](#test-credentials) |

---

## Table of contents

1. [What MediConnect does](#what-mediconnect-does)
2. [Who uses it](#who-uses-it)
3. [Patient journeys](#patient-journeys)
4. [After the call — clinical follow-through](#after-the-call--clinical-follow-through)
5. [Architecture](#architecture)
6. [Repository map](#repository-map)
7. [Tech stack](#tech-stack)
8. [Local setup](#local-setup)
9. [Environment variables](#environment-variables)
10. [Scripts](#scripts)
11. [Workspaces and routes](#workspaces-and-routes)
12. [User guide](#user-guide)
13. [Key domain objects](#key-domain-objects)
14. [Auth, sessions, and roles](#auth-sessions-and-roles)
15. [Realtime and video](#realtime-and-video)
16. [Payments](#payments)
17. [Infrastructure](#infrastructure)
18. [Git workflow](#git-workflow)
19. [Frontend deployment](#frontend-deployment)
20. [Backend deployment](#backend-deployment)
21. [Deploy both](#deploying-frontend--backend-together)
22. [Rollback](#rollback)
23. [Quick deploy cheatsheet](#quick-deploy-cheatsheet)
24. [Images (WebP)](#webp-image-strategy)
25. [Test credentials](#test-credentials)
26. [API documentation](#api-documentation)
27. [Conventions for developers](#conventions-for-developers)

---

## What MediConnect does

MediConnect LTD connects people in Rwanda to licensed clinicians and partner facilities without replacing those facilities. The platform:

- Lets anyone browse doctors and hospitals, then register as a **patient**.
- Lets clinicians and organisations register as **doctor**, **hospital**, or **pharmacy** (admin approval required before they appear publicly).
- Runs **scheduled appointments** (video or in-person) and **instant consultations** (queue + payment, then live video).
- Collects fees through **IremboPay**. Unpaid instant requests expire after **15 minutes**.
- Hosts the **consultation room** (WebRTC video, chat, files, in-call notes).
- Stores a **consultation summary** (SOAP-style clinical note) that the doctor must finalize.
- Issues **e-prescriptions** and can send them to a **registered pharmacy**.
- Sends **care packets** to a hospital or pharmacy (lab, imaging, procedure, admission, pharmacy dispense, facility protocol).
- Creates **referrals** and **facility service bookings** (dated visits at a partner clinic/hospital).
- Issues paid **fitness certificates** (FitMed).
- Pays doctors through a **wallet**; admin completes withdrawals.

The product language is **English, French, and Kinyarwanda** (`src/locales/`).

---

## Who uses it

| Role | Needs admin approval? | Typical job |
|---|---|---|
| **Patient** | No (OTP / profile) | Book, pay, join visits, see records, prescriptions, care next steps |
| **Doctor** | Yes (license / profile) | Availability, queue, consult, SOAP, Rx, referrals, care packets, wallet |
| **Hospital** | Yes | Departments, services, incoming bookings, care packets, results |
| **Pharmacy** | Yes | Inventory, prescription requests, care packets, marketplace orders |
| **Admin** | Super-admin flag | Approvals, users, fees, insurance, wallets, settings, moderation |
| **Guest** | No | Instant consult with phone; optional account creation on pay |

One login can hold several roles (for example patient + hospital). The header **role switcher** sets `active_role`. The API accepts reads if that role is in `available_roles`; writes still need the matching workspace.

---

## Patient journeys

A person usually enters **one** of these paths. They are independent. Completing a video call does not auto-complete pharmacy, labs, or referrals.

```
Patient books or starts a consult
        │
        ▼
Doctor consult (video / phone / in-person)
        │
        ▼
Doctor documents the patient file (SOAP summary)
        │
        ▼
Clinical decision (one or more, not a single forced chain)
        │
        ├── Advice only ──────────────► finalize consult
        ├── Medication ───────────────► e-prescription ► pharmacy match ► fulfill
        ├── In-person specialist ─────► book facility slot  and/or  referral letter
        ├── Laboratory / imaging ─────► care packet ► facility ► results ► doctor reviews
        └── Urgent / inpatient ───────► admission packet / handover (do not wait on ordinary payment)
```

### Scheduled appointment

1. Patient picks a doctor and a slot (`/patient/appointments` or public doctor card).
2. Pays when an invoice is due (IremboPay). Do **not** mark invoices paid by editing the database.
3. At the time, doctor and patient join `/consultation/:roomName`.
4. Doctor writes notes during the call (autosave / draft). Completing the call opens the **completion gate**: summary required, then optional prescription, then care-continue choices.
5. Patient later opens records, prescriptions, bills, and “care next” items.

### Instant consultation

1. Patient (or guest) requests a doctor or “any available” doctor.
2. Status: unpaid (`pending` / `queued` / `waiting` / `payment_pending`) → **paid** (`confirmed`) → doctor **accepted** → **in_progress** → **completed**. Unpaid requests expire as `expired` / `payment_expired` after 15 minutes.
3. Doctor queue (`/doctor/appointments?tab=instant`) shows **in session first**, then paid waiting, then awaiting payment.
4. Same post-call documentation as a scheduled visit. Clicking a completed card opens that consult’s record (summaries page, `?instant=` id).

### Facility service booking (no prior MediConnect doctor required)

Patient or doctor books a hospital **department/service/slot**. Hospital accepts, patient attends, facility completes. Facility consult fees are the hospital’s prices, separate from any MediConnect booking fee policy.

### Fitness certificate

Paid FitMed flow. Patient steps, doctor review, PDF download, public verify URL.

---

## After the call — clinical follow-through

Implemented today as **documents + packets + bookings**, not a separate `clinical_episodes` table.

| Step | Where | What “done” means |
|---|---|---|
| Call ended | appointment / instant status `completed` | Peers left the room |
| Note finalized | `consultation_summaries` | Doctor saved SOAP (complaint, HPI, exam, assessment, plan) |
| Prescription | `prescriptions` + pharmacy requests | Issued / sent / dispensed — **pharmacy can still be packing after the consult is complete** |
| Care packet | `care_orders` | Hospital or pharmacy accepted and completed (result notes) |
| Referral | `referrals` | Partner received the patient; attendance is a separate booking |
| Facility visit | `service_bookings` | Slot reserved, facility confirmed, attended |

**Doctor UI after a call** (`CareContinuePanel` and completion gates):

1. Required: consultation summary.
2. Optional: quick prescription (issue + send to pharmacy).
3. Next care: pharmacy packet, lab, imaging, procedure, admission, book a dated visit, facility protocol packet, or **done**.

**Hospital / pharmacy:** Incoming care inbox — accept, complete with result notes, or reject. Doctor can send a pharmacy packet after hospital results on the same chain (`parent_order_id`).

**Patient:** `/patient/care-orders`, referrals, service bookings, prescriptions, and a “next care” strip that lists open follow-ups.

What is **not** built yet (product intent, not current code): a parent **clinical episode** with explicit statuses such as `AWAITING_RESULTS_REVIEW`; an 80% confirmed-stock pharmacy matching rule; line-level partial fulfillment; patient-uploaded **external** paper prescriptions; DICOM viewers; a customer-support booking desk. Extend the objects above rather than adding a second parallel API.

---

## Architecture

```
Browser (React + Vite)                 Phone / future apps
        │                                      │
        │  HTTPS  /api/v1                      │
        ▼                                      ▼
┌─────────────────────────────────────────────────┐
│  Node.js Express  (server/)                     │
│  Auth, appointments, instant queue, SOAP, Rx,   │
│  care orders, referrals, payments, uploads      │
└────────────┬────────────────────┬───────────────┘
             │                    │
             ▼                    ▼
         MySQL              WebSocket (ws)
      mediconnect         Pusher protocol
                          src/lib/echo.ts
             │
             ▼
      IremboPay · SMTP · TURN/STUN (coTURN) · object storage
```

**Frontend** is usually hosted on **Netlify** (`mediconnect.rw`). **API** runs as systemd `mediconnect-node` under `/opt/mediconnect-node`, reverse-proxied by **Nginx** on `api.mediconnect.rw`. GitHub Actions on push to `main` calls `POST /api/v1/deploy` (needs `DEPLOY_SECRET`) which runs `/opt/mediconnect-node/deploy.sh`.

Some MySQL type columns still store historical strings such as `App\Models\User`. The Node API **keeps writing those values** so old rows match. Do not rename them without a data migration.

---

## Repository map

```
MEDICONNECT-WEB/
├── src/                         React web app
│   ├── App.tsx                  Routes and role gates
│   ├── pages/                   One screen per route
│   │   ├── patient/             Dashboard, bookings, Rx, records, care
│   │   ├── doctor/              Appointments (3 tabs), SOAP, Rx, care, wallet
│   │   │   └── appointments/    AppointmentsTab, InstantConsultTab, ServiceBookingsTab
│   │   ├── hospital/            Facility ops + incoming care
│   │   ├── pharmacy/            Inventory, orders, Rx requests, care
│   │   ├── admin/               Approvals, users, fees, settings
│   │   ├── care/                Shared incoming care inbox
│   │   ├── Auth.tsx, Index.tsx, ConsultationRoom.tsx, Help.tsx
│   ├── components/              UI, consultation room, landing, dialogs
│   ├── hooks/                   TanStack Query + API wrappers (by role)
│   ├── lib/                     apiFetch, auth-session, echo (realtime), WebRTC helpers
│   ├── context/                 Call store / call overlay
│   ├── locales/                 en / fr / rw JSON
│   └── assets/
├── server/                      Node.js API
│   ├── src/index.js             HTTP server, uploads, websocket attach
│   ├── src/app.js               Authenticated /api/v1
│   ├── src/public.js            Public search, instant, payments, certificates
│   ├── src/auth.js              Register, login, OTP, sessions
│   ├── src/appointments.js      Scheduled visits
│   ├── src/care-orders.js       Care packets (creates `care_orders`)
│   ├── src/care-referrals.js    Referrals
│   ├── src/chat.js              Visit chat
│   ├── src/realtime.js          Pusher-protocol channels
│   ├── src/call-token.js        Room tokens + TURN credentials
│   └── src/db.js                MySQL helpers
├── public/                      Static files
├── .github/workflows/deploy.yml Trigger API pull/restart on main
└── README.md                    This file
```

Hooks in `src/hooks/<role>/` are the usual place to add an API call. Pages should not scatter raw `fetch` if a hook already exists.

---

## Tech stack

| Layer | Technology |
|---|---|
| Web app | React 18 + TypeScript + Vite |
| API | Node.js (Express) in `server/` |
| Database | MySQL (`mediconnect`) |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| Styling | Tailwind CSS + shadcn/ui |
| Forms | React Hook Form + Zod |
| Translations | i18next (en, fr, rw) |
| Realtime | `server/src/realtime.js` + `pusher-js` (`src/lib/echo.ts`) |
| Video | WebRTC + TURN/STUN (coTURN) |
| Rich text | Tiptap |
| Charts | Recharts |
| Payments | IremboPay |

---

## Local setup

### Prerequisites

- Node.js 18+
- npm 9+
- Git
- Optional: MySQL if you run the API locally

### Steps

```bash
git clone https://github.com/Telesphore-Uwabera/MEDICONNECT-WEB.git
cd MEDICONNECT-WEB
npm install
cp .env.example .env
```

Edit `.env`. For day-to-day UI work against staging:

```env
VITE_APP_BASE_URL=https://staging-api.mediconnect.rw/api/v1
VITE_DEV_API_TARGET=https://staging-api.mediconnect.rw
VITE_DEV=true
```

```bash
npm run dev
```

The web app is **http://localhost:3000** (or the next free port Vite prints). `npm run dev` proxies `/api/v1` to `VITE_DEV_API_TARGET`, so localhost can use **staging or production data** without VPN.

To run the API on your machine as well:

```bash
# needs server/.env with MySQL, then:
npm run api
```

Point `VITE_APP_BASE_URL` at `/api/v1` if the Vite proxy should hit local Node.

> Configure git identity locally (`user.name` / `user.email`) so commits show who you are. Do not commit `.env`.

---

## Environment variables

All `VITE_` variables are baked into the JS bundle at build time.  
**Never put secrets or passwords in `VITE_` variables** — they become visible in the browser.

```env
# ── API ───────────────────────────────────────────────────────────
# Use staging for local dev, switch to production for live deploys
VITE_APP_BASE_URL=https://staging-api.mediconnect.rw/api/v1
# Used when VITE_APP_BASE_URL is relative (for example, /api/v1)
VITE_DEV_API_TARGET=https://staging-api.mediconnect.rw

# ── WebSockets (Node, Pusher protocol) ────────────────────────────
VITE_REVERB_APP_KEY=mediconnect-staging-key
VITE_REVERB_HOST=ws.mediconnect.rw
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=wss

# ── WebRTC relay (API server only — server/.env) ─────────────────
# The browser never reads these. Node uses them to sign relay credentials into
# every call token, so they belong in the API env, not in the frontend bundle.
TURN_HOST=<relay address>          # also accepted as TURN_URL / VITE_TURN_HOST
TURN_PORT=3478
TURNS_PORT=5349
# Set ONE of these pairs, matching how coTURN was configured:
TURN_SECRET=<static-auth-secret>   # when turnserver.conf has use-auth-secret
TURN_USERNAME=mediconnect          # when turnserver.conf has a static user= entry
TURN_PASSWORD=<user= password>
# Signs consultation room tokens so the signal relay can reject a forged room.
CALL_TOKEN_SECRET=<random 32+ bytes hex>

# ── Deploy webhook (API server only — server/.env) ────────────────
# GitHub Actions sends this to POST /api/v1/deploy. Without it the webhook
# answers 503 and pushes to main do not restart the API.
DEPLOY_SECRET=<same value as the repository's DEPLOY_SECRET secret>

# ── IremboPay (API server only) ───────────────────────────────────
PAYMENT_PUBLIC_KEY=
PAYMENT_SECRET_KEY=
PAYMENT_PRODUCT_CODE=

# ── Mode ──────────────────────────────────────────────────────────
VITE_DEV=true   # set to false for production builds
```

**For production builds**, change these two lines:
```env
VITE_APP_BASE_URL=https://api.mediconnect.rw/api/v1
VITE_DEV=false
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite web app with hot reload |
| `npm run api` | Node API (`server/`) |
| `npm run build` | Production web bundle → `dist/` |
| `npm run build:dev` | Build with source maps |
| `npm run preview` | Preview `dist/` locally |
| `npm test` | Vitest once |
| `npm run test:watch` | Vitest watch |
| `npm run lint` | ESLint |

---

## Workspaces and routes

| Role | Base path | Access |
|---|---|---|
| Patient | `/patient` | After verification |
| Doctor | `/doctor` | After admin approval |
| Hospital | `/hospital` | After admin approval |
| Pharmacy | `/pharmacy` | After admin approval |
| Admin | `/admin` | Super-admin |
| Public | `/`, `/auth`, `/help`, `/search` | No login |
| Call | `/consultation/:roomName` | Valid room token (or redirect to summary by `cid`) |

Doctor **Appointments** (`/doctor/appointments`) has three tabs:

| Tab | Query | Content |
|---|---|---|
| Appointments | default | Scheduled visits — row/card opens that appointment id |
| Instant | `?tab=instant` | Queue + completed instants — card opens that consult id |
| Service bookings | `?tab=bookings` | Facility visits the doctor booked — row opens that booking id |

Deep link: `/doctor/appointments?tab=instant&id=80`.

---

## User guide

Use [mediconnect.rw](https://mediconnect.rw) or [staging.mediconnect.rw](https://staging.mediconnect.rw). Staging accounts: [Test credentials](#test-credentials).

### Patient

1. Register as **Patient**. Verify OTP if asked. Complete profile (language, insurance, medical notes, family).
2. **Find doctors** or **Find facilities**. Open a card → **Book appointment** or **Instant consultation**.
3. Pay the IremboPay invoice. Do not mark invoices paid in MySQL.
4. Join the room at the booked time, or when the doctor accepts an instant request.
5. After the visit: **Records**, **Prescriptions**, **Certificates**, **Care packets**, **Referrals**, **Bills**.
6. Fitness certificates are a paid flow (currently 5,000 FRW) until the PDF is ready.
7. One account, one active session. A new login ends the previous device. About **1 hour idle** signs you out.

### Doctor

1. Register as **Doctor**. Wait for admin approval of profile and license.
2. Complete profile, photo, specializations, **Availability**.
3. Toggle **instant consultation** when you can take the queue. Pause bookings when off duty.
4. **Appointments**: scheduled, instant, and service bookings. Click a row to open that id (patient, how the visit was conducted, notes, payment).
5. During/after the call: SOAP summary, prescription, then care packet or facility booking as needed.
6. **Wallet** for earnings; admin pays withdrawals.

### Hospital

1. Register, wait for approval.
2. Profile, working hours, **departments** and **services** (these power public booking).
3. **Incoming care** / referrals: receive packets, add result notes, return to the doctor.
4. Accept or complete **service bookings**. Only approved facilities appear as care destinations.

### Pharmacy

1. Register, wait for approval.
2. Keep inventory current (internal stock or synced external provider).
3. Accept **prescription requests** and **care packets**. Fulfill or reject with a reason.
4. Patients see status on pharmacy orders.

### Admin

1. Sign in with an account that `can_be_admin`.
2. Approve or reject doctors, hospitals, pharmacies; set license expiry.
3. Users, specializations, fees, insurance, help/legal, system settings.
4. Payments, refunds, wallets, fitness-certificate traffic. Do not approve or refund live cases unless that is the intended support action.

---

## Key domain objects

| Object | Typical table | Meaning |
|---|---|---|
| User | `users` | Login; one or more roles |
| Appointment | `appointments` | Scheduled video or in-person visit |
| Instant consultation | `instant_consultations` (+ request/queue) | On-demand visit |
| Consultation summary | `consultation_summaries` | SOAP note; belongs to appointment **or** instant |
| Prescription | `prescriptions` + items | E-Rx from a MediConnect doctor |
| Pharmacy request | `pharmacy_prescription_requests` | Pharmacy accept / reject / fulfill |
| Pharmacy order | `pharmacy_orders` | Marketplace / OTC cart (not a paper Rx upload) |
| Care order (packet) | `care_orders` | Lab, imaging, procedure, admission, pharmacy_packet, facility_packet, … |
| Referral | `referrals` | Soft handoff to hospital, pharmacy, or doctor |
| Service booking | `service_bookings` | Dated facility visit |
| Fitness certificate | certificate tables | Paid FitMed PDF |
| Wallet | doctor wallets | Earnings and withdrawals |
| Notification | `notifications` | In-app; `notifiable_type` still uses historical morph strings |

IDs in URLs for care packets and referrals are **dedicated** (not a generic CRUD id). Follow existing `server/src/dedicated-ids.js` patterns when adding similar resources.

---

## Auth, sessions, and roles

- Register / login / OTP / refresh: `/auth/*`.
- Bearer token in `Authorization`. `GET /auth/me` is the session source for the SPA.
- **Single session:** a new login invalidates the previous token.
- **Idle logout:** client signs out after inactivity and sends the user to `/auth?next=…`.
- Guards: `Requireauth`, `RoleApprovalGate`. Unapproved doctors/hospitals/pharmacies cannot use the full workspace.
- Role switcher updates active role without a second password.

---

## Realtime and video

- Socket speaks the **Pusher protocol** (`src/lib/echo.ts`). There is no Laravel Echo client.
- Channels include appointment chat, instant chat, queue refresh, payment alerts.
- Video is **WebRTC**. Same Wi-Fi often works with host candidates; **cross-network calls need TURN**.
- Health check (no secrets): `GET /api/v1/public/consultations/relay-health`.
- Compare API vs coTURN credentials without printing them: `bash server/verify-turn.sh`.
- In-room pill shows **Direct** vs **Relay**. A red banner explains missing relay, bad credentials, or ICE failure.

---

## Payments

- Provider: **IremboPay**. Product codes live on the **API** env, not in `VITE_`.
- Instant consults stay unpaid until the callback succeeds; they **expire after 15 minutes** if not paid.
- Never invent a paid status in the database for a live invoice.
- Fitness certificates and some bookings have their own amounts/product codes.
- Doctor earnings settle to the wallet after completed paid visits (admin payouts).

---

## Infrastructure

### Live URLs

| Service | URL |
|---|---|
| Frontend — production | https://mediconnect.rw |
| Frontend — staging | https://staging.mediconnect.rw |
| API — production | https://api.mediconnect.rw |
| API — staging | https://staging-api.mediconnect.rw |
| WebSocket | wss://ws.mediconnect.rw |
| Database admin | https://db.mediconnect.rw |

### VPN

Connect VPN before SSH, DB tunnels, or internal IPs.

| Field | Value |
|---|---|
| URL | `vpn.aos.rw` |
| Username | kept out of this public repo |
| Group | `MEDICONNECT-LTD` |

Cisco AnyConnect or OpenConnect.

### SSH / server

```bash
export API_HOST=<internal API address from your private .env>
ssh root@$API_HOST
```

Ubuntu + Nginx. Config: `/etc/nginx/sites-available/`.

```bash
systemctl status nginx
nginx -t
systemctl reload nginx
tail -f /var/log/nginx/error.log
```

### Database

**Option 1 — Browser UI (phpMyAdmin)** — easiest, no VPN needed

```
https://db.mediconnect.rw
Username: <phpMyAdmin user — kept out of this public repo>
```

**Option 2 — Desktop tool via SSH tunnel** (TablePlus, DBeaver, MySQL Workbench)

```bash
# Open tunnel — keep this terminal open (VPN required)
ssh -L 3307:127.0.0.1:3306 root@$API_HOST
```

Then connect your tool to:

| Field | Value |
|---|---|
| Host | `127.0.0.1` |
| Port | `3307` |
| Database | `mediconnect` |
| Username | `root` (password stays in `server/.env` as `DB_PASSWORD`) |

**Option 3 — CLI directly on server**

```bash
ssh root@$API_HOST
mysql -u root mediconnect
```

### Local dev — access live data

When running `npm run dev`, the Vite proxy forwards all `/api/v1/*` requests to the API in `VITE_DEV_API_TARGET` so localhost can use real data.

```env
# Points to production — localhost gets live data
VITE_DEV_API_TARGET=https://api.mediconnect.rw

# Or point to staging for safer testing
# VITE_DEV_API_TARGET=https://staging-api.mediconnect.rw
```

How it works:

```
Browser (localhost:3000)
    ↓  /api/v1/...
Vite dev server proxy
    ↓  forwards to VITE_DEV_API_TARGET
https://api.mediconnect.rw/api/v1/...
    ↓
Node.js API (Express) → MySQL
```

No VPN needed for this — the production API is publicly accessible over HTTPS.

### Video call relay (cross-network calls)

A call connects on the same Wi-Fi using `host` ICE candidates alone. Across
different networks — home broadband versus mobile data — NAT usually makes
`srflx` (STUN) fail too, so the peers can only meet through a `relay` candidate
from TURN. When that is missing the call ends at ICE `failed` no matter how the
room UI is written.

**Check a deployment without reading logs:**

```bash
curl -s https://api.mediconnect.rw/api/v1/public/consultations/relay-health
```

`ok: true` means the API is putting credentialed relays into every call token.
`missing` names the layer that is not: `relay_configured`, `relay_credentials`,
`tls_fallback` or `room_token_signing`, and each `checks[].detail` says which
variable closes it. It never returns a credential value.

**Compare the two boxes (read-only, safe to paste to anyone):**

```bash
bash server/verify-turn.sh          # on the API box
sudo bash verify-turn.sh            # on the coTURN box
```

The script reduces every credential to a length plus a short match code, then
says MATCH or MISMATCH — so `TURN_SECRET` vs coTURN's `static-auth-secret`, or
`TURN_PASSWORD` vs its `user=` entry, can be proven equal without printing one.

**In the room**, the header pill reads **Direct** or **Relay** for the selected
candidate pair. If a relay cannot be used, a red banner names the fault: no
relay in the token, relay without credentials, credentials refused, or relay not
answering — with the candidate types it saw as evidence.

### DNS & nameservers

Domains are `.rw` — registered through **RICTA** (Rwanda's registrar).

Check current DNS: https://www.ricta.org.rw/whois → search `mediconnect.rw`

To update DNS, log into the registrar panel or — if DNS is self-hosted — SSH in and edit `/etc/bind/`, then:

```bash
systemctl restart named
```

---

## Git workflow

### Branch rules

```
main        ← production (what users see)
staging     ← pre-production testing
feature/*   ← new features
fix/*       ← bug fixes
hotfix/*    ← urgent production fixes (branches off main)
```

> Never commit directly to `main` or `staging`. Every change starts on its own branch.

### Normal change flow

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

### Hotfix flow (urgent production bug)

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

## Frontend deployment

### Full flow at a glance

```
feature branch → staging → test → main → build → Netlify → live
```

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

### Step 2 — Merge staging → main

```bash
git checkout main
git pull origin main
git merge staging
git push origin main
```

Or open a PR from `staging → main` on GitHub.

### Step 3 — Build for production

```bash
# Make sure .env has production values:
# VITE_APP_BASE_URL=https://api.mediconnect.rw/api/v1
# VITE_DEV=false

npm run build
# Output: dist/
```

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
scp -r dist/* root@$API_HOST:/var/www/mediconnect/
ssh root@$API_HOST "nginx -t && systemctl reload nginx"
```

### Step 5 — Verify

```
https://mediconnect.rw
```

- Press `Ctrl + Shift + R` (hard refresh — clears cache)
- Test your change on the live site
- Check DevTools → Network — API calls should return `200`

### Netlify environment variables

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

### Nginx config for frontend (server-side)

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

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|webp)$ {
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

## Backend deployment

The backend is the **Node.js Express API** in `server/`, typically running as `mediconnect-node` (systemd) from `/opt/mediconnect-node`.

Some MySQL columns (`tokenable_type`, `notifiable_type`, and similar) still store the historical type strings already in production (`App\Models\User`, `App\Models\Appointment`, …). The Node API keeps writing those same values so existing rows continue to match. Do not rename them without a data migration.

> **Requires SSH access.** Connect VPN first, then `ssh root@$API_HOST`.

Pushes to `main` can also hit `POST /api/v1/deploy` (needs `DEPLOY_SECRET` in `server/.env`), which runs `/opt/mediconnect-node/deploy.sh`.

### All steps — run on the server

```bash
# 1. Go to the API directory
cd /opt/mediconnect-node

# 2. Pull latest code
git pull origin main

# 3. Install Node dependencies
npm install --omit=dev --prefix server

# 4. Confirm server/.env (MySQL, TURN, DEPLOY_SECRET, PAYMENT_*, CALL_TOKEN_SECRET)

# 5. Restart the Node process
systemctl restart mediconnect-node

# 6. Reload Nginx if you changed the reverse-proxy config
nginx -t && systemctl reload nginx

# 7. Verify the API is responding
curl -s https://api.mediconnect.rw/api/v1/public/instant-consultations/doctors
curl -s https://api.mediconnect.rw/api/v1/public/consultations/relay-health
```

### What each step does

| Step | Why it matters |
|---|---|
| `git pull` | Gets the latest `server/` code onto the box |
| `npm install --omit=dev --prefix server` | Installs Express, mysql2, ws, and other API packages |
| `systemctl restart mediconnect-node` | Loads the new Node process |
| `nginx -t && reload` | Applies reverse-proxy changes safely |

### Checking logs when something breaks

```bash
# Node API (systemd)
journalctl -u mediconnect-node -n 80 --no-pager

# Nginx errors
tail -50 /var/log/nginx/error.log
```

### Local / seed data

There is no Artisan seeder. Load reference rows with SQL in phpMyAdmin or:

```bash
mysql -u root mediconnect < your-seed.sql
```

> Never run a wipe-and-replace script on production without checking it first.

---

## Deploying frontend + backend together

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

## Rollback

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
cd /opt/mediconnect-node
git log --oneline -10         # find last working commit
git checkout <commit-hash>    # go back to it
npm install --omit=dev --prefix server
systemctl restart mediconnect-node
nginx -t && systemctl reload nginx
```

---

## Quick deploy cheatsheet

### Frontend — production deploy

```bash
git checkout main && git pull origin main
# Edit .env: VITE_APP_BASE_URL=https://api.mediconnect.rw/api/v1 + VITE_DEV=false
npm run build
netlify deploy --dir=dist --prod
```

### Backend — production deploy (run on server)

```bash
cd /opt/mediconnect-node
git pull origin main
npm install --omit=dev --prefix server
systemctl restart mediconnect-node
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

## WebP image strategy

All images served through the platform should be in **WebP format** — it is 25–35% smaller than JPEG/PNG at the same quality, which directly improves page load speed and Core Web Vitals scores.

### Frontend — lazy loading images

All `<img>` tags in the app already use `loading="lazy"` (added by default in new components). For images that need to display above the fold (hero, avatars), use `loading="eager"`.

```tsx
// lazy (default for everything below the fold)
<img src={doctor.image} loading="lazy" alt={doctor.name} />

// eager (hero images only)
<img src={heroPhoto} loading="eager" alt="" />
```

### Backend — convert existing images to WebP

SSH into the server (VPN required), then run this against the Node upload directory:

```bash
cd /opt/mediconnect-node

# Install cwebp if not available
apt-get install -y webp

# Convert uploaded images (path may be server/storage or UPLOAD_DIR)
find server/storage -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) | while read f; do
  output="${f%.*}.webp"
  cwebp -q 82 "$f" -o "$output" && echo "✅ $output"
done
```

After converting, update image URLs in the database to point to `.webp` files:

```sql
-- In MySQL (run via phpMyAdmin or CLI)
UPDATE users      SET avatar = REPLACE(avatar, '.jpg', '.webp')    WHERE avatar LIKE '%.jpg';
UPDATE users      SET avatar = REPLACE(avatar, '.jpeg', '.webp')   WHERE avatar LIKE '%.jpeg';
UPDATE users      SET avatar = REPLACE(avatar, '.png', '.webp')    WHERE avatar LIKE '%.png';
UPDATE doctors    SET image  = REPLACE(image,  '.jpg', '.webp')    WHERE image  LIKE '%.jpg';
UPDATE doctors    SET image  = REPLACE(image,  '.jpeg', '.webp')   WHERE image  LIKE '%.jpeg';
UPDATE doctors    SET image  = REPLACE(image,  '.png', '.webp')    WHERE image  LIKE '%.png';
UPDATE pharmacies SET logo   = REPLACE(logo,   '.jpg', '.webp')    WHERE logo   LIKE '%.jpg';
UPDATE pharmacies SET logo   = REPLACE(logo,   '.jpeg', '.webp')   WHERE logo   LIKE '%.jpeg';
UPDATE pharmacies SET logo   = REPLACE(logo,   '.png', '.webp')    WHERE logo   LIKE '%.png';
UPDATE hospitals  SET logo   = REPLACE(logo,   '.jpg', '.webp')    WHERE logo   LIKE '%.jpg';
UPDATE hospitals  SET logo   = REPLACE(logo,   '.jpeg', '.webp')   WHERE logo   LIKE '%.jpeg';
UPDATE hospitals  SET logo   = REPLACE(logo,   '.png', '.webp')    WHERE logo   LIKE '%.png';
```

### Backend — auto-convert on upload (Node)

Uploads go through Express/multer in `server/`. Convert to WebP in the upload handler (sharp or `cwebp`) before writing under `UPLOAD_DIR`, then return the `.webp` public URL. New avatars, doctor photos, and logos should be stored as WebP only.

### Summary

| Step | Who | What |
|---|---|---|
| Convert existing DB images | Backend dev | Run `cwebp` script on server + SQL UPDATE |
| Auto-convert new uploads | Backend dev | Convert in the Node upload handler |
| Frontend lazy loading | Already done | `loading="lazy"` on all below-fold images |

---

## Test credentials

**Staging only** (`https://staging.mediconnect.rw`). Do not use these on production. Do not commit additional passwords.

**API:** `https://staging-api.mediconnect.rw/api/v1`  
Country code: `+250`

| Role | Email | Phone | Password |
|---|---|---|---|
| Admin | admin@mediconnect.rw | 0780000000 | `Admin@2026!` |
| Patient | patient@mediconnect.rw | 0781111111 | `Patient@2026!` |
| Doctor | doctor@mediconnect.rw | 0782222222 | `Doctor@2026!` |
| Hospital | hospital@mediconnect.rw | 0783333333 | `Hospital@2026!` |
| Pharmacy | pharmacy@mediconnect.rw | 0784444444 | `Pharmacy@2026!` |

---

## API documentation

### Base URLs

| Environment | URL |
|---|---|
| Staging | `https://staging-api.mediconnect.rw/api/v1` |
| Production | `https://api.mediconnect.rw/api/v1` |

Dedicated packet/referral URLs follow `/{role}/care-orders/:id` and `/{role}/referrals/:id` (see `server/src/dedicated-ids.js`).

### Required headers

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
<summary><strong>Authentication</strong> — register, login, OTP, social, guest</summary>

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

### Other auth endpoints

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
<summary><strong>Patient</strong> — profile, appointments, search, service bookings, certificates</summary>

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

### Service bookings

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/service-bookings/availability` | Check slot — requires `hospital_id`, `hospital_service_id`, `preferred_date`, `preferred_time` |
| `GET` | `/service-bookings` | List my bookings |
| `POST` | `/service-bookings` | Request booking |
| `DELETE` | `/service-bookings/{id}` | Cancel |

---

### Fitness certificates

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

### Dashboard & records

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/patient/dashboard` | Stats — params: `period`, `chart_group`, `appointment_type`, `status` |
| `GET` | `/patient/my-record` | My medical record |
| `GET` | `/patient/my-visits` | Visit history — filter: `?visit_type=appointment\|instant_consultation` |
| `GET` | `/patient/my-files` | Files — filter: `?file_type=lab_result\|scan\|report\|prescription\|other` |

</details>

---

<details>
<summary><strong>Doctor</strong> — profile, availability, slots, appointments, prescriptions, wallet</summary>

Base path: `/doctor` — all routes 🔒

### Profile & toggles

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/doctor/profile` | Get or create/update profile |
| `POST` | `/doctor/profile/image` | Upload profile image |
| `PATCH` | `/doctor/toggle/instant` | Toggle instant consultation on/off |
| `PATCH` | `/doctor/toggle/pause` | Pause / resume new bookings |

---

### Availability & slots

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

### Instant consultations

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

**Consultation status flow:**
```
pending → confirmed → accepted → in_progress → completed
           (paid)   (dr accepts)  (dr joins)   (dr completes)
```

Also: `declined`, `withdrawn`, `expired`, `payment_expired`. Unpaid requests expire after 15 minutes.

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
| `GET` | `/doctor/prescriptions/{id}/matching-pharmacies` | Rank pharmacies by stocked items |

---

### Patient records (doctor access)

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
<summary><strong>Hospital</strong> — profile, departments, services, bookings, working hours</summary>

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

### Working hours & closures

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/hospital/working-hours` | Get or set all days (bulk upsert) |
| `PUT/DELETE` | `/hospital/working-hours/{id}` | Update or delete single day |
| `DELETE` | `/hospital/working-hours/reset` | Reset all |
| `GET/POST` | `/hospital/closures` | List or create closure |
| `PUT/DELETE` | `/hospital/closures/{id}` | Update or delete closure |
| `POST` | `/hospital/closures/check-date` | Check if closed on a date |

---

### Departments & services

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/hospital/departments` | List or create |
| `GET/PUT/DELETE` | `/hospital/departments/{id}` | Get, update, or delete |
| `GET/POST` | `/hospital/services` | List or create |
| `GET/PUT/DELETE` | `/hospital/services/{id}` | Get, update, or delete |

Service `price_type`: `fixed` | `from` | `negotiable` | `free`

---

### Service bookings

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
<summary><strong>Pharmacy</strong> — profile, inventory, orders, prescriptions, external providers</summary>

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

### Orders & prescriptions

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

### External providers

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/pharmacy/inventory/external/providers` | List or connect provider |
| `PUT/DELETE` | `/pharmacy/inventory/external/providers/{id}` | Update or remove |
| `POST` | `/pharmacy/inventory/external/providers/{id}/sync` | Manual sync (max 5/hour) |
| `GET` | `/pharmacy/inventory/external/items` | External inventory (read-only) |

</details>

---

<details>
<summary><strong>Admin</strong> — users, approvals, wallets, settings, whitelists</summary>

Base path: `/admin` — all routes 🔒 (admin token required)

### User management

| Endpoint | Actions |
|---|---|
| `/admin/users/{id}` | `GET`, suspend `PUT`, activate `PUT`, delete `DELETE` |
| `/admin/patients/{id}` | `GET`, suspend, activate |
| `/admin/doctors/{id}` | `GET`, approve, reject, suspend |
| `/admin/hospitals/{id}` | `GET`, approve, reject, suspend |
| `/admin/pharmacies/{id}` | `GET`, approve, reject, suspend |

---

### Instant consultation whitelist

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/admin/instant-consultations` | List or add doctor |
| `PUT` | `/admin/instant-consultations/{id}` | Enable/disable — `{ "active": true/false }` |
| `DELETE` | `/admin/instant-consultations/{id}` | Remove — auto-disables doctor's instant flag |

---

### Specializations & fees

| Endpoint | Description |
|---|---|
| `/admin/specializations` | CRUD |
| `/admin/specialization-fees` | CRUD — sets `online_fee` and `in_person_fee` per specialization |
| `/admin/doctor-consultations` | Assign doctors to fee tiers |
| `/admin/doctor-consultations/{doctorId}/fee-override` | Set or clear individual fee override |

---

### Wallet management

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

### Other admin

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
<summary><strong>Public / guest</strong> — instant consultations, medicine search (no auth needed)</summary>

Base path: `/public`

### Instant consultations (guest)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/public/instant-consultations/doctors` | Available doctors + queue |
| `POST` | `/public/instant-consultations/request` | Request (specific doctor) |
| `POST` | `/public/instant-consultations/request-any` | Request (auto-assign) |
| `GET` | `/public/instant-consultations/{guest_token}/status` | Check status |
| `POST` | `/public/instant-consultations/{id}/pay` | Pay |
| `POST` | `/public/instant-consultations/bypass-payment/{id}` | Skip payment |
| `DELETE` | `/public/instant-consultations/{guest_token}` | Withdraw from queue |
| `GET` | `/public/consultations/relay-health` | TURN/relay health (no secrets) |

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

### Medicine search

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/public/medicines?q=amoxicillin` | Global search — add `lat`, `lng` for distance |
| `GET` | `/public/medicines/pharmacy/{slug}?q=...` | Search in specific pharmacy |
| `GET` | `/public/medicines/availability` | Check availability — params: `pharmacy_slug`, `medicine_id` |

</details>

---

<details>
<summary><strong>Chat</strong> — appointment chat and instant consultation chat</summary>

All routes 🔒 Protected

### Appointment chat

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/chat/{appointmentId}` | Get messages (cursor-paginated) |
| `POST` | `/chat/{appointmentId}` | Send: `{ "message": "..." }` |
| `POST` | `/chat/{appointmentId}/read` | Mark as read |

WebSocket (Pusher protocol, see `src/lib/echo.ts`):
```javascript
echo.private(`appointment.${appointmentId}.chat`)
  .listen(".message.sent", (data) => console.log(data));
```

---

### Instant consultation chat

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/chat/instant/{consultationId}` | Get messages |
| `POST` | `/chat/instant/{consultationId}` | Send message |
| `POST` | `/chat/instant/{consultationId}/read` | Mark as read |

WebSocket channel: `private-instant-consultation.{consultationId}.chat`

</details>

---

<details>
<summary><strong>Medical records</strong> — files, visit history, consultation summaries</summary>

All file URLs are **signed MinIO URLs** valid for 30 minutes.

### Doctor — patient files

| Method | Endpoint | Description |
|---|---|---|
| `GET/PUT` | `/doctor/patients/{id}/record` | View or update medical record |
| `GET` | `/doctor/patients/{id}/visits` | Visit history — filter: `?visit_type=appointment\|instant_consultation` |
| `GET/POST` | `/doctor/patients/{id}/files` | View files or upload — `multipart/form-data`, max 10MB |

Upload fields: `file`, `file_type` (`lab_result`/`scan`/`report`/`prescription`/`other`), `title`, `notes`

---

### Patient — own records

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/patient/my-record` | Medical record |
| `GET` | `/patient/my-visits` | Visit history |
| `GET` | `/patient/my-files` | Files |
| `GET` | `/patient/records/appointments/{id}` | Single appointment with notes + files |
| `GET` | `/patient/records/instant-consultations/{id}` | Single session with notes + files |

---

### Consultation summaries

| Role | Endpoint | Description |
|---|---|---|
| Doctor | `POST /doctor/consultation-summaries` | Create structured summary |
| Doctor | `GET/PUT/DELETE /doctor/consultation-summaries/{id}` | Manage |
| Patient | `GET /patient/appointments/{id}/summary` | Read summary |
| Patient | `GET /patient/instant-consultations/{id}/summary` | Read summary |
| Admin | `GET /admin/records/patients/{id}` | All records for a patient |

</details>

---

## Conventions for developers

- **Product copy and routes** live in `src/locales/{en,fr,rw}/`. Add all three languages together.
- **API access** goes through `src/lib/api.ts` (`apiFetch`) and role hooks — not ad-hoc URLs in random components.
- **Do not** treat call-complete as care-complete. If you add a follow-up (lab, Rx, booking), give it its own status and inbox.
- **Do not** hard-code a second consultation API. Extend `consultation_summaries`, `prescriptions`, `care_orders`, `referrals`, `service_bookings`.
- **Do not** print secrets, TURN passwords, or live Irembo invoices in logs or README updates.
- **Do not** mark production invoices paid, refund live consults, or approve pending doctors unless that is the requested support action.
- Morph columns (`tokenable_type`, `notifiable_type`) stay compatible with existing `App\Models\…` strings.
- After UI changes, verify the flow in the browser (not only a screenshot): empty states, the other tab that shares the same data, and mobile if layout changed.

---

*Last updated: October 2026*
