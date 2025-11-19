# CalBrew

A Hebrew calendar event management application with Google Calendar integration, built with Next.js 15.

## Features

- **Dual Calendar Modes**: View and manage events in either Hebrew or Gregorian calendar
- **Google Calendar Sync**: Automatic synchronization with a dedicated Google Calendar
- **Hebrew Calendar Events**: Built-in support for Jewish holidays, fasts, special Shabbat, and more
- **Daily Learning**: Track daily Torah study schedules (Daf Yomi, Mishna Yomi, Yerushalmi Yomi, Nach Yomi)
- **Year Progression**: Automatic detection and syncing of Hebrew year transitions
- **Multi-language Support**: English, Hebrew (RTL), and Spanish
- **Dark/Light Theme**: Automatic theme switching with system preference detection
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with connection pooling
- **Authentication**: NextAuth.js with Google OAuth
- **Hebrew Calendar**: @hebcal/core library for date calculations
- **UI Components**: React 19 with Heroicons v2
- **Styling**: Tailwind CSS v4
- **Internationalization**: react-i18next with RTL support
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
npm test             # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage report
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

- `src/lib/auth.ts` - NextAuth configuration with Google Calendar setup
- `src/lib/postgres.ts` - PostgreSQL schema and connection pooling
- `src/lib/migrations.ts` - Database migration system
- `src/lib/google-calendar.ts` - Calendar API integration
- `src/lib/year-progression.ts` - Hebrew year progression logic and batch processing
- `src/lib/background-service.ts` - Optional automatic year progression background worker
- `src/lib/token-refresh.ts` - OAuth token refresh management for background services
- `src/lib/logger/sentry.ts` - Sentry wrapper functions for error tracking
- `src/utils/hebrewDateUtils.ts` - Date conversion utilities and Hebrew event generation
- `src/hooks/useEvents.ts` - Event CRUD operations
- `src/hooks/useYearProgression.ts` - Year progression state management
- `src/i18n.ts` - Translation resources and RTL support

### Database Schema

- **users**: User profiles, OAuth tokens (access_token, refresh_token, token_expires_at), calendar preferences (mode, language, theme), Google Calendar IDs, Hebrew event preferences, daily learning preferences
- **events**: Hebrew calendar events with recurrence rules, title, description, Hebrew dates (year, month, day), sync preferences, and last_synced_hebrew_year for year progression tracking
- **event_occurrences**: Specific Google Calendar event instances with gregorian_date and google_event_id for sync tracking

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

- CSP headers configured
- Database foreign key constraints and indexes
- OAuth scope validation
- Secure session management with token refresh

## License

Private project

## Contributing

This is a private project. Contributions are managed internally.
