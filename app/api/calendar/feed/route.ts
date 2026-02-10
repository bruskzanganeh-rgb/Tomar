import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

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

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()

    const userId = request.nextUrl.searchParams.get('user')
    if (!userId) {
      return NextResponse.json({ error: 'User parameter required' }, { status: 400 })
    }

    const { data: userExists } = await supabase.auth.admin.getUserById(userId)
    if (!userExists?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch gigs with their individual dates
    const { data: gigs, error } = await supabase
      .from('gigs')
      .select(`
        id,
        project_name,
        venue,
        fee,
        status,
        notes,
        client:clients(name),
        gig_type:gig_types(name),
        gig_dates(date)
      `)
      .eq('user_id', userId)
      .neq('status', 'declined')
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching gigs:', error)
      return NextResponse.json({ error: 'Failed to fetch gigs' }, { status: 500 })
    }

    const now = new Date()
    const dtstamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}Z`

    // Build ICS events — one all-day event per gig_date
    const events = (gigs || []).flatMap((gig: any) => {
      const clientName = gig.client?.name || 'Okänd kund'
      const summary = gig.project_name
        ? `${gig.project_name} (${clientName})`
        : `${gig.gig_type?.name || 'Gig'} (${clientName})`

      const descParts: string[] = []
      descParts.push(`Kund: ${clientName}`)
      descParts.push(`Typ: ${gig.gig_type?.name || '-'}`)
      if (gig.fee) descParts.push(`Arvode: ${gig.fee.toLocaleString('sv-SE')} kr`)
      descParts.push(`Status: ${getStatusLabel(gig.status)}`)
      if (gig.notes) descParts.push(`\n${gig.notes}`)

      const description = escapeICSText(descParts.join('\n'))
      const location = gig.venue ? escapeICSText(gig.venue) : ''

      const dates: { date: string }[] = gig.gig_dates || []
      if (dates.length === 0) return []

      return dates.map((gd, idx) => {
        const dateFormatted = formatDateOnly(gd.date)
        const endFormatted = formatNextDay(gd.date)

        return `BEGIN:VEVENT
UID:${gig.id}-${idx}@tomar.babalisk.com
DTSTAMP:${dtstamp}
DTSTART;VALUE=DATE:${dateFormatted}
DTEND;VALUE=DATE:${endFormatted}
SUMMARY:${escapeICSText(summary)}
LOCATION:${location}
DESCRIPTION:${description}
STATUS:${gig.status === 'accepted' ? 'CONFIRMED' : 'TENTATIVE'}
END:VEVENT`
      })
    }).join('\n')

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Tomar//SE
X-WR-CALNAME:Tomar Gigs
X-WR-TIMEZONE:Europe/Stockholm
CALSCALE:GREGORIAN
METHOD:PUBLISH
${events}
END:VCALENDAR`

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="tomar-gigs.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Calendar feed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    tentative: 'Ej bekräftat',
    pending: 'Väntar på svar',
    accepted: 'Accepterat',
    declined: 'Avböjt',
    completed: 'Genomfört',
    invoiced: 'Fakturerat',
    paid: 'Betalt',
  }
  return labels[status] || status
}
