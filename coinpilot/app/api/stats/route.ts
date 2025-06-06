import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
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
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get current month's start and end dates
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get all transactions for total balance
    const allTransactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      select: { amount: true, type: true },
    })

    // Get current month transactions
    const monthlyTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        transactionDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: { amount: true, type: true },
    })

    let totalBalance = 0
    let monthlyIncome = 0
    let monthlyExpenses = 0

    // Calculate total balance
    allTransactions.forEach((transaction) => {
      const amount = Number.parseFloat(transaction.amount.toString())
      if (transaction.type === "INCOME") {
        totalBalance += amount
      } else {
        totalBalance -= amount
      }
    })

    // Calculate monthly stats
    monthlyTransactions.forEach((transaction) => {
      const amount = Number.parseFloat(transaction.amount.toString())
      if (transaction.type === "INCOME") {
        monthlyIncome += amount
      } else {
        monthlyExpenses += amount
      }
    })

    const stats = {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      transactionCount: allTransactions.length,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
