
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import db from "@/lib/db"
import { google } from "googleapis"
import { HDate } from "@hebcal/core"

interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  hebrew_year: number;
  hebrew_month: number;
  hebrew_day: number;
  recurrence_rule: string;
  last_synced_hebrew_year: number | null;
  created_at: string;
  updated_at: string;
}

function calculateSyncWindow(event_start_year: number): { start: number, end: number } {
  const current_year = new HDate().getFullYear()

  if (event_start_year < current_year - 10) {
    // Scenario 1: Event in the Distant Past
    return { start: current_year - 10, end: current_year + 10 }
  } else if (event_start_year <= current_year) {
    // Scenario 2: Event in the Recent Past
    return { start: event_start_year, end: current_year + 10 }
  } else {
    // Scenario 3: Event in the Future
    return { start: event_start_year, end: event_start_year + 10 }
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const events = await new Promise<Event[]>((resolve, reject) => {
    db.all("SELECT * FROM events WHERE user_id = ?", [session.user.id], (err, rows: Event[]) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })

  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { title, description, hebrew_year, hebrew_month, hebrew_day, recurrence_rule } = await req.json()

  const eventId = crypto.randomUUID()
  const syncWindow = calculateSyncWindow(hebrew_year)
  const lastSyncedHebrewYear = syncWindow.end

  await new Promise<void>((resolve, reject) => {
    db.run(
      "INSERT INTO events (id, user_id, title, description, hebrew_year, hebrew_month, hebrew_day, recurrence_rule, last_synced_hebrew_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [eventId, session.user.id, title, description, hebrew_year, hebrew_month, hebrew_day, recurrence_rule, lastSyncedHebrewYear],
      (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      }
    )
  })

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({ access_token: session.accessToken })

  const calendar = google.calendar({ version: "v3", auth: oauth2Client })

  const yearRange = Array.from({ length: syncWindow.end - syncWindow.start + 1 }, (_, i) => syncWindow.start + i)

  for (const year of yearRange) {
    const anniversary = year - hebrew_year
    const eventTitle = anniversary > 0 ? `(${anniversary}) ${title}` : title

    const gregorianDate = new HDate(hebrew_day, hebrew_month, year).greg()
    const dateString = `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`

    const event = {
      summary: eventTitle,
      description: description,
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
    }

    try {
      const createdEvent = await calendar.events.insert({
        calendarId: session.user.calbrew_calendar_id,
        requestBody: event,
      })

      await new Promise<void>((resolve, reject) => {
        db.run(
          "INSERT INTO event_occurrences (id, event_id, gregorian_date, google_event_id) VALUES (?, ?, ?, ?)",
          [crypto.randomUUID(), eventId, dateString, createdEvent.data.id!],
          (err) => {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          }
        )
      })
    } catch (error) {
      console.error(`Failed to create event for year ${year}:`, error)
      // Continue to the next year even if one fails
    }
  }

  return NextResponse.json({ id: eventId }, { status: 201 })
}
