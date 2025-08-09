import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';
import { HDate } from '@hebcal/core';
import { ensureCalendarExists } from '@/lib/google-calendar';
import {
  CreateEventSchema,
  createSuccessResponse,
  createErrorResponse,
  validateRequest,
} from '@/lib/validation';
import {
  getEventsByUserId,
  getCurrentCalendarId,
  createEvent as dbCreateEvent,
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 },
      );
    }

    const events = await getEventsByUserId(session.user.id);
    return NextResponse.json(createSuccessResponse(events));
  } catch (error) {
    console.error('Get events error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(error.toApiError(), {
        status: error.code === 'AUTH_ERROR' ? 401 : 500,
      });
    }

    return NextResponse.json(
      createErrorResponse('Failed to get events', 'INTERNAL_ERROR'),
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 },
      );
    }

    // Parse and validate request body
    const requestBody = await req.json();
    const validation = validateRequest(CreateEventSchema, requestBody);

    if (!validation.success) {
      return NextResponse.json(
        createErrorResponse(
          validation.error!,
          'VALIDATION_ERROR',
          validation.details,
        ),
        { status: 400 },
      );
    }

    const validatedData = validation.data;
    if (!validatedData) {
      return NextResponse.json(
        createErrorResponse('No validated data available', 'VALIDATION_ERROR'),
        { status: 400 },
      );
    }

    const {
      title,
      description,
      hebrew_year,
      hebrew_month,
      hebrew_day,
      recurrence_rule,
    } = validatedData;

    const eventId = crypto.randomUUID();
    const syncWindow = calculateSyncWindow(hebrew_year);
    const lastSyncedHebrewYear = syncWindow.end;

    // Create event in database with retry logic
    await dbCreateEvent({
      id: eventId,
      user_id: session.user.id,
      title,
      description: description || null,
      hebrew_year,
      hebrew_month,
      hebrew_day,
      recurrence_rule,
      last_synced_hebrew_year: lastSyncedHebrewYear,
    });

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

    const yearRange = Array.from(
      { length: syncWindow.end - syncWindow.start + 1 },
      (_, i) => syncWindow.start + i,
    );

    // Create Google Calendar events with retry logic
    const createdOccurrences = [];
    for (const year of yearRange) {
      const anniversary = year - hebrew_year;
      const eventTitle = anniversary > 0 ? `(${anniversary}) ${title}` : title;

      const gregorianDate = new HDate(hebrew_day, hebrew_month, year).greg();
      const dateString = `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`;

      const eventData = {
        summary: eventTitle,
        description: description || undefined,
        start: {
          date: dateString,
        },
        end: {
          date: dateString,
        },
        extendedProperties: {
          private: {
            calbrew_event_id: eventId,
          },
        },
      };

      try {
        const createdEvent = await withGoogleCalendarRetry(async () => {
          return await calendar.events.insert({
            calendarId: calendarId!,
            requestBody: eventData,
          });
        }, `Create event for year ${year}`);

        if (createdEvent.data?.id) {
          createdOccurrences.push({
            id: crypto.randomUUID(),
            event_id: eventId,
            gregorian_date: dateString,
            google_event_id: createdEvent.data.id!,
          });
        }
      } catch (error: unknown) {
        // Define interface for Google Calendar API errors
        interface GoogleApiError {
          response?: {
            status?: number;
          };
        }

        // If calendar not found (404), try to create/find a new calendar and retry
        if (
          (error as GoogleApiError)?.response?.status === 404 &&
          year === yearRange[0]
        ) {
          console.warn(
            `Calendar ${calendarId} not found, attempting to create/find new calendar`,
          );

          try {
            const calendarCheck = await ensureCalendarExists(
              session.accessToken!,
              session.user.id,
              undefined, // Force search/create
            );

            if (calendarCheck.calendarId) {
              calendarId = calendarCheck.calendarId;
              console.info(`Using new calendar: ${calendarId}`);

              // Retry the event creation with new calendar ID
              const createdEvent = await withGoogleCalendarRetry(async () => {
                return await calendar.events.insert({
                  calendarId: calendarId!,
                  requestBody: eventData,
                });
              }, `Retry create event for year ${year} with new calendar`);

              if (createdEvent.data?.id) {
                createdOccurrences.push({
                  id: crypto.randomUUID(),
                  event_id: eventId,
                  gregorian_date: dateString,
                  google_event_id: createdEvent.data.id!,
                });
              }
            } else {
              console.error(
                `Failed to create event for year ${year}: Could not create/find calendar`,
              );
            }
          } catch (retryError) {
            console.error(
              `Failed to create event for year ${year} even after calendar retry:`,
              retryError,
            );
          }
        } else {
          console.error(`Failed to create event for year ${year}:`, error);
        }
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
      createSuccessResponse({ id: eventId }, 'Event created successfully'),
      { status: 201 },
    );
  } catch (error) {
    console.error('Create event error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(error.toApiError(), {
        status:
          error.code === 'AUTH_ERROR'
            ? 401
            : error.code === 'VALIDATION_ERROR'
              ? 400
              : 500,
      });
    }

    return NextResponse.json(
      createErrorResponse('Failed to create event', 'INTERNAL_ERROR'),
      { status: 500 },
    );
  }
}
