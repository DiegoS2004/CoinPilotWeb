"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"

interface CategoryData {
  name: string
  value: number
  color: string
  icon: string
}

interface MonthlyData {
  month: string
  ingresos: number
  gastos: number
  balance: number
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReportsData = async () => {
    if (!user) return

    try {
      // Fetch category spending data
      const { data: transactions } = await supabase
        .from("transactions")
        .select(`
          amount,
          type,
          categories (
            name,
            icon,
            color
          )
        `)
        .eq("user_id", user.id)
        .eq("type", "expense")

      // Process category data
      const categoryMap = new Map<string, { amount: number; icon: string; color: string }>()

      transactions?.forEach((transaction) => {
        const categoryName = transaction.categories?.name || "Sin categoría"
        const icon = transaction.categories?.icon || "📦"
        const color = transaction.categories?.color || "#64748b"

        if (categoryMap.has(categoryName)) {
          categoryMap.get(categoryName)!.amount += Number(transaction.amount)
        } else {
          categoryMap.set(categoryName, { amount: Number(transaction.amount), icon, color })
        }
      })

      const categoryChartData = Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        value: data.amount,
        color: data.color,
        icon: data.icon,
      }))

      setCategoryData(categoryChartData)

      // Fetch monthly data for the last 12 months
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

      const monthlyChartData: MonthlyData[] = []

      for (const month of months) {
        const { data: monthTransactions } = await supabase
          .from("transactions")
          .select("amount, type")
          .eq("user_id", user.id)
          .gte("transaction_date", month.start.toISOString().split("T")[0])
          .lte("transaction_date", month.end.toISOString().split("T")[0])

        let ingresos = 0
        let gastos = 0

        monthTransactions?.forEach((transaction) => {
          if (transaction.type === "income") {
            ingresos += Number(transaction.amount)
          } else {
            gastos += Number(transaction.amount)
          }
        })

        monthlyChartData.push({
          month: month.name,
          ingresos,
          gastos,
          balance: ingresos - gastos,
        })
      }

      setMonthlyData(monthlyChartData)
    } catch (error) {
      console.error("Error fetching reports data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportsData()
  }, [user])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-lg">{data.icon}</span>
            <span className="font-medium">{data.name}</span>
          </div>
          <p className="text-sm text-muted-foreground">{formatCurrency(data.value)}</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex items-center gap-4 p-4 border-b">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold">Reportes</h1>
            <p className="text-muted-foreground">Análisis de tus finanzas</p>
          </div>
        </header>
        <main className="flex-1 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-4 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <SidebarTrigger />
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-muted-foreground">Análisis detallado de tus finanzas personales</p>
        </div>
      </header>

      <main className="flex-1 p-4">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="categories">Categorías</TabsTrigger>
            <TabsTrigger value="trends">Tendencias</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Ingresos vs Gastos (12 meses)</CardTitle>
                  <CardDescription>Comparación mensual de ingresos y gastos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="ingresos" fill="#22c55e" name="Ingresos" />
                        <Bar dataKey="gastos" fill="#ef4444" name="Gastos" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Balance Mensual</CardTitle>
                  <CardDescription>Evolución del balance neto mensual</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="balance" stroke="#8b5cf6" strokeWidth={3} name="Balance" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Gastos por Categoría</CardTitle>
                  <CardDescription>Distribución de gastos por categorías</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ranking de Categorías</CardTitle>
                  <CardDescription>Categorías ordenadas por gasto total</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryData
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 8)
                      .map((category, index) => (
                        <div key={category.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{category.icon}</span>
                              <span className="font-medium">{category.name}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(category.value)}</div>
                            <div className="text-sm text-muted-foreground">
                              {((category.value / categoryData.reduce((sum, cat) => sum + cat.value, 0)) * 100).toFixed(
                                1,
                              )}
                              %
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Tendencias</CardTitle>
                <CardDescription>Patrones y tendencias en tus finanzas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Estadísticas Generales</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span>Promedio mensual de ingresos</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(
                            monthlyData.reduce((sum, month) => sum + month.ingresos, 0) / monthlyData.length,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span>Promedio mensual de gastos</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(
                            monthlyData.reduce((sum, month) => sum + month.gastos, 0) / monthlyData.length,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span>Mejor mes (balance)</span>
                        <span className="font-semibold text-blue-600">
                          {
                            monthlyData.reduce(
                              (best, month) => (month.balance > best.balance ? month : best),
                              monthlyData[0],
                            )?.month
                          }
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span>Categoría con más gastos</span>
                        <span className="font-semibold">
                          {categoryData.length > 0
                            ? categoryData.reduce((max, cat) => (cat.value > max.value ? cat : max), categoryData[0])
                                ?.name
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Recomendaciones</h3>
                    <div className="space-y-3">
                      {monthlyData.length > 0 && (
                        <>
                          {monthlyData[monthlyData.length - 1]?.balance < 0 && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-800">
                                ⚠️ Tu balance del último mes es negativo. Considera revisar tus gastos.
                              </p>
                            </div>
                          )}

                          {categoryData.length > 0 &&
                            categoryData[0]?.value >
                              (monthlyData.reduce((sum, month) => sum + month.ingresos, 0) / monthlyData.length) *
                                0.3 && (
                              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                  💡 Tu categoría de mayor gasto representa más del 30% de tus ingresos promedio.
                                </p>
                              </div>
                            )}

                          {monthlyData.filter((month) => month.balance > 0).length >= monthlyData.length * 0.8 && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-sm text-green-800">
                                ✅ ¡Excelente! Mantienes un balance positivo en la mayoría de los meses.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
