# CalBrew

A Hebrew calendar event management application with Google Calendar integration, built with Next.js 15.

## Features

### User-Facing Features
- **Dual Calendar Modes**: View and manage events in either Hebrew or Gregorian calendar
- **Google Calendar Sync**: Automatic synchronization with a dedicated Google Calendar
- **Hebrew Calendar Events**: Built-in support for Jewish holidays, fasts, special Shabbat, and more
- **Daily Learning**: Track daily Torah study schedules (Daf Yomi, Mishna Yomi, Yerushalmi Yomi, Nach Yomi)
- **Year Progression**: Automatic detection and syncing of Hebrew year transitions
- **Multi-language Support**: English, Hebrew (RTL), and Spanish
- **Dark/Light Theme**: Automatic theme switching with system preference detection
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### B2B API Service
- **Third-Party API**: RESTful API for Hebrew date services (e.g., flower shops tracking customer birthdays)
- **Two-Tier System**: Basic (date utilities) and Premium (contact management + webhooks)
- **Flexible Authentication**: API keys and OAuth2 client credentials flow
- **Rate Limiting**: Configurable per-minute and per-day limits
- **Webhook Notifications**: Automated notifications for upcoming Hebrew dates via QStash
- **Comprehensive Testing**: 169 tests covering all functionality

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with connection pooling
- **Authentication**: NextAuth.js with Google OAuth (users), API keys + OAuth2 (B2B)
- **Hebrew Calendar**: @hebcal/core library for date calculations
- **Webhook Delivery**: Upstash QStash for serverless webhook scheduling
- **UI Components**: React 19 with Heroicons v2
- **Styling**: Tailwind CSS v4
- **Internationalization**: react-i18next with RTL support
- **Validation**: Zod schemas for type-safe request validation
- **Testing**: Vitest with 169 passing tests
- **Error Tracking**: Sentry integration
- **Analytics**: Vercel Analytics

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Google OAuth credentials with Calendar API access

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Optional: Background Services
BACKGROUND_YEAR_PROGRESSION_ENABLED=false

# Optional: Sentry (for error tracking)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd calbrew
```

2. Install dependencies:

```bash
npm install
```

3. Set up your environment variables (see above)

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

The database schema will be automatically initialized and migrated on first run.

## Third-Party API Service

CalBrew provides a comprehensive B2B API for Hebrew date services, enabling third-party applications (e.g., flower shops, event planners) to integrate Hebrew calendar functionality.

### API Architecture

The API is organized into two service tiers:

#### Tier 1 (Basic) - Date Utilities
Stateless date conversion and lookup services:
- Hebrew ↔ Gregorian date conversion
- Generate Hebrew date occurrences in a date range
- Holiday and fast day lookup with customizable filters

**Scopes**: `dates:read`

#### Tier 2 (Premium) - Managed Service
Full contact management with webhook notifications:
- Store contacts with Hebrew dates (birthdays, anniversaries, etc.)
- Query upcoming dates across all contacts
- Webhook notifications N days before events
- Automated daily cron job for notification scheduling

**Scopes**: `contacts:read`, `contacts:write`, `webhooks:read`, `webhooks:write`

### Authentication

Two authentication methods are supported:

#### 1. API Keys (Recommended for most use cases)
```bash
Authorization: Bearer cb_live_[32-char-random]
```

- Format: `cb_live_*` (production) or `cb_test_*` (testing)
- Stored as SHA-256 hashes for security
- Configurable scopes per key
- Optional expiration dates

#### 2. OAuth2 Client Credentials Flow (Enterprise)
```bash
POST /api/v1/auth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=xxx&client_secret=xxx

Response:
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "dates:read contacts:read contacts:write"
}
```

Use the access token:
```bash
Authorization: Bearer eyJhbG...
```

### Rate Limiting

| Tier    | Per Minute | Per Day   |
|---------|------------|-----------|
| Basic   | 60         | 10,000    |
| Premium | 300        | 100,000   |

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1706025600
```

