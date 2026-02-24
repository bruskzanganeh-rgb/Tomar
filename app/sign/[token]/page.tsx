'use client'

import { Suspense } from 'react'
import { SigningForm } from './signing-form'

export default function SignPage() {
  return (
    <Suspense>
      <SigningForm />
    </Suspense>
  )
}
