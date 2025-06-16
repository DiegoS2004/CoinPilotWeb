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
import { formatCurrency, formatMXN } from "@/lib/utils"
import { getUSDtoMXNRate, convertUSDtoMXN } from "@/lib/exchange-rate"

interface DashboardStats {
  totalBalance: number
  totalBalanceWithoutFixedExpenses: number
  monthlyIncome: number
  monthlyExpenses: number
  monthlyFixedExpenses: number
  transactionCount: number
  totalSavings: number
  totalInvestmentsMXN: number
  totalInvestmentsUSD: number
  exchangeRate: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0,
    totalBalanceWithoutFixedExpenses: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    monthlyFixedExpenses: 0,
    transactionCount: 0,
    totalSavings: 0,
    totalInvestmentsMXN: 0,
    totalInvestmentsUSD: 0,
    exchangeRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showNumbers, setShowNumbers] = useState(true)
  const [includeAssets, setIncludeAssets] = useState(false)

  const fetchStats = async () => {
    if (!user) return

    try {
      // Get current month's start and end dates
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      // Get current exchange rate
      const exchangeRate = await getUSDtoMXNRate()

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

      // Fetch savings
      const { data: savings } = await supabase
        .from("savings")
        .select("amount")
        .eq("user_id", user.id)

      // Fetch regular investments (in MXN)
      const { data: investments } = await supabase
        .from("investments")
        .select("amount")
        .eq("user_id", user.id)

      // Fetch stock investments (in USD)
      const { data: stockInvestments } = await supabase
        .from("stock_investments")
        .select("shares, purchase_price, current_price")
        .eq("user_id", user.id)

      // Fetch fixed expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount, frequency")
        .eq("user_id", user.id)
        .eq("is_active", true)

      let totalBalance = 0
      let totalBalanceWithoutFixedExpenses = 0
      let monthlyIncome = 0
      let monthlyExpenses = 0
      let monthlyFixedExpenses = 0
      let totalSavings = 0
      let totalInvestmentsMXN = 0
      let totalInvestmentsUSD = 0

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

      // Calculate monthly fixed expenses
      expenses?.forEach((expense) => {
        let monthlyAmount = Number(expense.amount)
        switch (expense.frequency) {
          case "weekly":
            monthlyAmount = Number(expense.amount) * 4.33
            break
          case "biweekly":
            monthlyAmount = Number(expense.amount) * 2.17
            break
          case "quarterly":
            monthlyAmount = Number(expense.amount) / 3
            break
          case "yearly":
            monthlyAmount = Number(expense.amount) / 12
            break
        }
        monthlyFixedExpenses += monthlyAmount
      })

      // Calculate savings and regular investments totals (in MXN)
      savings?.forEach((saving) => {
        totalSavings += Number(saving.amount)
      })

      investments?.forEach((investment) => {
        totalInvestmentsMXN += Number(investment.amount)
      })

      // Calculate stock investments total (in USD)
      stockInvestments?.forEach((stock) => {
        const currentPrice = stock.current_price || stock.purchase_price
        totalInvestmentsUSD += Number(stock.shares) * Number(currentPrice)
      })

      totalBalanceWithoutFixedExpenses = totalBalance - monthlyFixedExpenses

      setStats({
        totalBalance,
        totalBalanceWithoutFixedExpenses,
        monthlyIncome,
        monthlyExpenses,
        monthlyFixedExpenses,
        transactionCount: allTransactions?.length || 0,
        totalSavings,
        totalInvestmentsMXN,
        totalInvestmentsUSD,
        exchangeRate,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // Refresh stats every minute to update exchange rate
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [user])

  const getDisplayBalance = () => {
    if (!includeAssets) {
      return stats.totalBalance
    }
    
    // Convert USD investments to MXN
    const investmentsUSDinMXN = convertUSDtoMXN(stats.totalInvestmentsUSD, stats.exchangeRate)
    
    // Total balance includes:
    // - Regular balance (MXN)
    // - Savings (MXN)
    // - Regular investments (MXN)
    // - Stock investments (USD converted to MXN)
    return stats.totalBalance + stats.totalSavings + stats.totalInvestmentsMXN + investmentsUSDinMXN
  }

  const getTotalInvestments = () => {
    // Convert USD investments to MXN and add to MXN investments
    const investmentsUSDinMXN = convertUSDtoMXN(stats.totalInvestmentsUSD, stats.exchangeRate)
    return stats.totalInvestmentsMXN + investmentsUSDinMXN
  }

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setIncludeAssets(!includeAssets)}
                >
                  {includeAssets ? "Excluir activos" : "Incluir activos"}
                </Button>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Button variant="ghost" size="icon" onClick={() => setShowNumbers(v => !v)}>
                  {showNumbers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getDisplayBalance() >= 0 ? "text-green-600" : "text-red-600"}`}>
                {showNumbers ? formatMXN(getDisplayBalance()) : "•••••"}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Balance actual de todas tus cuentas</p>
                {includeAssets && (
                  <div className="text-xs space-y-1">
                    <p>Balance: {formatMXN(stats.totalBalance)}</p>
                    <p>Ahorros: {formatMXN(stats.totalSavings)}</p>
                    <p>Inversiones en MXN: {formatMXN(stats.totalInvestmentsMXN)}</p>
                    <p>Inversiones en USD: {formatCurrency(stats.totalInvestmentsUSD)} ({formatMXN(convertUSDtoMXN(stats.totalInvestmentsUSD, stats.exchangeRate))})</p>
                    <p className="text-xs text-muted-foreground">Tipo de cambio: {stats.exchangeRate.toFixed(4)} MXN/USD</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance Neto</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.totalBalanceWithoutFixedExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {showNumbers ? formatMXN(stats.totalBalanceWithoutFixedExpenses) : "•••••"}
              </div>
              <p className="text-xs text-muted-foreground">Balance sin gastos fijos mensuales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ahorros</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {showNumbers ? formatMXN(stats.totalSavings) : "•••••"}
              </div>
              <p className="text-xs text-muted-foreground">Total en ahorros (MXN)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inversiones</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {showNumbers ? formatMXN(getTotalInvestments()) : "•••••"}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Total en inversiones (MXN)</p>
                <p>Inversiones MXN: {formatMXN(stats.totalInvestmentsMXN)}</p>
                <p>Inversiones USD: {formatCurrency(stats.totalInvestmentsUSD)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {showNumbers ? formatMXN(stats.monthlyIncome) : "•••••"}
              </div>
              <p className="text-xs text-muted-foreground">Ingresos de este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {showNumbers ? formatMXN(stats.monthlyExpenses) : "•••••"}
              </div>
              <p className="text-xs text-muted-foreground">Gastos de este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gastos Fijos</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {showNumbers ? formatMXN(stats.monthlyFixedExpenses) : "•••••"}
              </div>
              <p className="text-xs text-muted-foreground">Gastos fijos mensuales</p>
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

        {/* Savings and Investments Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ahorros Recientes</CardTitle>
              <CardDescription>Últimos movimientos en tus ahorros</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.totalSavings > 0 ? (
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                      <span>Total en ahorros</span>
                      <span className="font-semibold text-blue-600">
                        {showNumbers ? formatMXN(stats.totalSavings) : "•••••"}
                      </span>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => window.location.href = "/dashboard/savings"}>
                      Ver detalles de ahorros
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    No tienes ahorros registrados
                    <Button variant="outline" className="w-full mt-2" onClick={() => window.location.href = "/dashboard/savings"}>
                      Agregar ahorros
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inversiones Recientes</CardTitle>
              <CardDescription>Últimos movimientos en tus inversiones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.totalInvestmentsMXN > 0 ? (
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                      <span>Total en inversiones</span>
                      <span className="font-semibold text-purple-600">
                        {showNumbers ? formatMXN(stats.totalInvestmentsMXN) : "•••••"}
                      </span>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => window.location.href = "/dashboard/investments"}>
                      Ver detalles de inversiones
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    No tienes inversiones registradas
                    <Button variant="outline" className="w-full mt-2" onClick={() => window.location.href = "/dashboard/investments"}>
                      Agregar inversiones
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fixed Expenses Section */}
        <div className="grid gap-4 md:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>Gastos Fijos</CardTitle>
              <CardDescription>Resumen de tus gastos fijos mensuales</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.monthlyFixedExpenses > 0 ? (
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                      <span>Total gastos fijos mensuales</span>
                      <span className="font-semibold text-orange-600">
                        {showNumbers ? formatMXN(stats.monthlyFixedExpenses) : "•••••"}
                      </span>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => window.location.href = "/dashboard/expenses"}>
                      Ver detalles de gastos fijos
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    No tienes gastos fijos registrados
                    <Button variant="outline" className="w-full mt-2" onClick={() => window.location.href = "/dashboard/expenses"}>
                      Agregar gastos fijos
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <AddTransactionDialog open={showAddTransaction} onOpenChange={setShowAddTransaction} onSuccess={fetchStats} />
    </div>
  )
}
