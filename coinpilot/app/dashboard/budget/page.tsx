"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Eye, EyeOff, DollarSign, TrendingUp, TrendingDown, PieChart as PieChartIcon, Calendar } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Calendar as UiCalendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"

interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
}

interface BudgetPlan {
  id: string
  name: string
  description: string
  allocations: { [key: string]: number }
}

interface BudgetAllocation {
  categoryId: string
  categoryName: string
  icon: string
  color: string
  percentage: number
  amount: number
  spent: number
  remaining: number
}

const budgetPlans: BudgetPlan[] = [
  {
    id: "50-30-20",
    name: "Regla 50-30-20",
    description: "50% necesidades, 30% deseos, 20% ahorro",
    allocations: {
      "Necesidades": 50,
      "Deseos": 30,
      "Ahorro": 20
    }
  },
  {
    id: "60-20-20",
    name: "Regla 60-20-20",
    description: "60% necesidades, 20% deseos, 20% ahorro",
    allocations: {
      "Necesidades": 60,
      "Deseos": 20,
      "Ahorro": 20
    }
  },
  {
    id: "70-20-10",
    name: "Regla 70-20-10",
    description: "70% necesidades, 20% deseos, 10% ahorro",
    allocations: {
      "Necesidades": 70,
      "Deseos": 20,
      "Ahorro": 10
    }
  },
  {
    id: "80-10-10",
    name: "Regla 80-10-10",
    description: "80% necesidades, 10% deseos, 10% ahorro",
    allocations: {
      "Necesidades": 80,
      "Deseos": 10,
      "Ahorro": 10
    }
  }
]

