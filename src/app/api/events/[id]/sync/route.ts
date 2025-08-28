import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';
import { HDate } from '@hebcal/core';
import { ensureCalendarExists } from '@/lib/google-calendar';
import {
  EventIdSchema,
  createSuccessResponse,
  createErrorResponse,
  validateRequest,
} from '@/lib/validation';
import {
  getCurrentCalendarId,
  getEventById,
  isEventSynced,
  createEventOccurrence,
} from '@/lib/db-utils';
import { withGoogleCalendarRetry, AppError } from '@/lib/retry';

function calculateSyncWindow(event_start_year: number): {
  start: number;
  end: number;
} {
  const current_year = new HDate().getFullYear();

  if (event_start_year < current_year - 10) {
    // Scenario 1: Event in the Distant Past
    return { start: current_year - 10, end: current_year + 10 };
  } else if (event_start_year <= current_year) {
    // Scenario 2: Event in the Recent Past
    return { start: event_start_year, end: current_year + 10 };
  } else {
    // Scenario 3: Event in the Future
    return { start: event_start_year, end: event_start_year + 10 };
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 },
      );
    }

    const { id } = await params;

    // Validate event ID
    const idValidation = validateRequest(EventIdSchema, { id });
    if (!idValidation.success) {
      return NextResponse.json(
        createErrorResponse(
          idValidation.error!,
          'VALIDATION_ERROR',
          idValidation.details,
        ),
        { status: 400 },
      );
    }

    // Check if event exists and belongs to user
    const existingEvent = await getEventById(id, session.user.id);
    if (!existingEvent) {
      return NextResponse.json(
        createErrorResponse('Event not found', 'NOT_FOUND'),
        { status: 404 },
      );
    }

    // Check if event is already synced
    const eventIsSynced = await isEventSynced(id);
    if (eventIsSynced) {
      return NextResponse.json(
        createErrorResponse(
          'Event is already synced with Google Calendar',
          'CONFLICT',
        ),
        { status: 409 },
      );
    }

    // Get fresh calendar ID from database (more reliable than session)
    let calendarId = await getCurrentCalendarId(session.user.id);

    if (!calendarId) {
      // Only check/create calendar if we don't have an ID stored
      const calendarCheck = await ensureCalendarExists(
        session.accessToken!,
        session.user.id,
        undefined, // No current ID to check
      );

      if (!calendarCheck.calendarId) {
        return NextResponse.json(
          createErrorResponse(
            `Failed to create calendar: ${calendarCheck.error || 'Unknown error'}`,
            'CALENDAR_ERROR',
          ),
          { status: 500 },
        );
      }

      calendarId = calendarCheck.calendarId;
      console.info(`Created/found Calbrew calendar: ${calendarId}`);
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth2Client.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const syncWindow = calculateSyncWindow(existingEvent.hebrew_year);
    const yearRange = Array.from(
      { length: syncWindow.end - syncWindow.start + 1 },
      (_, i) => syncWindow.start + i,
    );

    // Create Google Calendar events with retry logic
    const createdOccurrences = [];
    for (const year of yearRange) {
      const anniversary = year - existingEvent.hebrew_year;
      const eventTitle =
        anniversary > 0
          ? `(${anniversary}) ${existingEvent.title}`
          : existingEvent.title;

      const gregorianDate = new HDate(
        existingEvent.hebrew_day,
        existingEvent.hebrew_month,
        year,
      ).greg();
      const dateString = `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`;

      const eventData = {
        summary: eventTitle,
        description: existingEvent.description || undefined,
        start: {
          date: dateString,
        },
        end: {
          date: dateString,
        },
        extendedProperties: {
          private: {
            calbrew_event_id: id,
          },
        },
      };

      try {
        const createdEvent = await withGoogleCalendarRetry(async () => {
          return await calendar.events.insert({
            calendarId: calendarId!,
            requestBody: eventData,
          });
        }, `Create event for year ${year} during sync`);

        if (createdEvent.data?.id) {
          createdOccurrences.push({
            id: crypto.randomUUID(),
            event_id: id,
            gregorian_date: dateString,
            google_event_id: createdEvent.data.id!,
          });
        }
      } catch (error: unknown) {
        console.error(
          `Failed to create event for year ${year} during sync:`,
          error,
        );
        // Continue to the next year even if one fails
      }
    }

    // Batch insert event occurrences for better performance
    if (createdOccurrences.length > 0) {
      await createEventOccurrence(createdOccurrences[0]);
      for (let i = 1; i < createdOccurrences.length; i++) {
        await createEventOccurrence(createdOccurrences[i]);
      }
    }

    return NextResponse.json(
      createSuccessResponse(
        {
          synced_occurrences: createdOccurrences.length,
          total_years: yearRange.length,
        },
        'Event synced with Google Calendar successfully',
      ),
      { status: 200 },
    );
  } catch (error) {
    console.error('Sync event error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(error.toApiError(), {
        status:
          error.code === 'AUTH_ERROR'
            ? 401
            : error.code === 'VALIDATION_ERROR'
              ? 400
              : error.code === 'NOT_FOUND'
                ? 404
                : 500,
      });
    }

    return NextResponse.json(
      createErrorResponse('Failed to sync event', 'INTERNAL_ERROR'),
      { status: 500 },
    );
  }
}
