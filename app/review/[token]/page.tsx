'use client'

import { Suspense } from 'react'
import { ReviewForm } from './review-form'

export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewForm />
    </Suspense>
  )
}
