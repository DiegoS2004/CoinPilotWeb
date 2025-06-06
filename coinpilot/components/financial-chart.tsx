"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"

interface ChartData {
  month: string
  ingresos: number
  gastos: number
}

export function FinancialChart() {
  const { user } = useAuth()
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChartData = async () => {
    if (!user) return

    try {
      // Get last 6 months of data
      const months = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        months.push({
          start: new Date(date.getFullYear(), date.getMonth(), 1),
          end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
          name: date.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
        })
      }

      const chartData: ChartData[] = []

      for (const month of months) {
        const { data: transactions } = await supabase
          .from("transactions")
          .select("amount, type")
          .eq("user_id", user.id)
          .gte("transaction_date", month.start.toISOString().split("T")[0])
          .lte("transaction_date", month.end.toISOString().split("T")[0])

        let ingresos = 0
        let gastos = 0

        transactions?.forEach((transaction) => {
          if (transaction.type === "income") {
            ingresos += Number(transaction.amount)
          } else {
            gastos += Number(transaction.amount)
          }
        })

        chartData.push({
          month: month.name,
          ingresos,
          gastos,
        })
      }

      setData(chartData)
    } catch (error) {
      console.error("Error fetching chart data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChartData()
  }, [user])

  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando gráfico...</div>
      </div>
    )
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value)]}
          />
          <Legend />
          <Bar dataKey="ingresos" fill="#22c55e" name="Ingresos" />
          <Bar dataKey="gastos" fill="#ef4444" name="Gastos" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
