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
        const { data: transactions, error } = await supabase
          .from("transactions")
          .select("amount, type")
          .eq("user_id", user.id)
          .gte("transaction_date", month.start.toISOString().split("T")[0])
          .lte("transaction_date", month.end.toISOString().split("T")[0])

        if (error) throw error

        let ingresos = 0
        let gastos = 0

        transactions?.forEach((transaction) => {
          if (transaction.type === "income") {
            ingresos += Number(transaction.amount)
          } else {
            gastos += Number(transaction.amount)
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
