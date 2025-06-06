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

    // Get current month's start and end dates
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get all transactions for total balance
    const { data: allTransactions, error: allError } = await supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", user.id)

    if (allError) throw allError

    // Get current month transactions
    const { data: monthlyTransactions, error: monthlyError } = await supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", user.id)
      .gte("transaction_date", startOfMonth.toISOString().split("T")[0])
      .lte("transaction_date", endOfMonth.toISOString().split("T")[0])

    if (monthlyError) throw monthlyError

    let totalBalance = 0
    let monthlyIncome = 0
    let monthlyExpenses = 0

    // Calculate total balance
    allTransactions?.forEach((transaction) => {
      if (transaction.type === "income") {
        totalBalance += Number(transaction.amount)
      } else {
        totalBalance -= Number(transaction.amount)
      }
    })

    // Calculate monthly stats
    monthlyTransactions?.forEach((transaction) => {
      if (transaction.type === "income") {
        monthlyIncome += Number(transaction.amount)
      } else {
        monthlyExpenses += Number(transaction.amount)
      }
    })

    return NextResponse.json({
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      transactionCount: allTransactions?.length || 0,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
