import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          icon: string | null
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          icon?: string | null
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          icon?: string | null
          color?: string | null
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          description: string | null
          category_id: string | null
          transaction_date: string
          type: "income" | "expense"
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          description?: string | null
          category_id?: string | null
          transaction_date?: string
          type: "income" | "expense"
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          description?: string | null
          category_id?: string | null
          transaction_date?: string
          type?: "income" | "expense"
          created_at?: string
        }
      }
      stock_investments: {
        Row: {
          id: string
          user_id: string
          symbol: string
          shares: number
          purchase_price: number
          purchase_date: string
          current_price: number | null
          last_updated: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          shares: number
          purchase_price: number
          purchase_date: string
          current_price?: number | null
          last_updated?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          shares?: number
          purchase_price?: number
          purchase_date?: string
          current_price?: number | null
          last_updated?: string | null
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          category: string
          frequency: string
          due_date: string
          last_paid_date: string | null
          is_active: boolean
          is_paid: boolean
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount: number
          category: string
          frequency: string
          due_date: string
          last_paid_date?: string | null
          is_active?: boolean
          is_paid?: boolean
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          category?: string
          frequency?: string
          due_date?: string
          last_paid_date?: string | null
          is_active?: boolean
          is_paid?: boolean
          description?: string | null
          created_at?: string
        }
      }
    }
  }
}