When rate limit is exceeded, you'll receive a `429 Too Many Requests` response with a `Retry-After` header.

### API Endpoints

#### Health Check
```bash
GET /api/v1/health
# No authentication required

Response:
{
  "status": "healthy",
  "version": "v1",
  "timestamp": "2025-01-23T12:00:00Z"
}
```

#### Date Conversion (Tier 1)
```bash
POST /api/v1/dates/convert
Authorization: Bearer cb_live_xxx
Content-Type: application/json

{
  "conversions": [
    {
      "from": "hebrew",
      "to": "gregorian",
      "date": { "day": 15, "month": 7, "year": 5785 }
    },
    {
      "from": "gregorian",
      "to": "hebrew",
      "date": "2025-01-15"
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "conversions": [
      {
        "from": "hebrew",
        "to": "gregorian",
        "input": { "day": 15, "month": 7, "year": 5785 },
        "output": "2024-10-17",
        "hebrewDateFormatted": "15 Tishrei 5785",
        "gregorianDateFormatted": "Thu Oct 17 2024"
      },
      ...
    ],
    "count": 2
  }
}
```

#### Generate Occurrences (Tier 1)
```bash
POST /api/v1/dates/occurrences
Authorization: Bearer cb_live_xxx
Content-Type: application/json

{
  "dates": [
    {
      "hebrewDay": 15,
      "hebrewMonth": 5,
      "hebrewYear": 5750,
      "title": "Birthday"
    }
  ],
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}

Response:
{
  "success": true,
  "data": {
    "dates": [
      {
        "hebrewDate": { "day": 15, "month": 5, "year": 5750 },
        "title": "Birthday",
        "occurrences": [
          {
            "gregorianDate": "2025-02-13",
            "hebrewYear": 5785,
            "anniversary": 35
          }
        ]
      }
    ],
    "summary": {
      "totalDates": 1,
      "totalOccurrences": 1
    }
  }
}
```

#### List Holidays (Tier 1)
```bash
GET /api/v1/dates/holidays?startDate=2025-01-01&endDate=2025-01-31&types=majorHolidays,minorHolidays&language=en
Authorization: Bearer cb_live_xxx

Response:
{
  "success": true,
  "data": {
    "holidays": [
      {
        "id": "...",
        "title": "Rosh Chodesh Shevat",
        "gregorianDate": "2025-01-30",
        "hebrewDate": {
          "day": 1,
          "month": 11,
          "year": 5785,
          "formatted": "1 Shevat 5785"
        },
        "type": "roshChodesh",
        "flags": 8
      }
    ],
    "count": 1
  }
}
```

#### Create Contact (Tier 2)
```bash
POST /api/v1/contacts
Authorization: Bearer cb_live_xxx
Content-Type: application/json

{
  "externalId": "customer-123",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "metadata": {
    "customerId": 456,
    "tier": "premium"
  },
  "dates": [
    {
      "type": "birthday",
      "hebrewDay": 15,
      "hebrewMonth": 5,
      "hebrewYear": 5750,
      "notifyDaysBefore": 7
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "contact": {
      "id": "cnt_abc123",
      "externalId": "customer-123",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "metadata": { "customerId": 456, "tier": "premium" },
      "createdAt": "2025-01-23T12:00:00Z",
      "updatedAt": "2025-01-23T12:00:00Z"
    },
    "dates": [
      {
        "id": "date_xyz789",
        "type": "birthday",
        "hebrewDate": { "day": 15, "month": 5, "year": 5750 },
        "notifyDaysBefore": 7
      }
    ]
  },
  "message": "Contact created successfully"
}
```

