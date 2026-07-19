# CalBrew
> A Hebrew-calendar event manager with automatic Google Calendar sync — and a self-built, multi-tenant B2B API for Hebrew-date services, all in one Next.js codebase.

![Next.js](https://img.shields.io/badge/Next.js_15-000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232a?style=flat-square&logo=react&logoColor=61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169e1?style=flat-square&logo=postgresql&logoColor=white)
![NextAuth](https://img.shields.io/badge/NextAuth.js-000?style=flat-square&logo=auth0&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6e9f18?style=flat-square&logo=vitest&logoColor=white)
![Sentry](https://img.shields.io/badge/Sentry-362d59?style=flat-square&logo=sentry&logoColor=white)
[![demo · live](https://img.shields.io/badge/demo-live-2ea44f?style=flat-square)](https://calbrew.vercel.app)

**🔗 Live demo:** https://calbrew.vercel.app  <!-- sign in with Google to reach the app; the B2B API demo playground is at /demo -->

CalBrew is two products in one codebase. The first is a consumer web app that lets people track life events by their **Hebrew date** and keep them synced to a dedicated Google Calendar as the Hebrew year advances. The second is a versioned, multi-tenant **REST API** that exposes Hebrew-date conversion, occurrence generation, holiday lookup, and webhook notifications to other businesses (for example, a flower shop tracking customers' Hebrew-date birthdays). The interesting engineering lives in the API platform, the Google Calendar year-progression pipeline, and the Hebrew-calendar math.

<!-- Screenshot placeholder: leave exactly this HTML comment so the owner can drop an image in later:
     ![screenshot](docs/screenshot.png) -->

## ✨ Features

- **Dual calendar modes** — create and browse events in either Hebrew or Gregorian mode, backed by `@hebcal/core` conversions.
- **Automatic Google Calendar sync** — each event can sync to a dedicated, per-environment CalBrew calendar so it never clutters the user's primary calendar.
- **Hebrew-year progression** — as new Hebrew years begin, each recurring event is re-projected onto the new year's Gregorian date and re-synced, catching up from the event's last synced Hebrew year to the current one (tracked per event via `last_synced_hebrew_year`).
- **Jewish holidays & daily learning** — built-in holidays, fasts, special Shabbatot, and Rosh Chodesh, plus daily Torah-study schedules (Daf Yomi, Mishna Yomi, Yerushalmi Yomi, Nach Yomi) on the Israeli schedule.
- **Multi-language, RTL-aware UI** — English, Hebrew (full right-to-left), Spanish, Russian, and German, with dark/light theming and system-preference detection.
- **Installable PWA** — manifest and icons for a native-feeling mobile experience.
- **B2B API with self-serve dashboards** — developer and admin dashboards for registering API clients, minting API keys, and managing tiers, plus an interactive demo playground.

## 🏗️ How it works

**A self-built B2B API platform.** The `/api/v1` surface is a versioned, multi-tenant REST API with two independent authentication paths handled by a single middleware chain: opaque **API keys** (prefixed `cb_live_` / `cb_test_`, stored only as SHA-256 hashes and never in plaintext) and an **OAuth2 client-credentials flow** that issues short-lived bearer tokens. Every request runs through authentication, **scope checking** (`dates:read`, `contacts:read/write`, `webhooks:read/write`), and **PostgreSQL-backed sliding-window rate limiting** (separate per-minute and per-day windows keyed on the client, with `X-RateLimit-*` response headers). Strict `client_id` filtering enforces tenant isolation across roughly ten API tables, so one client can never read another's contacts, webhooks, or keys.

**Webhook delivery you can trust.** Premium clients store contacts with Hebrew dates and a `notifyDaysBefore` setting. A daily **Vercel cron** job scans upcoming dates across all premium clients and schedules notifications through **Upstash QStash** for reliable, serverless delivery with automatic retries. Every payload is signed with **HMAC-SHA256** so receivers can verify authenticity, and delivery/retry status is tracked in the database as an audit trail.

**Google OAuth with background workers.** User sign-in uses NextAuth with Google's offline-access flow; refresh tokens are rotated and persisted so a **background year-progression worker** can act on a user's behalf without them being online. On first sync, CalBrew auto-creates a dedicated Google Calendar (namespaced per environment) and writes event occurrences into it, wrapping calendar calls in a retry helper to absorb transient Google API failures.

**Hebrew-calendar math.** Conversions handle the awkward parts of the Hebrew calendar directly — leap-year **Adar I / Adar II** resolution and anniversary/occurrence generation — projecting each recurring Hebrew date onto its Gregorian instances across the requested date range (the public occurrences endpoint caps a single request at 10 years). Conversions are cached for performance and covered by a dedicated test suite.

**Production hygiene.** Schema **migrations run automatically on startup**; all database access uses parameterized queries; error handling routes expected failures to Sentry breadcrumbs and unexpected ones to full exception capture with structured tags. Security headers and a Content-Security-Policy are set at the framework level, and CI runs the test suite, ESLint, and `tsc --noEmit` on every push and pull request.

## 🛠️ Tech stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS v4, `next-themes`, Heroicons, i18next / react-i18next (en / he-RTL / es / ru / de), PWA
- **Backend / API:** Next.js Route Handlers, NextAuth v4 (Google OAuth + Calendar scopes, token refresh), Zod validation, custom API-key + OAuth2 auth, sliding-window rate limiting
- **Data:** PostgreSQL (Neon) via `pg` with connection pooling and auto-migrations
- **Calendar / domain:** `@hebcal/core`, `@hebcal/learning`, `@hebcal/locales`, `googleapis` / `google-auth-library`
- **Async / webhooks:** Upstash QStash, HMAC-SHA256 signing, Vercel cron
- **Testing:** Vitest, Testing Library, happy-dom
- **Observability & infra:** Sentry, Vercel Analytics, Pino logging, GitHub Actions CI, deployed on Vercel

## 🚀 Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (Neon, Supabase, or local Postgres)
- Google OAuth credentials with the Google Calendar API enabled
- (Optional) Upstash QStash credentials — only needed to exercise the B2B webhook features

### Environment variables

Copy `.env.example` to `.env.local` and fill in the values. Never commit real secrets.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `NEXTAUTH_SECRET` | Yes | NextAuth session encryption secret |
| `NEXTAUTH_URL` | Yes | Base URL of the app (e.g. `http://localhost:3000`) |
| `BACKGROUND_YEAR_PROGRESSION_ENABLED` | No | Toggle the background year-progression worker |
| `QSTASH_TOKEN` | No | Upstash QStash REST token (webhook delivery) |
| `QSTASH_CURRENT_SIGNING_KEY` | No | QStash signing key for verifying incoming webhooks |
| `QSTASH_NEXT_SIGNING_KEY` | No | QStash rotation signing key |
| `CRON_SECRET` | No | Shared secret authenticating the daily cron endpoint |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN (browser-safe) |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | No | Sentry source-map uploads |
| `REDIS_URL` | No | Optional cache connection string |
| `LOG_LEVEL` | No | Pino log level (`error` / `warn` / `info` / `debug`) |

### Install & run

```bash
npm install       # install dependencies
npm run dev       # start the dev server at http://localhost:3000
# npm run dev:pretty   # dev server with pretty-printed Pino logs

npm run build     # production build
npm start         # serve the production build
```

The database schema is created and migrated automatically on first run.

## 🧪 Testing

The project uses **Vitest** with Testing Library and happy-dom — roughly 200 test cases spanning Hebrew-date utilities, request validation, year-progression logic, and the full B2B API surface (key generation and hashing, scope checking, rate limiting, and webhook signatures/payloads).

```bash
npm test              # run the test suite
npm run test:ui       # interactive Vitest UI
npm run test:coverage # coverage report
```

GitHub Actions runs the tests, ESLint, and a TypeScript type check on every push and pull request to `main`.

## 📦 Deployment

Deployed on **Vercel**. Database migrations run automatically at startup, and a **Vercel cron** job (`vercel.json`) hits `/api/internal/check-dates` daily at 06:00 UTC to schedule upcoming-date webhooks through Upstash QStash. Environment variables are configured in the Vercel dashboard.

## 📄 License

Shared publicly as a portfolio project.
