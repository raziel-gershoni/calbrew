# Sentry Integration Progress

## Completed Files

### API Routes

1. ✅ `/api/events/route.ts` - GET + POST with loop handling and aggregate reporting

## In Progress

2. 🔄 `/api/events/[id]/route.ts` - Import added, need PUT/DELETE handlers

## Remaining Critical Files (Priority 1)

3. `/api/events/[id]/sync/route.ts`
4. `/api/year-progression/route.ts`
5. `/api/year-progression/[eventId]/route.ts`
6. `/api/events/[id]/sync-status/route.ts`

## User Preference Routes (Priority 2) - Similar Pattern

All follow same structure: GET + PUT with simple error handling 7. `/api/user/hebrew-calendar-preferences/route.ts` 8. `/api/user/hebrew-event-preferences/route.ts` 9. `/api/user/daily-learning-preferences/route.ts` 10. `/api/user/daily-learning/route.ts` 11. `/api/user/hebrew-events/route.ts` 12. `/api/user/gcal-sync/route.ts` 13. `/api/user/language/route.ts` 14. `/api/user/calendar-mode/route.ts` 15. `/api/user/calendar/route.ts`

## Admin Routes (Priority 3)

16. `/api/admin/migration-status/route.ts`
17. `/api/test-postgres/route.ts`

## React Hooks (Priority 2) - Simpler Pattern

All need: import + catch block updates
18-28. All 11 hook files

## Utility Functions (Priority 3)

29. `src/lib/year-progression.ts`
30. `src/utils/hebrewDateUtils.ts`

## Pattern Templates

### Standard API Route Pattern:

```typescript
// 1. Add import
import * as SentryHelper from '@/lib/logger/sentry';

// 2. Auth breadcrumb (if !session)
SentryHelper.addBreadcrumb({
  message: 'Unauthorized access attempt',
  category: 'auth',
  level: 'info',
  data: { endpoint, method },
});

// 3. Validation breadcrumb (if validation fails)
SentryHelper.addBreadcrumb({
  message: 'Validation error',
  category: 'validation',
  level: 'info',
  data: { endpoint, method, validationErrors: validation.details },
});

// 4. Main catch block
catch (error) {
  console.error(...); // Keep existing
  SentryHelper.captureException(error, {
    tags: { endpoint, method, operation, userId },
    extra: { /* context */ },
    level: 'error',
  });
  return NextResponse.json(...);
}
```

### Standard Hook Pattern:

```typescript
// 1. Add import
import * as SentryHelper from '@/lib/logger/sentry';

// 2. Catch block
catch (error) {
  console.error(...); // Keep existing
  SentryHelper.captureException(error, {
    tags: { hook: 'hookName', operation },
    extra: { /* context */ },
    level: 'error',
  });
  // Keep existing error UI (toasts, etc.)
}
```

## Remaining Work Estimate

- Critical API routes (5 files): ~30 minutes
- User preference routes (9 files): ~45 minutes (repetitive pattern)
- Admin routes (2 files): ~10 minutes
- React hooks (11 files): ~30 minutes (simple pattern)
- Utility functions (2 files): ~15 minutes
- Testing & validation: ~20 minutes
- **Total**: ~2.5 hours

## Next Steps

Continue with systematic implementation, using pattern templates to speed up similar files.