#### Query Upcoming Dates (Tier 2)
```bash
GET /api/v1/contacts/dates/upcoming?daysAhead=30&dateTypes=birthday,anniversary&limit=100&offset=0
Authorization: Bearer cb_live_xxx

Response:
{
  "success": true,
  "data": {
    "dates": [
      {
        "contact": {
          "id": "cnt_abc123",
          "externalId": "customer-123",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "date": {
          "id": "date_xyz789",
          "type": "birthday",
          "hebrewDate": { "day": 15, "month": 5, "year": 5750 },
          "notifyDaysBefore": 7
        },
        "occurrence": {
          "gregorianDate": "2025-02-13",
          "daysUntil": 7,
          "anniversary": 35
        }
      }
    ],
    "summary": {
      "today": 0,
      "thisWeek": 1,
      "thisMonth": 3,
      "total": 5
    },
    "pagination": {
      "limit": 100,
      "offset": 0,
      "total": 5,
      "hasMore": false
    }
  }
}
```

#### Create Webhook (Tier 2)
```bash
POST /api/v1/webhooks
Authorization: Bearer cb_live_xxx
Content-Type: application/json

{
  "url": "https://example.com/webhooks/calbrew",
  "events": ["date.upcoming"],
  "retryCount": 3,
  "timeoutMs": 30000
}

Response:
{
  "success": true,
  "data": {
    "webhook": {
      "id": "wh_def456",
      "url": "https://example.com/webhooks/calbrew",
      "events": ["date.upcoming"],
      "isActive": true,
      "retryCount": 3,
      "timeoutMs": 30000,
      "createdAt": "2025-01-23T12:00:00Z"
    },
    "secret": "whsec_abc123..." // Only shown once!
  },
  "message": "Webhook created successfully. Save the secret - it will not be shown again."
}
```

### Webhook System

CalBrew uses **Upstash QStash** for reliable webhook delivery in a serverless environment.

#### Webhook Payload Format
```json
{
  "event": "date.upcoming",
  "timestamp": "2025-02-06T06:00:00Z",
  "data": {
    "contacts": [
      {
        "contactId": "cnt_abc123",
        "externalId": "customer-123",
        "name": "John Doe",
        "date": {
          "type": "birthday",
          "hebrewDate": { "day": 15, "month": 5, "year": 5750 },
          "gregorianDate": "2025-02-13",
          "daysUntil": 7,
          "anniversary": 35
        }
      }
    ]
  }
}
```

#### Webhook Security

All webhook requests include HMAC-SHA256 signatures for verification:

**Headers:**
```
X-Calbrew-Signature: sha256=abc123...
X-Calbrew-Timestamp: 2025-02-06T06:00:00Z
```

**Verification (Node.js example):**
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;
  return signature === expectedSignature;
}

// In your webhook handler:
const rawBody = await request.text();
const signature = request.headers.get('X-Calbrew-Signature');
const secret = 'whsec_...'; // From webhook creation

if (!verifyWebhook(rawBody, signature, secret)) {
  return new Response('Invalid signature', { status: 401 });
}

const payload = JSON.parse(rawBody);
// Process the webhook...
```

#### Webhook Scheduling

A daily cron job runs at **6:00 AM UTC** to check for upcoming dates and schedule webhooks:
- Checks all contacts across all premium clients
- Schedules webhooks N days before each date (based on `notifyDaysBefore`)
- Uses QStash for reliable delivery with automatic retries
- Tracks delivery status in the database

### Environment Variables (API Service)

Add these to your `.env.local` for the B2B API service:

```bash
# Upstash QStash (required for webhooks)
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=your_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key

# Cron job authentication (generate with: openssl rand -base64 32)
CRON_SECRET=your_random_secret
```

Get QStash credentials from: https://console.upstash.com/

### Testing the API

The API includes comprehensive test coverage (71 tests specifically for the API):

```bash
# Run all tests (169 total)
npm test

