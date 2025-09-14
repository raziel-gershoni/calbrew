import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';
import { HDate } from '@hebcal/core';
import {
  ensureCalendarExists,
  checkCalendarExists,
} from '@/lib/google-calendar';
import {
  UpdateEventSchema,
  EventIdSchema,
  createSuccessResponse,
  createErrorResponse,
  validateRequest,
} from '@/lib/validation';
import {
  getCurrentCalendarId,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventOccurrencesByEventId,
  deleteEventOccurrencesByEventId,
  isEventSynced,
} from '@/lib/postgres-utils';
import { withGoogleCalendarRetry, AppError } from '@/lib/retry';

// Keeping for potential future use
// interface EventOccurrence {
//   id: string;
//   event_id: string;
//   gregorian_date: string;
//   google_event_id: string;
// }

export async function PUT(
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

    // Parse and validate request body
    const requestBody = await req.json();
    const validation = validateRequest(UpdateEventSchema, {
      ...requestBody,
      id,
    });

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

    // Check if event exists and belongs to user
    const existingEvent = await getEventById(id, session.user.id);
    if (!existingEvent) {
      return NextResponse.json(
        createErrorResponse('Event not found', 'NOT_FOUND'),
        { status: 404 },
      );
    }

    // Update event in database
    await updateEvent({
      id,
      user_id: session.user.id,
      title,
      description: description || null,
      hebrew_year,
      hebrew_month,
      hebrew_day,
      recurrence_rule,
    });

    // Check if event is synced with Google Calendar
    const eventIsSynced = await isEventSynced(id);

    if (!eventIsSynced) {
      // Event is not synced, return success without Google Calendar operations
      return NextResponse.json(
        createSuccessResponse(undefined, 'Event updated successfully'),
      );
    }

    const occurrences = await getEventOccurrencesByEventId(id);

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

    // Update Google Calendar events with retry logic
    for (const occurrence of occurrences) {
      const anniversary =
        new HDate(new Date(occurrence.gregorian_date)).getFullYear() -
        hebrew_year;
      const eventTitle = anniversary > 0 ? `(${anniversary}) ${title}` : title;

      try {
        await withGoogleCalendarRetry(async () => {
          return await calendar.events.patch({
            calendarId: calendarId!,
            eventId: occurrence.google_event_id,
            requestBody: {
              summary: eventTitle,
              description: description || undefined,
            },
          });
        }, `Update event occurrence ${occurrence.google_event_id}`);
      } catch (error: unknown) {
        // Define interface for Google Calendar API errors
        interface GoogleApiError {
          response?: {
            status?: number;
          };
        }

        // If calendar not found (404), try to create/find a new calendar and retry
        if ((error as GoogleApiError)?.response?.status === 404) {
          console.warn(
            `Calendar ${calendarId} not found, attempting to create/find new calendar for update`,
          );

          try {
            const calendarCheck = await ensureCalendarExists(
              session.accessToken!,
              session.user.id,
              undefined, // Force search/create
            );

            if (calendarCheck.calendarId) {
              calendarId = calendarCheck.calendarId;
              console.info(`Using new calendar for update: ${calendarId}`);

              // Retry the update with new calendar ID
              await withGoogleCalendarRetry(async () => {
                return await calendar.events.patch({
                  calendarId: calendarId!,
                  eventId: occurrence.google_event_id,
                  requestBody: {
                    summary: eventTitle,
                    description: description || undefined,
                  },
                });
              }, `Retry update event occurrence ${occurrence.google_event_id} with new calendar`);
            } else {
              console.error(
                `Failed to update event occurrence ${occurrence.google_event_id}: Could not create/find calendar`,
              );
            }
          } catch (retryError) {
            console.error(
              `Failed to update event occurrence ${occurrence.google_event_id} even after calendar retry:`,
              retryError,
            );
          }
        } else {
          console.error(
            `Failed to update event occurrence ${occurrence.google_event_id}:`,
            error,
          );
        }
        // Continue with other occurrences even if one fails
      }
    }

    return NextResponse.json(
      createSuccessResponse(undefined, 'Event updated successfully'),
    );
  } catch (error) {
    console.error('Update event error:', error);

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
      createErrorResponse('Failed to update event', 'INTERNAL_ERROR'),
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    const occurrences = await getEventOccurrencesByEventId(id);

    if (occurrences.length === 0) {
      // If there are no occurrences, just delete the master event
      await deleteEvent(id, session.user.id);
      return NextResponse.json(
        createSuccessResponse(undefined, 'Event deleted successfully'),
      );
    }

    // Get the current calendar ID from database
    const currentCalendarId = await getCurrentCalendarId(session.user.id);

    if (!currentCalendarId) {
      console.warn(
        'No calendar ID found for user. Proceeding with local deletion only.',
      );

      // Delete locally only
      await deleteEventOccurrencesByEventId(id);
      await deleteEvent(id, session.user.id);

      return NextResponse.json(
        createSuccessResponse(
          {
            warning:
              'No calendar information found. Event deleted locally only.',
          },
          'Event deleted locally',
        ),
      );
    }

    // Check if calendar exists before trying to delete events
    const calendarExists = await checkCalendarExists(
      session.accessToken!,
      currentCalendarId,
    );

    if (!calendarExists) {
      console.warn(
        `Calendar ${currentCalendarId} not found. Proceeding with local deletion only.`,
      );

      // Delete locally only
      await deleteEventOccurrencesByEventId(id);
      await deleteEvent(id, session.user.id);

      return NextResponse.json(
        createSuccessResponse(
          {
            warning:
              'Calendar not found in Google Calendar. Event deleted locally only.',
          },
          'Event deleted locally',
        ),
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth2Client.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Delete Google Calendar events with retry logic
    for (const occurrence of occurrences) {
      try {
        await withGoogleCalendarRetry(async () => {
          return await calendar.events.delete({
            calendarId: currentCalendarId,
            eventId: occurrence.google_event_id,
          });
        }, `Delete event occurrence ${occurrence.google_event_id}`);
      } catch (error) {
        console.error(
          `Failed to delete event occurrence ${occurrence.google_event_id}:`,
          error,
        );
        // Continue with other occurrences even if one fails
      }
    }

    // Delete from database
    await deleteEventOccurrencesByEventId(id);
    await deleteEvent(id, session.user.id);

    return NextResponse.json(
      createSuccessResponse(undefined, 'Event deleted successfully'),
    );
  } catch (error) {
    console.error('Delete event error:', error);

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
      createErrorResponse('Failed to delete event', 'INTERNAL_ERROR'),
      { status: 500 },
    );
  }
}
