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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "monthly"

    if (type === "categories") {
      // Get category spending data
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          type: "EXPENSE",
        },
        include: {
          category: true,
        },
      })

      const categoryMap = new Map<string, { amount: number; icon: string; color: string }>()

      transactions.forEach((transaction) => {
        const categoryName = transaction.category?.name || "Sin categoría"
        const icon = transaction.category?.icon || "📦"
        const color = transaction.category?.color || "#64748b"
        const amount = Number.parseFloat(transaction.amount.toString())

        if (categoryMap.has(categoryName)) {
          categoryMap.get(categoryName)!.amount += amount
        } else {
          categoryMap.set(categoryName, { amount, icon, color })
        }
      })

      const categoryData = Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        value: data.amount,
        color: data.color,
        icon: data.icon,
      }))

      return NextResponse.json(categoryData)
    }

    if (type === "monthly") {
      // Get monthly data for the last 12 months
      const months = []
      for (let i = 11; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        months.push({
          start: new Date(date.getFullYear(), date.getMonth(), 1),
          end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
          name: date.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
        })
      }

      const monthlyData = []

      for (const month of months) {
        const transactions = await prisma.transaction.findMany({
          where: {
            userId: user.id,
            transactionDate: {
              gte: month.start,
              lte: month.end,
            },
          },
          select: { amount: true, type: true },
        })

        let ingresos = 0
        let gastos = 0

        transactions.forEach((transaction) => {
          const amount = Number.parseFloat(transaction.amount.toString())
          if (transaction.type === "INCOME") {
            ingresos += amount
          } else {
            gastos += amount
          }
        })

        monthlyData.push({
          month: month.name,
          ingresos,
          gastos,
          balance: ingresos - gastos,
        })
      }

      return NextResponse.json(monthlyData)
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
  } catch (error) {
    console.error("Error fetching reports:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
