import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function formatDateOnly(dateStr: string): string {
  // Input: "2026-02-17" → Output: "20260217"
  return dateStr.replace(/-/g, '')
}

function formatNextDay(dateStr: string): string {
  // ICS all-day DTEND is exclusive, so add 1 day
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function formatDateTime(dateStr: string, timeStr: string): string {
  // "2026-03-03" + "10:00" → "20260303T100000"
  return `${dateStr.replace(/-/g, '')}T${timeStr.replace(':', '')}00`
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

// VTIMEZONE for Europe/Stockholm (CET/CEST)
const VTIMEZONE = `BEGIN:VTIMEZONE
TZID:Europe/Stockholm
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10
END:STANDARD
END:VTIMEZONE`

type Session = { start: string; end: string | null; label?: string }

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const userId = request.nextUrl.searchParams.get('user')
    const token = request.nextUrl.searchParams.get('token')
    if (!userId || !token) {
      return NextResponse.json({ error: 'User and token parameters required' }, { status: 400 })
    }

    // Verify token and get locale + calendar preference
    const { data: settings } = await supabase
      .from('company_settings')
      .select('calendar_token, locale, calendar_show_all_members')
      .eq('user_id', userId)
      .single()

    if (!settings || settings.calendar_token !== token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    const locale = settings.locale || 'sv'
    const labels = getLabels(locale)

    // Check company visibility setting
    const { data: membership } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', userId)
      .single()

    let gigQuery = supabase
      .from('gigs')
      .select(`
        id,
        project_name,
        venue,
        fee,
        status,
        notes,
        user_id,
        client:clients(name),
        gig_type:gig_types(name),
        gig_dates(date, sessions)
      `)
      .neq('status', 'declined')
      .order('date', { ascending: true })

    if (membership) {
      const { data: company } = await supabase
        .from('companies')
        .select('gig_visibility')
        .eq('id', membership.company_id)
        .single()

      if (company?.gig_visibility === 'shared' && settings.calendar_show_all_members !== false) {
        // Show all company gigs
        gigQuery = gigQuery.eq('company_id', membership.company_id)
      } else {
        // Show only this user's gigs
        gigQuery = gigQuery.eq('user_id', userId)
      }
    } else {
      gigQuery = gigQuery.eq('user_id', userId)
    }

    const { data: gigs, error } = await gigQuery

    if (error) {
      console.error('Error fetching gigs:', error)
      return NextResponse.json({ error: 'Failed to fetch gigs' }, { status: 500 })
    }

    const now = new Date()
    const dtstamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}Z`

    // Build ICS events
    const events = (gigs || []).flatMap((gig: any) => {
      const clientName = gig.client?.name || labels.unknownClient
      const baseSummary = gig.project_name
        ? `${gig.project_name} (${clientName})`
        : `${gig.gig_type?.name || 'Gig'} (${clientName})`

      const descParts: string[] = []
      descParts.push(`${labels.client}: ${clientName}`)
      descParts.push(`${labels.type}: ${gig.gig_type?.name || '-'}`)
      if (gig.fee) descParts.push(`${labels.fee}: ${gig.fee.toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-US')} kr`)
      descParts.push(`${labels.statusLabel}: ${getStatusLabel(gig.status, locale)}`)
      if (gig.notes) descParts.push(`\n${gig.notes}`)

      const description = escapeICSText(descParts.join('\n'))
      const location = gig.venue ? escapeICSText(gig.venue) : ''
      const icsStatus = gig.status === 'accepted' ? 'CONFIRMED' : 'TENTATIVE'

      const dates: { date: string; sessions: Session[] | null }[] = gig.gig_dates || []
      if (dates.length === 0) return []

      return dates.flatMap((gd, dateIdx) => {
        const sessions: Session[] = Array.isArray(gd.sessions) ? gd.sessions : []

        if (sessions.length > 0) {
          // Emit one VEVENT per session (timed events)
          return sessions.map((session, sessionIdx) => {
            const summary = session.label
              ? `${session.label}: ${baseSummary}`
              : baseSummary

            const dtStart = formatDateTime(gd.date, session.start)

            // If no end time, default to start + 2 hours
            let dtEnd: string
            if (session.end) {
              dtEnd = formatDateTime(gd.date, session.end)
            } else {
              const [h, m] = session.start.split(':').map(Number)
              const endH = String(Math.min(h + 2, 23)).padStart(2, '0')
              dtEnd = formatDateTime(gd.date, `${endH}:${String(m).padStart(2, '0')}`)
            }

            return `BEGIN:VEVENT
UID:${gig.id}-${dateIdx}-${sessionIdx}@amida.babalisk.com
DTSTAMP:${dtstamp}
DTSTART;TZID=Europe/Stockholm:${dtStart}
DTEND;TZID=Europe/Stockholm:${dtEnd}
SUMMARY:${escapeICSText(summary)}
LOCATION:${location}
DESCRIPTION:${description}
STATUS:${icsStatus}
END:VEVENT`
          })
        } else {
          // All-day event (existing behaviour)
          const dateFormatted = formatDateOnly(gd.date)
          const endFormatted = formatNextDay(gd.date)

          return [`BEGIN:VEVENT
UID:${gig.id}-${dateIdx}@amida.babalisk.com
DTSTAMP:${dtstamp}
DTSTART;VALUE=DATE:${dateFormatted}
DTEND;VALUE=DATE:${endFormatted}
SUMMARY:${escapeICSText(baseSummary)}
LOCATION:${location}
DESCRIPTION:${description}
STATUS:${icsStatus}
END:VEVENT`]
        }
      })
    }).join('\n')

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Amida//SE
X-WR-CALNAME:Amida Gigs
X-WR-TIMEZONE:Europe/Stockholm
CALSCALE:GREGORIAN
METHOD:PUBLISH
${VTIMEZONE}
${events}
END:VCALENDAR`

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="amida-gigs.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Calendar feed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getStatusLabel(status: string, locale: string): string {
  const sv: Record<string, string> = {
    tentative: 'Ej bekräftat',
    pending: 'Väntar på svar',
    accepted: 'Accepterat',
    declined: 'Avböjt',
    completed: 'Genomfört',
    invoiced: 'Fakturerat',
    paid: 'Betalt',
  }
  const en: Record<string, string> = {
    tentative: 'Tentative',
    pending: 'Pending response',
    accepted: 'Accepted',
    declined: 'Declined',
    completed: 'Completed',
    invoiced: 'Invoiced',
    paid: 'Paid',
  }
  const labels = locale === 'en' ? en : sv
  return labels[status] || status
}

function getLabels(locale: string) {
  if (locale === 'en') {
    return {
      unknownClient: 'Unknown client',
      client: 'Client',
      type: 'Type',
      fee: 'Fee',
      statusLabel: 'Status',
    }
  }
  return {
    unknownClient: 'Okänd kund',
    client: 'Kund',
    type: 'Typ',
    fee: 'Arvode',
    statusLabel: 'Status',
  }
}
