import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import db from "@/lib/db"
import { google } from "googleapis"

interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  hebrew_year: number;
  hebrew_month: string;
  hebrew_day: number;
  recurrence_rule: string;
  google_calendar_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const event = await new Promise<Event | undefined>((resolve, reject) => {
    db.get("SELECT * FROM events WHERE id = ? AND user_id = ?", [params.id, session.user.id], (err, row: Event) => {
      if (err) {
        reject(err)
      } else {
        resolve(row)
      }
    })
  })

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  if (!event.google_calendar_id) {
    // If there's no google calendar id, we can just delete it from our db
    await new Promise<void>((resolve, reject) => {
      db.run("DELETE FROM events WHERE id = ?", [params.id], (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
    return NextResponse.json({ success: true })
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({ access_token: session.accessToken })

  const calendar = google.calendar({ version: "v3", auth: oauth2Client })

  try {
    await calendar.events.delete({
      calendarId: session.user.calbrew_calendar_id,
      eventId: event.google_calendar_id,
    })

    await new Promise<void>((resolve, reject) => {
      db.run("DELETE FROM events WHERE id = ?", [params.id], (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete event from Google Calendar" }, { status: 500 })
  }
}