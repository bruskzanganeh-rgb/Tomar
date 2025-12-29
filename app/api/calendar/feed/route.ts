import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function formatDateForICS(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}`
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

export async function GET() {
  try {
    const supabase = getSupabaseClient()

    // Fetch all gigs that are not declined or cancelled
    const { data: gigs, error } = await supabase
      .from('gigs')
      .select(`
        id,
        date,
        start_date,
        end_date,
        total_days,
        project_name,
        venue,
        fee,
        status,
        conductor,
        client:clients(name),
        gig_type:gig_types(name),
        gig_works(work:works(title, composer))
      `)
      .not('status', 'in', '(declined,cancelled)')
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching gigs:', error)
      return NextResponse.json({ error: 'Failed to fetch gigs' }, { status: 500 })
    }

    // Build ICS calendar
    const events = (gigs || []).map((gig: any) => {
      const startDate = new Date(gig.date)
      // Default event duration: 3 hours
      const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000)

      // Build summary
      const clientName = gig.client?.name || 'Okänd kund'
      const summary = gig.project_name
        ? `${gig.project_name} (${clientName})`
        : `${gig.gig_type?.name || 'Gig'} (${clientName})`

      // Build description
      const descParts: string[] = []
      descParts.push(`Kund: ${clientName}`)
      descParts.push(`Typ: ${gig.gig_type?.name || '-'}`)
      if (gig.fee) descParts.push(`Arvode: ${gig.fee.toLocaleString('sv-SE')} kr`)
      descParts.push(`Status: ${getStatusLabel(gig.status)}`)
      if (gig.conductor) descParts.push(`Dirigent: ${gig.conductor}`)

      // Add works
      if (gig.gig_works && gig.gig_works.length > 0) {
        descParts.push('')
        descParts.push('Program:')
        gig.gig_works.forEach((gw: any) => {
          if (gw.work) {
            descParts.push(`- ${gw.work.composer}: ${gw.work.title}`)
          }
        })
      }

      const description = escapeICSText(descParts.join('\n'))
      const location = gig.venue ? escapeICSText(gig.venue) : ''

      return `BEGIN:VEVENT
UID:${gig.id}@babalisk.manager
DTSTAMP:${formatDateForICS(new Date())}
DTSTART:${formatDateForICS(startDate)}
DTEND:${formatDateForICS(endDate)}
SUMMARY:${escapeICSText(summary)}
LOCATION:${location}
DESCRIPTION:${description}
STATUS:${gig.status === 'accepted' ? 'CONFIRMED' : 'TENTATIVE'}
END:VEVENT`
    }).join('\n')

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Babalisk Manager//SE
X-WR-CALNAME:Babalisk Gigs
X-WR-TIMEZONE:Europe/Stockholm
CALSCALE:GREGORIAN
METHOD:PUBLISH
${events}
END:VCALENDAR`

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="babalisk-gigs.ics"',
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
