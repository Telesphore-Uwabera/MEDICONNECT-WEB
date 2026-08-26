# MediConnect

Telemedicine frontend for Rwanda. Patients, doctors, hospitals, pharmacies, and admins share one React app that talks to the MediConnect API.

Book a specialist, start an instant video consult, receive a digital prescription, and send it to a pharmacy.

## Stack

- React 18, Vite, TypeScript
- React Router, TanStack Query, Tailwind CSS / shadcn
- i18next (English, French, Kinyarwanda)
- WebRTC video with Laravel Echo (Reverb) for signaling and chat

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm test` | Run unit tests |

## Workspaces

| Role | Routes |
|------|--------|
| Patient | `/patient` |
| Doctor | `/doctor` |
| Hospital | `/hospital` |
| Pharmacy | `/pharmacy` |
| Admin | `/admin` |

Doctors, hospitals, and pharmacies wait for admin approval before the full workspace opens. Public search pages for doctors, facilities, and pharmacies do not require login.