export default function BudgetPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [budgetAllocations, setBudgetAllocations] = useState<BudgetAllocation[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string>("")
  const [netBalance, setNetBalance] = useState(0)
  const [showNumbers, setShowNumbers] = useState(true)
  const [loading, setLoading] = useState(true)
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [nextPaymentDate, setNextPaymentDate] = useState<Date | null>(null)
  const [customNextPaymentDate, setCustomNextPaymentDate] = useState<Date | null>(null)
  const [savedNextPaymentDate, setSavedNextPaymentDate] = useState<Date | null>(null)
  const [dailyBudget, setDailyBudget] = useState<{ [key: string]: number }>({})
  const [weeklyBudget, setWeeklyBudget] = useState<{ [key: string]: number }>({})
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      fetchCategories()
      fetchNetBalance()
      fetchNextPaymentDate()
    }
  }, [user])

  useEffect(() => {
    if (categories.length > 0 && netBalance > 0) {
      if (selectedPlan && !isCustomMode) {
        applyBudgetPlan(selectedPlan)
      } else if (isCustomMode) {
        initializeCustomAllocations()
      }
    }
  }, [categories, netBalance, selectedPlan, isCustomMode])

  useEffect(() => {
    if (budgetAllocations.length > 0 && (customNextPaymentDate || nextPaymentDate)) {
      calculateDailyAndWeeklyBudgets()
    }
  }, [budgetAllocations, nextPaymentDate, customNextPaymentDate])

  useEffect(() => {
    const saved = localStorage.getItem("coinpilot_next_payment_date")
    if (saved) {
      const date = new Date(saved)
      if (date > new Date()) setSavedNextPaymentDate(date)
    }
  }, [])

  const handleSaveNextPaymentDate = () => {
    if (customNextPaymentDate && customNextPaymentDate > new Date()) {
      setSavedNextPaymentDate(customNextPaymentDate)
      localStorage.setItem("coinpilot_next_payment_date", customNextPaymentDate.toISOString())
      toast({ title: "Fecha guardada", description: "La fecha de tu siguiente nómina ha sido guardada." })
    } else {
      toast({ title: "Fecha inválida", description: "Selecciona una fecha futura para guardar.", variant: "destructive" })
    }
  }

  useEffect(() => {
    if (savedNextPaymentDate) {
      setCustomNextPaymentDate(savedNextPaymentDate)
    }
  }, [savedNextPaymentDate])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name")
      
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchNetBalance = async () => {
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

      // Fetch fixed expenses (only unpaid ones)
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount, frequency")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .eq("is_paid", false)

      let totalBalance = 0
      let monthlyFixedExpenses = 0

      // Calculate total balance
      allTransactions?.forEach((transaction) => {
        if (transaction.type === "income") {
          totalBalance += Number(transaction.amount)
        } else {
          totalBalance -= Number(transaction.amount)
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

      const netBalanceValue = totalBalance - monthlyFixedExpenses
      setNetBalance(netBalanceValue)
    } catch (error) {
      console.error("Error fetching net balance:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNextPaymentDate = async () => {
    if (!user) return

    try {
      // Fetch the next payment date from fixed expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("due_date")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .eq("is_paid", false)
        .order("due_date", { ascending: true })
        .limit(1)

      if (expenses && expenses.length > 0) {
        setNextPaymentDate(new Date(expenses[0].due_date))
      } else {
        // If no fixed expenses, use end of current month
        const now = new Date()
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        setNextPaymentDate(endOfMonth)
      }
    } catch (error) {
      console.error("Error fetching next payment date:", error)
      // Fallback to end of current month
      const now = new Date()
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setNextPaymentDate(endOfMonth)
    }
  }

  const calculateDailyAndWeeklyBudgets = () => {
    const paymentDate = customNextPaymentDate || nextPaymentDate
    if (!paymentDate || budgetAllocations.length === 0) return

    const today = new Date()
    const daysUntilNextPayment = Math.max(1, Math.ceil((paymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    const weeksUntilNextPayment = Math.max(1, Math.ceil(daysUntilNextPayment / 7))

    const dailyBudgets: { [key: string]: number } = {}
    const weeklyBudgets: { [key: string]: number } = {}

    budgetAllocations.forEach((allocation) => {
      const dailyAmount = allocation.amount / daysUntilNextPayment
      const weeklyAmount = allocation.amount / weeksUntilNextPayment

      dailyBudgets[allocation.categoryName] = dailyAmount
      weeklyBudgets[allocation.categoryName] = weeklyAmount
    })

    setDailyBudget(dailyBudgets)
    setWeeklyBudget(weeklyBudgets)
  }

  const applyBudgetPlan = (planId: string) => {
    const plan = budgetPlans.find(p => p.id === planId)
    if (!plan) return

    // Group categories into the plan's main categories
    const groupedAllocations: BudgetAllocation[] = []
    
    Object.entries(plan.allocations).forEach(([groupName, percentage]) => {
      const amount = (netBalance * percentage) / 100
      
      groupedAllocations.push({
        categoryId: groupName,
        categoryName: groupName,
        icon: groupName === "Necesidades" ? "🏠" : groupName === "Deseos" ? "🎯" : "💰",
        color: groupName === "Necesidades" ? "#ef4444" : groupName === "Deseos" ? "#f59e0b" : "#10b981",
        percentage,
        amount,
        spent: 0,
        remaining: amount
      })
    })

    setBudgetAllocations(groupedAllocations)
  }

  const initializeCustomAllocations = () => {
    const equalPercentage = 100 / categories.length
    const allocations: BudgetAllocation[] = categories.map(category => ({
      categoryId: category.id,
      categoryName: category.name,
      icon: category.icon || "📦",
      color: category.color || "#64748b",
      percentage: equalPercentage,
      amount: (netBalance * equalPercentage) / 100,
      spent: 0,
      remaining: (netBalance * equalPercentage) / 100
    }))

    setBudgetAllocations(allocations)
  }

  const updateAllocation = (categoryId: string, newPercentage: number) => {
    setBudgetAllocations(prev => 
      prev.map(allocation => 
        allocation.categoryId === categoryId 
          ? {
              ...allocation,
              percentage: newPercentage,
              amount: (netBalance * newPercentage) / 100,
              remaining: (netBalance * newPercentage) / 100
            }
          : allocation
      )
    )
  }

  const getChartData = () => {
    return budgetAllocations.map(allocation => ({
      name: allocation.categoryName,
      value: allocation.amount,
      color: allocation.color,
      icon: allocation.icon
    }))
  }

  const totalAllocated = budgetAllocations.reduce((sum, allocation) => sum + allocation.percentage, 0)
  const isOverAllocated = totalAllocated > 100
  const isUnderAllocated = totalAllocated < 100

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{data.icon}</span>
            <span className="font-medium">{data.name}</span>
          </div>
          <p className="text-sm">Monto: {formatCurrency(data.value)}</p>
          <p className="text-sm text-muted-foreground">
            {((data.value / netBalance) * 100).toFixed(1)}% del presupuesto
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Presupuesto</h1>
          <p className="text-muted-foreground">Planifica y distribuye tu dinero por categorías</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowNumbers(v => !v)}>
          {showNumbers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      {/* Net Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Balance Neto Disponible
          </CardTitle>
          <CardDescription>
            Tu balance total sin gastos fijos mensuales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`text-4xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {showNumbers ? formatCurrency(netBalance) : "•••••"}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Este es el dinero disponible para distribuir en tu presupuesto
          </p>
        </CardContent>
      </Card>

      {/* Budget Plan Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Plan de Presupuesto</CardTitle>
          <CardDescription>
            Selecciona un plan predefinido o crea uno personalizado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecciona un plan" />
              </SelectTrigger>
              <SelectContent>
                {budgetPlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    <div>
                      <div className="font-medium">{plan.name}</div>
                      <div className="text-sm text-muted-foreground">{plan.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant={isCustomMode ? "default" : "outline"}
              onClick={() => {
                setIsCustomMode(!isCustomMode)
                setSelectedPlan("")
              }}
            >
              {isCustomMode ? "Plan Personalizado" : "Personalizar"}
            </Button>
          </div>

          {selectedPlan && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">
                {budgetPlans.find(p => p.id === selectedPlan)?.name}
              </h4>
              <p className="text-sm text-muted-foreground">
                {budgetPlans.find(p => p.id === selectedPlan)?.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Allocations */}
      {budgetAllocations.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Distribución del Presupuesto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Allocations List */}
          <Card>
            <CardHeader>
              <CardTitle>Asignaciones por Categoría</CardTitle>
              <CardDescription>
                {isOverAllocated && (
                  <span className="text-red-600">⚠️ Presupuesto sobreasignado ({totalAllocated.toFixed(1)}%)</span>
                )}
                {isUnderAllocated && (
                  <span className="text-orange-600">⚠️ Presupuesto subasignado ({totalAllocated.toFixed(1)}%)</span>
                )}
                {!isOverAllocated && !isUnderAllocated && (
                  <span className="text-green-600">✅ Presupuesto perfectamente asignado</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budgetAllocations.map((allocation) => (
                  <div key={allocation.categoryId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{allocation.icon}</span>
                        <span className="font-medium">{allocation.categoryName}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {showNumbers ? formatCurrency(allocation.amount) : "•••••"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {allocation.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    
                    {isCustomMode && (
                      <div className="space-y-2">
                        <Slider
                          value={[allocation.percentage]}
                          onValueChange={([value]) => updateAllocation(allocation.categoryId, value)}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all"
                          style={{ 
                            width: `${allocation.percentage}%`,
                            backgroundColor: allocation.color || "#64748b"
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary */}
      {budgetAllocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen del Presupuesto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {showNumbers ? formatCurrency(netBalance) : "•••••"}
                </div>
                <div className="text-sm text-muted-foreground">Total Disponible</div>
              </div>
              
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className={`text-2xl font-bold ${isOverAllocated ? 'text-red-600' : 'text-blue-600'}`}>
                  {showNumbers ? formatCurrency(netBalance * totalAllocated / 100) : "•••••"}
                </div>
                <div className="text-sm text-muted-foreground">Total Asignado ({totalAllocated.toFixed(1)}%)</div>
              </div>
              
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {showNumbers ? formatCurrency(netBalance * (100 - totalAllocated) / 100) : "•••••"}
                </div>
                <div className="text-sm text-muted-foreground">Sin Asignar</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Payment and Daily/Weekly Budgets */}
      {budgetAllocations.length > 0 && (customNextPaymentDate || nextPaymentDate) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Next Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Próximo Pago
              </CardTitle>
              <CardDescription>
                Selecciona la fecha de tu siguiente nómina o pago para ajustar tu presupuesto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">Próxima fecha de pago</div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="mt-2">
                          {customNextPaymentDate
                            ? format(customNextPaymentDate, "PPP", { locale: es })
                            : nextPaymentDate
                              ? format(nextPaymentDate, "PPP", { locale: es })
                              : "Selecciona una fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <UiCalendar
                          mode="single"
                          selected={(customNextPaymentDate || nextPaymentDate) ?? undefined}
                          onSelect={(date) => {
                            if (date && date > new Date()) {
                              setCustomNextPaymentDate(date)
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Button
                      className="mt-2 ml-2"
                      variant="default"
                      onClick={handleSaveNextPaymentDate}
                      disabled={Boolean(!customNextPaymentDate || (savedNextPaymentDate && customNextPaymentDate.getTime() === customNextPaymentDate.getTime()))}
                    >
                      Guardar selección
                    </Button>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {(() => {
                        const paymentDate = customNextPaymentDate || nextPaymentDate
                        if (!paymentDate) return "-"
                        const days = Math.ceil((paymentDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                        return days > 0 ? days : 1
                      })()}
                    </div>
                    <div className="text-sm text-muted-foreground">días restantes</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Tu presupuesto se calcula hasta esta fecha. Después de este pago, podrás ajustar tu presupuesto nuevamente.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Budget Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Presupuesto Diario
              </CardTitle>
              <CardDescription>
                Cuánto puedes gastar por día en cada categoría
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {budgetAllocations.slice(0, 3).map((allocation) => (
                  <div key={allocation.categoryId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{allocation.icon}</span>
                      <span className="font-medium">{allocation.categoryName}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {showNumbers ? formatCurrency(dailyBudget[allocation.categoryName] || 0) : "•••••"}
                      </div>
                      <div className="text-xs text-muted-foreground">por día</div>
                    </div>
                  </div>
                ))}
                {budgetAllocations.length > 3 && (
                  <div className="text-center text-sm text-muted-foreground">
                    +{budgetAllocations.length - 3} categorías más
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Daily and Weekly Budgets */}
      {budgetAllocations.length > 0 && (customNextPaymentDate || nextPaymentDate) && (
        <Card>
          <CardHeader>
            <CardTitle>Presupuesto Detallado por Período</CardTitle>
            <CardDescription>
              Desglose completo de cuánto puedes gastar por día y por semana
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgetAllocations.map((allocation) => (
                <div key={allocation.categoryId} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{allocation.icon}</span>
                    <h3 className="font-semibold">{allocation.categoryName}</h3>
                    <Badge variant="outline" className="ml-auto">
                      {allocation.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">Total Disponible</div>
                      <div className="text-lg font-bold text-blue-600">
                        {showNumbers ? formatCurrency(allocation.amount) : "•••••"}
                      </div>
                    </div>
                    
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">Por Día</div>
                      <div className="text-lg font-bold text-green-600">
                        {showNumbers ? formatCurrency(dailyBudget[allocation.categoryName] || 0) : "•••••"}
                      </div>
                    </div>
                    
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">Por Semana</div>
                      <div className="text-lg font-bold text-purple-600">
                        {showNumbers ? formatCurrency(weeklyBudget[allocation.categoryName] || 0) : "•••••"}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-muted-foreground">
                    <p>
                      <strong>Consejo:</strong> Intenta no exceder el presupuesto diario de {formatCurrency(dailyBudget[allocation.categoryName] || 0)} 
                      para mantenerte dentro de tu plan financiero.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 