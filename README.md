# Thunnus - Phishing Simulation & Audit Platform

> Operator-grade phishing emulation with forensic telemetry, built for teams that need results, not noise.

![Stack](https://img.shields.io/badge/Stack-Astro%20%2B%20React%20%2B%20Firebase-0c0c0c?style=flat-square) ![Runtime](https://img.shields.io/badge/Node-18%2B-4B8BBE?style=flat-square) ![License](https://img.shields.io/badge/License-GPL--3.0-blue?style=flat-square) ![Version](https://img.shields.io/badge/Release-0.0.1-orange?style=flat-square)

Thunnus pairs convincing, localized phishing lures with deep evidence capture. Campaign operators get throttled delivery, pixel and click tracking, geolocation, and a live command center for audits or awareness training.

## Why Thunnus
- Real-world lures, not templates-in-a-vacuum: Microsoft/Google and judiciary-themed emails and landing pages tuned for Peru, Brazil, Ecuador, Colombia, and El Salvador.
- Delivery you control: throttle batch size and cadence, switch between Microsoft Graph or SMTP without rewriting flows, and persist delivery batches for audits.
- Forensics by default: IP, user agent, OS, browser, country/city lookup, and event timelines for each target. Invisible tracking pixel included.
- Operator-first UX: bulk uploads, filters, tags/groups, one-click exports, and per-user detail views with captured credentials when submitted.

## Core capabilities
- **Campaign engine**: Import users via UI or `POST /api/phishingUsers`, send to all or selected IDs, and monitor batch status via `/api/batches/:id`.
- **Email delivery**: Microsoft Graph or generic SMTP; Astro-powered email templates with per-target props, tracking pixels, and optional name/email masking.
- **Telemetry & tracking**: `/api/status` logs SENT/OPENED/CLICKED/SUBMIT with geo-IP enrichment and device parsing; `/api/tracking-pixel` marks opens.
- **Dashboards**: Campañas (progress, uploads, advanced send), Grupos (tags intelligence), Usuario (events, metadata, credentials), Configuración (provider, timezone, templates).
- **Data portability**: Export Firestore collections (`phishingUsers`, `events`, `batches`, `settings`) as JSON via UI or `GET /api/export/db`.

## Architecture
| Layer | Tech | Role |
| :-- | :-- | :-- |
| Frontend | Astro + React, Tailwind, Radix | UI, dashboards, landing pages, and email templates |
| Backend | Astro server (Node adapter) | API routes, auth, tracking, batch orchestration |
| Data | Firebase Auth + Firestore | Users, events, batches, settings, MS tokens |
| Delivery | Microsoft Graph Mail.Send or SMTP (Nodemailer) | Outbound email transport |
| Intelligence | UA Parser, ipapi.is | Device fingerprinting and geo enrichment |

## Quick start
1) Prerequisites: Node 18+, pnpm, Firebase project with Auth and Firestore, service account JSON; optional Microsoft 365 account with Mail.Send consent.  
2) Install:  
```bash
git clone https://github.com/your-username/thunnus.git
cd thunnus
pnpm install
```
3) Auto-install (EC2-ready, tweak as needed):  
```bash
curl -O https://raw.githubusercontent.com/Undead34/Thunnus/main/install_auto.sh
bash install_auto.sh
```
The script provisions Node, pnpm, PM2, and guides you through pasting Firebase config/service account data. It was written for EC2 defaults but can be adjusted for other hosts.
4) Configure environment (`.env`):  
```bash
# Firebase Admin (use service account file or inline fields)
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccount.json
# Or provide explicit values:
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=...
FIREBASE_CLIENT_ID=...
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=...

# Optional: Microsoft Graph delivery
MS_CLIENT_ID=your-app-client-id
TENANT=common            # or your tenant id
MICROSOFT_REFRESH_TOKEN=seed-refresh-token
DEBUG_MS=0               # set 1 to log Graph actions
```
5) Run locally: `pnpm dev` (default `http://localhost:4321`).  
6) Build/serve: `pnpm build` then `node ./dist/server/entry.mjs` (set `PORT` if you need a different bind).

## Operating the platform
- **Authenticate**: Email/password or Google sign-in via Firebase; session stored in `__session` cookie.
- **Load targets**: Paste CSV-like rows in Dashboard -> Campañas or call `POST /api/phishingUsers` with `{ name, email }[]`.
- **Send campaigns**: Pick provider and throttle in Dashboard -> Configuración; Advanced Send dialog controls batch size and wait time; `settings/email-template` selects the email HTML used.
- **Templates & mimicry**: Built-in emails/landings for Microsoft (ES/EN), Google Drive, OneDrive Excel, Sitca, and judiciary notices for Peru, Brazil, Ecuador, Colombia, El Salvador; dynamic props insert target name/email, censored email, locale, and tracking pixels.
- **Tracking & evidence**: `/api/status` + `/api/tracking-pixel` update Firestore with IP, UA, OS, browser, geo, click counts, form submissions, and event timelines; user detail pages surface captured credentials when submitted.
- **Tags & groups**: Assign tags from the Campaigns table (API: `POST /api/users/tags`) and explore distribution in Dashboard -> Grupos.
- **Exports & cleanup**: Download JSON from Dashboard -> Campañas -> Exportar Datos (API: `GET /api/export/db?collections=phishingUsers,events,batches,settings`); delete selected or all users via UI or `DELETE /api/phishingUsers`.
- **Health & ops**: `GET /api/health` returns uptime/version. Timezone preference lives in `src/config/index.ts` and is set from Dashboard -> Configuración.

## Deployment notes
- Uses the Astro Node adapter in standalone mode; ship `dist/` plus your `.env` and start with `node dist/server/entry.mjs`.
- Firestore collections used: `phishingUsers` (targets, events, metadata), `batches` (delivery runs), `settings` (SMTP/Graph/template/timezone), `msOauthTokens` (Graph tokens cache), optional `events`.
- Outbound calls: Microsoft Graph (if enabled) and `https://api.ipapi.is` for geolocation; ensure egress is allowed.

## Legal
Thunnus is for authorized security assessments and education only. You are responsible for obtaining written permission from targets and complying with all applicable laws.

## License
GPL-3.0 - see `LICENCE`.

<div align="center">
  <sub>Built with 🩸, sweat, and code by Undead34.</sub>
</div>