# Test files for API:
# - src/lib/api-auth.test.ts (15 tests) - Key generation, hashing, scopes
# - src/lib/api-validation.test.ts (37 tests) - All Zod schemas
# - src/lib/api-rate-limit.test.ts (7 tests) - Rate limit logic
# - src/lib/qstash.test.ts (12 tests) - Webhook signatures, payloads
```

### API Database Schema

The API service adds 10 new tables:

| Table | Purpose |
|-------|---------|
| `api_clients` | Third-party app registration (tier, rate limits) |
| `api_keys` | API key management with SHA-256 hashing |
| `api_rate_limits` | Sliding window rate limit tracking |
| `api_contacts` | Contact storage for Tier 2 clients |
| `api_contact_dates` | Hebrew dates associated with contacts |
| `webhook_configs` | Webhook endpoint configurations |
| `webhook_deliveries` | Delivery tracking and retry queue |
| `oauth_clients` | OAuth2 client credentials |
| `oauth_access_tokens` | OAuth2 access tokens |

All tables include proper indexes for performance and foreign key constraints for data integrity.

## Development

### Commands

```bash
npm run dev          # Start development server
npm run dev:pretty   # Start dev server with formatted logs
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Check code quality
npm run lint:fix     # Auto-fix linting issues
npm run format       # Format code with Prettier
npm test             # Run tests (169 tests)
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage report
```

### Testing

CalBrew has comprehensive test coverage with **169 passing tests**:

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| **User Application** | 98 tests | |
| `validation.test.ts` | 50 | Request validation, error responses |
| `hebrewDateUtils.test.ts` | 32 | Date conversion, occurrence generation |
| `year-progression.test.ts` | 15 | Year sync logic, batch processing |
| `api/events/route.test.ts` | 1 | Event API endpoints |
| **B2B API Service** | 71 tests | |
| `api-validation.test.ts` | 37 | All API Zod schemas |
| `api-auth.test.ts` | 15 | Key generation, hashing, scope checking |
| `qstash.test.ts` | 12 | Webhook signatures, payload building |
| `api-rate-limit.test.ts` | 7 | Rate limit header generation |

All tests use **Vitest** with the following features:
- Unit tests for utilities and libraries
- Integration tests for API endpoints
- Snapshot testing for complex objects
- Mock service workers (MSW) for external API testing
- Happy-dom for DOM testing

Run the full validation suite before committing:
```bash
npm run lint:fix && npx tsc --noEmit && npm run format && npm test
```

### Database

The application uses automatic schema migrations on startup. Migration files are located in `src/lib/migrations.ts`.

To check migration status, visit: `/api/admin/migration-status`

## Architecture

### Key Components

- **Authentication**: Google OAuth with automatic token refresh for background services
- **Calendar Sync**: Per-event Google Calendar synchronization control with dedicated calendar
- **Hebrew Date Conversion**: Cached conversions between Hebrew and Gregorian calendars using @hebcal/core
- **Year Progression**: Automatic sync window calculation (±10 years) with tracking of last synced Hebrew year
- **Error Monitoring**: Comprehensive Sentry integration across all API endpoints, hooks, and utilities
- **State Management**: Custom hooks pattern with context providers and local storage backup
- **API Layer**: RESTful endpoints with Zod validation and consistent error responses

### Important Files

#### User Application
- `src/lib/auth.ts` - NextAuth configuration with Google Calendar setup
- `src/lib/postgres.ts` - PostgreSQL schema and connection pooling
- `src/lib/migrations.ts` - Database migration system (now includes 10 API migrations)
- `src/lib/google-calendar.ts` - Calendar API integration
- `src/lib/year-progression.ts` - Hebrew year progression logic and batch processing
- `src/lib/background-service.ts` - Optional automatic year progression background worker
- `src/lib/token-refresh.ts` - OAuth token refresh management for background services
- `src/lib/logger/sentry.ts` - Sentry wrapper functions for error tracking
- `src/utils/hebrewDateUtils.ts` - Date conversion utilities and Hebrew event generation
- `src/hooks/useEvents.ts` - Event CRUD operations
- `src/hooks/useYearProgression.ts` - Year progression state management
- `src/i18n.ts` - Translation resources and RTL support

#### B2B API Service
- `src/lib/api-auth.ts` - API key generation, validation, OAuth2 token management
- `src/lib/api-rate-limit.ts` - PostgreSQL-based sliding window rate limiting
- `src/lib/api-middleware.ts` - Authentication, rate limiting, scope checking middleware
- `src/lib/api-validation.ts` - Zod schemas for all API requests
- `src/lib/api-postgres-utils.ts` - Database utilities for API tables (contacts, webhooks)
- `src/lib/qstash.ts` - QStash client wrapper for webhook delivery
- `src/app/api/v1/` - All API v1 endpoints (dates, contacts, webhooks, auth)
- `src/app/api/internal/check-dates/` - Daily cron endpoint for webhook scheduling
- `vercel.json` - Cron job configuration (daily at 6 AM UTC)

### Database Schema

#### User Application Tables
- **users**: User profiles, OAuth tokens (access_token, refresh_token, token_expires_at), calendar preferences (mode, language, theme), Google Calendar IDs, Hebrew event preferences, daily learning preferences
- **events**: Hebrew calendar events with recurrence rules, title, description, Hebrew dates (year, month, day), sync preferences, and last_synced_hebrew_year for year progression tracking
- **event_occurrences**: Specific Google Calendar event instances with gregorian_date and google_event_id for sync tracking

#### B2B API Tables
- **api_clients**: Third-party app registration with tier (basic/premium), contact email, and configurable rate limits (per-minute, per-day)
- **api_keys**: API key management with SHA-256 hashed keys, key prefixes for identification, scopes array, expiration dates
- **api_rate_limits**: Rate limit tracking with sliding window (minute/day), request counts, and automatic cleanup
- **api_contacts**: Contact storage for premium clients with external_id (unique per client), name, email, phone, metadata JSONB
- **api_contact_dates**: Hebrew dates per contact with date_type, Hebrew date components, notify_days_before setting
- **webhook_configs**: Webhook configuration with HTTPS URL, HMAC secret, event subscriptions, retry settings
- **webhook_deliveries**: Delivery tracking with status (pending/delivered/failed), attempt counts, retry scheduling
- **oauth_clients**: OAuth2 client credentials with hashed secrets for enterprise clients
- **oauth_access_tokens**: OAuth2 tokens with scopes, expiration times, and automatic cleanup

All API tables use:
- Foreign key constraints for data integrity
- Client ID filtering for tenant isolation (security)
- Proper indexes for query performance
- TIMESTAMPTZ for all timestamps
- ON DELETE CASCADE where appropriate

## Features in Detail

### Hebrew Calendar Integration

- Supports all months including leap year variations (Adar I & II)
- Event recurrence with Hebrew date tracking
- Israeli holiday schedule with customizable preferences

### Year Progression

- Automatic detection when a new Hebrew year begins
- Optional background service for automatic syncing
- Manual sync control through UI

### Customizable Preferences

- Hebrew calendar events (holidays, fasts, special Shabbat, Rosh Chodesh, etc.)
- Daily learning schedules
- Google Calendar sync per event
- Language and theme preferences

## Security

### User Application
- CSP headers configured
- Database foreign key constraints and indexes
- OAuth scope validation with Google Calendar API
- Secure session management with automatic token refresh
- Input validation with Zod schemas

### B2B API Service
- **API Keys**: Stored as SHA-256 hashes, never in plaintext
- **OAuth2 Secrets**: Client secrets stored as SHA-256 hashes
- **Webhook Signatures**: HMAC-SHA256 for payload verification
- **Tenant Isolation**: All queries filtered by `client_id`
- **Rate Limiting**: Prevents abuse with configurable limits
- **Scope-Based Access**: Fine-grained permissions (read/write)
- **HTTPS Only**: Webhook URLs must use HTTPS
- **Input Validation**: All requests validated with Zod before processing
- **SQL Injection Prevention**: Parameterized queries only
- **Token Expiration**: OAuth tokens expire after 1 hour
- **Audit Trail**: All webhook deliveries tracked in database

## License

Private project

## Contributing

This is a private project. Contributions are managed internally.
