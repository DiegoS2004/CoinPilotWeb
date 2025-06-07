import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const categoryId = searchParams.get("categoryId")
    const dateFilter = searchParams.get("dateFilter")
    const limit = searchParams.get("limit")

    let query = supabase
      .from("transactions")
      .select(`
        *,
        categories (
          name,
          icon
        )
      `)
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })

    if (type && type !== "all") {
      query = query.eq("type", type)
    }

    if (categoryId && categoryId !== "all") {
      query = query.eq("category_id", categoryId)
    }

    if (dateFilter && dateFilter !== "all") {
      const now = new Date()
      let startDate: Date

      switch (dateFilter) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = new Date(0)
      }

      query = query.gte("transaction_date", startDate.toISOString().split("T")[0])
      }

    if (limit) {
      query = query.limit(Number(limit))
    }

    const { data: transactions, error } = await query

    if (error) throw error

    return NextResponse.json(transactions)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { amount, description, categoryId, type, transactionDate } = body

    const { data: transaction, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        amount: Number(amount),
        description: description || null,
        category_id: categoryId || null,
        type: type.toLowerCase(),
        transaction_date: transactionDate,
      })
      .select(`
        *,
        categories (
          name,
          icon
        )
      `)
      .single()

    if (error) throw error

    return NextResponse.json(transaction)
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
