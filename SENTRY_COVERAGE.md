# Sentry Coverage Analysis

**Last Updated:** 2025-11-19

## Summary

Current Sentry integration provides good coverage for infrastructure and global errors, but has **critical gaps in API routes and React hooks** that would make debugging production issues difficult.

## ✅ What IS Covered

### Global Error Handlers

- ✅ Global error boundary (`src/app/global-error.tsx`) - catches all unhandled errors
- ✅ React Error Boundary component (`src/components/ErrorBoundary.tsx`) - catches component-level errors
- ✅ Next.js request error hook (`onRequestError` in `src/instrumentation.ts`) - catches server-side errors

### Infrastructure Layer (Good Coverage)

- ✅ **Auth flow** (`src/lib/auth.ts`) - 9 Sentry captures
  - OAuth errors
  - Token refresh failures
  - Calendar setup issues
  - Missing tokens
  - Database token storage errors
- ✅ **Google Calendar** (`src/lib/google-calendar.ts`) - 1 capture for calendar creation errors
- ✅ **Database initialization** (`src/lib/postgres.ts`) - 1 capture for schema initialization
- ✅ **Background service** (`src/lib/background-service.ts`) - 4 captures
  - Year progression check failures
  - Token refresh issues
  - Event update failures

### Sentry Configuration Features

- ✅ Automatic breadcrumbs (max 50)
- ✅ Sensitive data sanitization (tokens, passwords, auth headers)
- ✅ Performance monitoring (10% sampling in production, 100% in dev)
- ✅ User context tracking with `setUser()`
- ✅ Environment & release tracking via Vercel
- ✅ Transaction/span tracking for performance
- ✅ Helper functions (`withMonitoring`, `captureException`, `captureMessage`)

## ❌ Critical Gaps

### 1. API Routes (0 out of 18 routes) 🔴 HIGH PRIORITY

**72 error handlers but ZERO Sentry captures** - only using `console.error()`

#### Affected Routes:

- `/api/events/route.ts` - GET/POST events (8 error handlers)
- `/api/events/[id]/route.ts` - PUT/DELETE single event (10 error handlers)
- `/api/events/[id]/sync/route.ts` - Sync event to Google Calendar (4 error handlers)
- `/api/events/[id]/sync-status/route.ts` - Get sync status (2 error handlers)
- `/api/user/hebrew-calendar-preferences/route.ts` - User preferences (4 error handlers)
- `/api/user/hebrew-event-preferences/route.ts` - Event preferences (4 error handlers)
- `/api/user/daily-learning-preferences/route.ts` - Learning preferences (4 error handlers)
- `/api/user/daily-learning/route.ts` - Daily learning toggle (4 error handlers)
- `/api/user/hebrew-events/route.ts` - Hebrew events toggle (4 error handlers)
- `/api/user/gcal-sync/route.ts` - Google Calendar sync toggle (4 error handlers)
- `/api/user/language/route.ts` - Language preference (5 error handlers)
- `/api/user/calendar-mode/route.ts` - Calendar mode toggle (5 error handlers)
- `/api/user/calendar/route.ts` - Calendar info (2 error handlers)
- `/api/year-progression/route.ts` - Year progression summary (4 error handlers)
- `/api/year-progression/[eventId]/route.ts` - Event year progression (4 error handlers)
- `/api/admin/migration-status/route.ts` - Migration status (2 error handlers)
- `/api/test-postgres/route.ts` - Database test (2 error handlers)

**Impact:** API failures are invisible in Sentry. No tracking of:

- Which endpoints fail most often
- Error patterns across users
- Request context (headers, body, query params)
- User identification
- Performance issues

### 2. React Hooks (0 out of 11 hooks) 🟡 MEDIUM PRIORITY

**48 error handlers but no Sentry integration** - only console logging

#### Affected Hooks:

