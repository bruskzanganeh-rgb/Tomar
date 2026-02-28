import { redirect } from 'next/navigation'

export default function ConfigPage() {
  redirect('/finance?tab=gig-types')
}
