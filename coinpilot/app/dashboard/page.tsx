"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Plus, TrendingUp, TrendingDown, DollarSign, Activity, Eye, EyeOff } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { AddTransactionDialog } from "@/components/add-transaction-dialog"
import { RecentTransactions } from "@/components/recent-transactions"
import { FinancialChart } from "@/components/financial-chart"
import { formatCurrency } from "@/lib/utils"

interface DashboardStats {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  transactionCount: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    transactionCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showNumbers, setShowNumbers] = useState(true)

  const fetchStats = async () => {
    if (!user) return

    try {
      // Get current month's start and end dates
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      // Fetch all transactions for total balance
      const { data: allTransactions } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("user_id", user.id)

      // Fetch current month transactions
      const { data: monthlyTransactions } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("user_id", user.id)
        .gte("transaction_date", startOfMonth.toISOString().split("T")[0])
        .lte("transaction_date", endOfMonth.toISOString().split("T")[0])

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

      setStats({
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        transactionCount: allTransactions?.length || 0,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [user])

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Bienvenido de vuelta, {user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddTransaction(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Transacción
        </Button>
      </header>

      <main className="flex-1 p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Button variant="ghost" size="icon" onClick={() => setShowNumbers(v => !v)}>
                  {showNumbers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.totalBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {showNumbers ? formatCurrency(stats.totalBalance) : "•••••"}
              </div>
              <p className="text-xs text-muted-foreground">Balance actual de todas tus cuentas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{showNumbers ? formatCurrency(stats.monthlyIncome) : "•••••"}</div>
              <p className="text-xs text-muted-foreground">Ingresos de este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{showNumbers ? formatCurrency(stats.monthlyExpenses) : "•••••"}</div>
              <p className="text-xs text-muted-foreground">Gastos de este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.transactionCount}</div>
              <p className="text-xs text-muted-foreground">Total de transacciones</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Recent Transactions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Resumen Financiero</CardTitle>
              <CardDescription>Ingresos vs Gastos de los últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <FinancialChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transacciones Recientes</CardTitle>
              <CardDescription>Tus últimas 5 transacciones</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentTransactions onUpdate={fetchStats} />
            </CardContent>
          </Card>
        </div>
      </main>

      <AddTransactionDialog open={showAddTransaction} onOpenChange={setShowAddTransaction} onSuccess={fetchStats} />
    </div>
  )
}