- `useEvents` - Event CRUD operations (8 error handlers)
- `useYearProgression` - Hebrew year transitions (4 error handlers)
- `useGcalSync` - Google Calendar sync (4 error handlers)
- `useHebrewEvents` - Hebrew events toggle (4 error handlers)
- `useHebrewCalendarPreferences` - Calendar preferences (4 error handlers)
- `useHebrewEventPreferences` - Event preferences (4 error handlers)
- `useDailyLearningPreferences` - Learning preferences (4 error handlers)
- `useDailyLearning` - Daily learning toggle (4 error handlers)
- `useLanguage` - Language preference (5 error handlers)
- `useCalendarMode` - Calendar mode (5 error handlers)
- `useAutoReauth` - Auto re-authentication (2 error handlers)

**Impact:** Client-side operation failures lack context about:

- Which user actions trigger errors
- Sequence of operations leading to failure
- State when error occurred

### 3. Components (22 files) 🟢 LOW PRIORITY

- No explicit error handling beyond error boundaries
- Component-level errors ARE caught by boundaries but may lack specific context
- Not a critical gap since boundaries provide baseline coverage

## Risk Assessment

### 🔴 High Risk - API Routes

**Issue:** API route errors are completely invisible to Sentry

**Why it matters:**

- Production bugs in API routes won't be tracked
- Can't identify which endpoints are failing
- Missing request/response context
- No performance monitoring for API calls
- Can't correlate errors with specific users

**Example:** If `/api/events/route.ts POST` fails for some users, we'd never know unless they report it.

### 🟡 Medium Risk - React Hooks

**Issue:** Hook errors lack context and tracking

**Why it matters:**

- Client-side failures happen silently
- Can't track which operations fail most
- Missing user flow context

**Mitigation:** Error boundaries catch component errors, so hooks that crash components will be tracked

### 🟢 Low Risk - Infrastructure

**Current state:** Well covered with comprehensive error tracking

## Recommendations

### Priority 1: Add Sentry to API Routes

Replace all `console.error()` calls in `/api/**/*.ts` with:

```typescript
import * as SentryHelper from '@/lib/logger/sentry';

// In catch blocks:
catch (error) {
  SentryHelper.captureException(error, {
    tags: {
      operation: 'api-endpoint-name',
      method: request.method,
      path: request.url,
    },
    extra: {
      userId: session?.user?.id,
      requestBody: sanitizedBody, // Be careful with PII
    },
    level: 'error',
  });

  console.error('Error message:', error);
  return NextResponse.json(...);
}
```

**Estimated effort:** 2-3 hours to update all API routes

### Priority 2: Add Sentry to Critical Hooks

Focus on hooks that manage critical operations:

- `useEvents` - Event management
- `useYearProgression` - Year transitions
- `useGcalSync` - Google Calendar sync

```typescript
import * as SentryHelper from '@/lib/logger/sentry';

// In catch blocks:
catch (error) {
  SentryHelper.captureException(error, {
    tags: {
      operation: 'hook-operation-name',
      hook: 'useEvents',
    },
    extra: {
      eventId: id,
      // other relevant context
    },
    level: 'error',
  });

  console.error('Error message:', error);
  // ... existing error handling
}
```

**Estimated effort:** 1-2 hours for critical hooks

### Priority 3: Add Performance Monitoring

Use `withMonitoring` wrapper for critical operations:

```typescript
import { withMonitoring } from '@/lib/logger/sentry';

const result = await withMonitoring(
  'fetch-events',
  async () => {
    return await fetch('/api/events');
  },
  {
    tags: { userId: session?.user?.id },
  },
);
```

## Test Coverage

Current test coverage is ~5-10% (see separate analysis). Low test coverage combined with low Sentry coverage creates blind spots in production.

## Monitoring Checklist

- [x] Global error boundaries
- [x] Infrastructure errors (auth, database, calendar)
- [x] Background service errors
- [ ] API route errors (0/18 routes)
- [ ] React hook errors (0/11 hooks)
- [ ] Performance monitoring for critical paths
- [ ] User flow tracking with breadcrumbs
