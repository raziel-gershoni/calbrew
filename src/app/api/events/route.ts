
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
  hebrew_month: string;
  hebrew_day: number;
  recurrence_rule: string;
  last_synced_hebrew_year: number | null;
  created_at: string;
  updated_at: string;
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
  const currentHebrewYear = new HDate().getFullYear()
  const lastSyncedHebrewYear = currentHebrewYear + 10

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

  const yearWindow = Array.from({ length: 21 }, (_, i) => currentHebrewYear - 10 + i)

  for (const year of yearWindow) {
    const gregorianDate = new HDate(hebrew_day, hebrew_month, year).greg()
    const dateString = `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`

    const event = {
      summary: title,
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
          [crypto.randomUUID(), eventId, dateString, createdEvent.data.id],
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
