"use client"

import { Suspense } from 'react'
import { ExpensesPageContent } from './expenses-page-content'

export default function ExpensesPage() {
  return (
    <Suspense>
      <ExpensesPageContent />
    </Suspense>
  )
}
