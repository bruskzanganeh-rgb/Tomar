import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  findDuplicateExpense,
  findDuplicateExpenses,
  type DuplicateExpense,
} from '@/lib/expenses/duplicate-checker'

// POST - Kontrollera om en utgift redan finns (dublett) med fuzzy matching
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { date, supplier, amount } = body

    if (!date || !supplier || amount === undefined) {
      return NextResponse.json(
        { error: 'Date, supplier, and amount are required' },
        { status: 400 }
      )
    }

    // Hämta alla utgifter för samma datum (scoped to user)
    const { data: existingExpenses, error } = await supabase
      .from('expenses')
      .select('id, date, supplier, amount, category')
      .eq('date', date)
      .eq('user_id', user.id)

    if (error) {
      console.error('Duplicate check error:', error)
      return NextResponse.json(
        { error: 'Could not check for duplicate' },
        { status: 500 }
      )
    }

    // Använd fuzzy matching för att hitta dublett
    const result = findDuplicateExpense(
      { date, supplier, amount },
      (existingExpenses || []) as DuplicateExpense[]
    )

    return NextResponse.json({
      isDuplicate: result.isDuplicate,
      existingExpense: result.existingExpense,
      matchType: result.matchType,
    })
  } catch (error) {
    console.error('Check duplicate error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

// Batch-kontroll av flera utgifter med fuzzy matching
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { expenses } = body as { expenses: Array<{ date: string; supplier: string; amount: number }> }

    if (!expenses || !Array.isArray(expenses)) {
      return NextResponse.json(
        { error: 'List of expenses is required' },
        { status: 400 }
      )
    }

    // Hämta alla befintliga utgifter för relevanta datum (scoped to user)
    const uniqueDates = [...new Set(expenses.map(e => e.date))]

    const { data: existingExpenses, error } = await supabase
      .from('expenses')
      .select('id, date, supplier, amount, category')
      .in('date', uniqueDates)
      .eq('user_id', user.id)

    if (error) {
      console.error('Batch duplicate check error:', error)
      return NextResponse.json(
        { error: 'Could not check for duplicates' },
        { status: 500 }
      )
    }

    // Använd fuzzy matching för batch-kontroll
    const results = findDuplicateExpenses(
      expenses,
      (existingExpenses || []) as DuplicateExpense[]
    )

    return NextResponse.json({
      results,
      duplicateCount: results.filter(r => r.isDuplicate).length,
    })
  } catch (error) {
    console.error('Batch check duplicate error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
