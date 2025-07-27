
import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { google } from "googleapis"
import db from "@/lib/db"

if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error("Missing GOOGLE_CLIENT_ID environment variable")
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Missing GOOGLE_CLIENT_SECRET environment variable")
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account?.access_token) {
        return false
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      )

      oauth2Client.setCredentials({ access_token: account.access_token })

      const calendar = google.calendar({ version: "v3", auth: oauth2Client })

      const { data: calendars } = await calendar.calendarList.list()
      let calbrewCalendar = calendars.items.find(c => c.summary === "Calbrew")

      if (!calbrewCalendar) {
        const { data: newCalendar } = await calendar.calendars.insert({
          requestBody: {
            summary: "Calbrew",
          },
        })
        calbrewCalendar = newCalendar
      }

      const userInDb = await new Promise<any>((resolve, reject) => {
        db.get("SELECT * FROM users WHERE id = ?", [user.id], (err, row) => {
          if (err) reject(err)
          resolve(row)
        })
      })

      if (!userInDb) {
        await new Promise<void>((resolve, reject) => {
          db.run(
            "INSERT INTO users (id, name, email, image, calbrew_calendar_id) VALUES (?, ?, ?, ?, ?)",
            [user.id, user.name, user.email, user.image, calbrewCalendar.id],
            (err) => {
              if (err) reject(err)
              resolve()
            }
          )
        })
      } else {
        await new Promise<void>((resolve, reject) => {
          db.run("UPDATE users SET calbrew_calendar_id = ? WHERE id = ?", [calbrewCalendar.id, user.id], (err) => {
            if (err) reject(err)
            resolve()
          })
        })
      }

      return true
    },
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        token.id = user.id

        const userFromDb = await new Promise<{ calbrew_calendar_id: string } | undefined>((resolve, reject) => {
          db.get("SELECT calbrew_calendar_id FROM users WHERE id = ?", [user.id], (err, row: { calbrew_calendar_id: string }) => {
            if (err) {
              reject(err)
            } else {
              resolve(row)
            }
          })
        })
        token.calbrew_calendar_id = userFromDb?.calbrew_calendar_id
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.user.id = token.id as string
      session.user.calbrew_calendar_id = token.calbrew_calendar_id as string
      return session
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
