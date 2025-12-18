export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          name: string
          org_number: string | null
          client_code: string | null
          address: string | null
          payment_terms: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          org_number?: string | null
          client_code?: string | null
          address?: string | null
          payment_terms?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          org_number?: string | null
          client_code?: string | null
          address?: string | null
          payment_terms?: number
          notes?: string | null
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          client_id: string
          name: string
          email: string | null
          phone: string | null
          role: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          name: string
          email?: string | null
          phone?: string | null
          role?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          role?: string | null
        }
      }
      gig_types: {
        Row: {
          id: string
          name: string
          vat_rate: number
          color: string | null
          default_description: string | null
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          vat_rate: number
          color?: string | null
          default_description?: string | null
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          vat_rate?: number
          color?: string | null
          default_description?: string | null
          is_default?: boolean
        }
      }
      gigs: {
        Row: {
          id: string
          client_id: string
          gig_type_id: string
          date: string
          start_date: string | null
          end_date: string | null
          total_days: number
          venue: string | null
          fee: number | null
          travel_expense: number | null
          project_name: string | null
          status: 'pending' | 'accepted' | 'declined' | 'completed' | 'invoiced' | 'paid'
          response_date: string | null
          notes: string | null
          calendar_event_id: string | null
          email_source: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          gig_type_id: string
          date: string
          start_date?: string | null
          end_date?: string | null
          total_days?: number
          venue?: string | null
          fee?: number | null
          travel_expense?: number | null
          project_name?: string | null
          status?: 'pending' | 'accepted' | 'declined' | 'completed' | 'invoiced' | 'paid'
          response_date?: string | null
          notes?: string | null
          calendar_event_id?: string | null
          email_source?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          gig_type_id?: string
          date?: string
          start_date?: string | null
          end_date?: string | null
          total_days?: number
          venue?: string | null
          fee?: number | null
          travel_expense?: number | null
          project_name?: string | null
          status?: 'pending' | 'accepted' | 'declined' | 'completed' | 'invoiced' | 'paid'
          response_date?: string | null
          notes?: string | null
          calendar_event_id?: string | null
          email_source?: string | null
          updated_at?: string
        }
      }
      gig_dates: {
        Row: {
          id: string
          gig_id: string
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          gig_id: string
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          gig_id?: string
          date?: string
        }
      }
      invoices: {
        Row: {
          id: string
          gig_id: string | null
          client_id: string
          invoice_number: number
          invoice_date: string
          due_date: string
          paid_date: string | null
          subtotal: number
          vat_rate: number
          vat_amount: number
          total: number
          pdf_url: string | null
          sent_date: string | null
          status: 'draft' | 'sent' | 'paid' | 'overdue'
          imported_from_pdf: boolean
          original_pdf_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          gig_id?: string | null
          client_id: string
          invoice_number: number
          invoice_date: string
          due_date: string
          paid_date?: string | null
          subtotal: number
          vat_rate: number
          vat_amount: number
          total: number
          pdf_url?: string | null
          sent_date?: string | null
          status?: 'draft' | 'sent' | 'paid' | 'overdue'
          imported_from_pdf?: boolean
          original_pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          gig_id?: string | null
          client_id?: string
          invoice_number?: number
          invoice_date?: string
          due_date?: string
          paid_date?: string | null
          subtotal?: number
          vat_rate?: number
          vat_amount?: number
          total?: number
          pdf_url?: string | null
          sent_date?: string | null
          status?: 'draft' | 'sent' | 'paid' | 'overdue'
          imported_from_pdf?: boolean
          original_pdf_url?: string | null
          updated_at?: string
        }
      }
      invoice_lines: {
        Row: {
          id: string
          invoice_id: string
          description: string
          amount: number
          is_vat_exempt: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          amount: number
          is_vat_exempt?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          amount?: number
          is_vat_exempt?: boolean
          sort_order?: number
        }
      }
      expenses: {
        Row: {
          id: string
          date: string
          supplier: string
          amount: number
          category: string | null
          gig_id: string | null
          file_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          supplier: string
          amount: number
          category?: string | null
          gig_id?: string | null
          file_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          supplier?: string
          amount?: number
          category?: string | null
          gig_id?: string | null
          file_url?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      company_settings: {
        Row: {
          id: string
          company_name: string
          org_number: string
          address: string
          email: string
          phone: string
          bank_account: string
          logo_url: string | null
          invoice_prefix: string
          next_invoice_number: number
          payment_terms_default: number
          email_inbound_address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          org_number: string
          address: string
          email: string
          phone: string
          bank_account: string
          logo_url?: string | null
          invoice_prefix?: string
          next_invoice_number?: number
          payment_terms_default?: number
          email_inbound_address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          org_number?: string
          address?: string
          email?: string
          phone?: string
          bank_account?: string
          logo_url?: string | null
          invoice_prefix?: string
          next_invoice_number?: number
          payment_terms_default?: number
          email_inbound_address?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      gig_status: 'pending' | 'accepted' | 'declined' | 'completed' | 'invoiced' | 'paid'
      invoice_status: 'draft' | 'sent' | 'paid' | 'overdue'
    }
  }
}
