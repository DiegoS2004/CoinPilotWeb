"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Eye, EyeOff, Plus, Trash2, Edit, Calendar, DollarSign, RotateCcw, CheckCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import ExpenseDebug from "@/components/expense-debug"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Expense {
  id: string
  name: string
  amount: number
  category: string
  frequency: string
  due_date: string
  last_paid_date?: string
  is_active: boolean
  is_paid: boolean
  description?: string
  created_at: string
}

const expenseCategories = [
  "Suscripciones",
  "Tarjeta de Crédito",
  "Renta/Hipoteca",
  "Servicios Públicos",
  "Seguros",
  "Préstamos",
  "Otros"
]

const frequencies = [
  { value: "monthly", label: "Mensual" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quincenal" }
]

export default function ExpensesPage() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [showNumbers, setShowNumbers] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const { toast } = useToast()
  
  // Form state
  const [name, setName] = useState("")
  const [amount, setAmount] = useState(0)
  const [category, setCategory] = useState("")
  const [frequency, setFrequency] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (user) {
      autoReactivateExpenses()
      fetchExpenses()
    }
  }, [user])

  // Función automática para reactivar gastos fijos pagados si ya corresponde el siguiente ciclo
  const autoReactivateExpenses = async () => {
    setLoading(true)
    try {
      const { data: paidExpenses, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .eq("is_paid", true)

      if (error) return
      if (!paidExpenses || paidExpenses.length === 0) return

      const today = new Date()
      const updates = paidExpenses.map(expense => {
        const dueDate = new Date(expense.due_date)
        // Si la fecha de vencimiento ya pasó, toca reactivar
        if (today > dueDate) {
          // Calcular nueva fecha de vencimiento según frecuencia
          let nextDueDate = new Date(dueDate)
          switch (expense.frequency) {
            case 'weekly':
              nextDueDate.setDate(dueDate.getDate() + 7)
              break
            case 'biweekly':
              nextDueDate.setDate(dueDate.getDate() + 14)
              break
            case 'monthly':
              nextDueDate.setMonth(dueDate.getMonth() + 1)
              break
            case 'quarterly':
              nextDueDate.setMonth(dueDate.getMonth() + 3)
              break
            case 'yearly':
              nextDueDate.setFullYear(dueDate.getFullYear() + 1)
              break
            default:
              nextDueDate.setMonth(dueDate.getMonth() + 1)
          }
          return supabase
            .from("expenses")
            .update({
              is_paid: false,
              due_date: nextDueDate.toISOString().split('T')[0],
              updated_at: new Date().toISOString()
            })
            .eq("id", expense.id)
        }
        return null
      }).filter(Boolean)
      if (updates.length > 0) {
        await Promise.all(updates)
        await fetchExpenses()
        if (typeof window !== 'undefined' && (window as any).refreshBudgetNetBalance) {
          await (window as any).refreshBudgetNetBalance()
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchExpenses = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user?.id)
      .order("due_date", { ascending: true })
    if (!error && data) setExpenses(data)
    setLoading(false)
  }

  const resetForm = () => {
    setName("")
    setAmount(0)
    setCategory("")
    setFrequency("")
    setDueDate("")
    setDescription("")
    setEditingExpense(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const expenseData = {
      user_id: user?.id,
      name,
      amount,
      category,
      frequency,
      due_date: dueDate,
      description,
      is_active: true
    }

    let error
    if (editingExpense) {
      const { error: updateError } = await supabase
        .from("expenses")
        .update(expenseData)
        .eq("id", editingExpense.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from("expenses")
        .insert(expenseData)
      error = insertError
    }

    if (!error) {
      resetForm()
      setIsDialogOpen(false)
      fetchExpenses()
    }
    setLoading(false)
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setName(expense.name)
    setAmount(expense.amount)
    setCategory(expense.category)
    setFrequency(expense.frequency)
    setDueDate(expense.due_date)
    setDescription(expense.description || "")
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este gasto fijo?")) {
      setLoading(true)
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id)
      if (!error) {
        fetchExpenses()
      }
      setLoading(false)
    }
  }

  const handleToggleActive = async (expense: Expense) => {
    setLoading(true)
    const { error } = await supabase
      .from("expenses")
      .update({ is_active: !expense.is_active })
      .eq("id", expense.id)
    if (!error) {
      fetchExpenses()
    }
    setLoading(false)
  }

  // Nueva función para reiniciar todos los pagos constantes al inicio del mes
  const handleResetAllExpenses = async () => {
    if (confirm("¿Estás seguro de que quieres reiniciar todos los pagos constantes? Esto marcará todos los gastos activos como no pagados.")) {
      setLoading(true)
      try {
        // Obtener todos los gastos activos del usuario
        const { data: activeExpenses, error: fetchError } = await supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user?.id)
          .eq("is_active", true)

        if (fetchError) {
          throw fetchError
        }

        if (!activeExpenses || activeExpenses.length === 0) {
          toast({
            title: "No hay gastos para reiniciar",
            description: "No tienes gastos fijos activos para reiniciar.",
            variant: "destructive"
          })
          return
        }

        // Actualizar todos los gastos activos
        const updatePromises = activeExpenses.map(expense => {
          return supabase
            .from("expenses")
            .update({
              is_paid: false,
              last_paid_date: null,
              updated_at: new Date().toISOString()
            })
            .eq("id", expense.id)
        })

        await Promise.all(updatePromises)

        // Recargar la lista de gastos
        await fetchExpenses()

        // Actualizar el balance del presupuesto si está disponible
        if (typeof window !== 'undefined' && (window as any).refreshBudgetNetBalance) {
          await (window as any).refreshBudgetNetBalance()
        }

        toast({
          title: "Pagos reiniciados",
          description: `Se han reiniciado ${activeExpenses.length} pagos constantes. Todos los gastos están ahora marcados como pendientes.`,
        })

      } catch (error) {
        console.error('Error al reiniciar gastos:', error)
        toast({
          title: "Error",
          description: "No se pudieron reiniciar los pagos constantes. Intenta de nuevo.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const handleMarkAsPaid = async (expense: Expense) => {
    if (confirm(`¿Confirmar pago de ${expense.name} por ${expense.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}?`)) {
      setLoading(true)
      try {
        console.log('Marcando gasto como pagado:', expense.id, expense.name)
        
        // Call the database function to mark as paid and calculate next due date
        const { data, error } = await supabase.rpc('mark_expense_as_paid', {
          expense_id: expense.id
        })
        
        if (error) {
          console.error('Error en la función de base de datos:', error)
          throw error
        }
        
        console.log('Función ejecutada exitosamente, datos retornados:', data)
        
        // Refresh expenses list
        await fetchExpenses()
        
        // Refresh budget net balance if the function is available
        if (typeof window !== 'undefined' && (window as any).refreshBudgetNetBalance) {
          console.log('Actualizando balance del presupuesto...')
          await (window as any).refreshBudgetNetBalance()
        }
        
        toast({
          title: "Pago confirmado",
          description: `Se ha marcado como pagado ${expense.name} por ${expense.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}`,
        })
        
      } catch (error) {
        console.error('Error completo al marcar como pagado:', error)
        
        // Mostrar error más específico
        let errorMessage = 'Error al marcar como pagado'
        if (error instanceof Error) {
          errorMessage = error.message
        } else if (typeof error === 'object' && error !== null) {
          errorMessage = JSON.stringify(error)
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const handleMarkAsPaidAlternative = async (expense: Expense) => {
    if (confirm(`¿Confirmar pago de ${expense.name} por ${expense.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}?`)) {
      setLoading(true)
      try {
        console.log('Marcando gasto como pagado (método alternativo):', expense.id, expense.name)
        
        // Calculate next due date based on frequency
        const currentDueDate = new Date(expense.due_date)
        let nextDueDate = new Date(currentDueDate)
        
        switch (expense.frequency) {
          case 'weekly':
            nextDueDate.setDate(currentDueDate.getDate() + 7)
            break
          case 'biweekly':
            nextDueDate.setDate(currentDueDate.getDate() + 14)
            break
          case 'monthly':
            nextDueDate.setMonth(currentDueDate.getMonth() + 1)
            break
          case 'quarterly':
            nextDueDate.setMonth(currentDueDate.getMonth() + 3)
            break
          case 'yearly':
            nextDueDate.setFullYear(currentDueDate.getFullYear() + 1)
            break
          default:
            nextDueDate.setMonth(currentDueDate.getMonth() + 1)
        }
        
        // Update the expense directly
        const { error } = await supabase
          .from("expenses")
          .update({
            is_paid: true,
            last_paid_date: new Date().toISOString().split('T')[0],
            due_date: nextDueDate.toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq("id", expense.id)
        
        if (error) {
          console.error('Error actualizando gasto:', error)
          throw error
        }
        
        console.log('Gasto actualizado exitosamente')
        
        // Refresh expenses list
        await fetchExpenses()
        
        // Refresh budget net balance if the function is available
        if (typeof window !== 'undefined' && (window as any).refreshBudgetNetBalance) {
          console.log('Actualizando balance del presupuesto...')
          await (window as any).refreshBudgetNetBalance()
        }
        
        toast({
          title: "Pago confirmado",
          description: `Se ha marcado como pagado ${expense.name} por ${expense.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}`,
        })
        
      } catch (error) {
        console.error('Error completo al marcar como pagado (método alternativo):', error)
        
        let errorMessage = 'Error al marcar como pagado'
        if (error instanceof Error) {
          errorMessage = error.message
        } else if (typeof error === 'object' && error !== null) {
          errorMessage = JSON.stringify(error)
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const totalMonthlyExpenses = expenses
    .filter(e => e.is_active && !e.is_paid)
    .reduce((acc, expense) => {
      let monthlyAmount = expense.amount
      switch (expense.frequency) {
        case "weekly":
          monthlyAmount = expense.amount * 4.33
          break
        case "biweekly":
          monthlyAmount = expense.amount * 2.17
          break
        case "quarterly":
          monthlyAmount = expense.amount / 3
          break
        case "yearly":
          monthlyAmount = expense.amount / 12
          break
      }
      return acc + monthlyAmount
    }, 0)

  const totalPaidExpenses = expenses
    .filter(e => e.is_active && e.is_paid)
    .reduce((acc, expense) => {
      let monthlyAmount = expense.amount
      switch (expense.frequency) {
        case "weekly":
          monthlyAmount = expense.amount * 4.33
          break
        case "biweekly":
          monthlyAmount = expense.amount * 2.17
          break
        case "quarterly":
          monthlyAmount = expense.amount / 3
          break
        case "yearly":
          monthlyAmount = expense.amount / 12
          break
      }
      return acc + monthlyAmount
    }, 0)

  // Calcular el total de gastos fijos activos (sin importar si están pagados o no)
  const totalNextCycleExpenses = expenses
    .filter(e => e.is_active)
    .reduce((acc, expense) => {
      let monthlyAmount = expense.amount
      switch (expense.frequency) {
        case "weekly":
          monthlyAmount = expense.amount * 4.33
          break
        case "biweekly":
          monthlyAmount = expense.amount * 2.17
          break
        case "quarterly":
          monthlyAmount = expense.amount / 3
          break
        case "yearly":
          monthlyAmount = expense.amount / 12
          break
      }
      return acc + monthlyAmount
    }, 0)

  // Calcular el balance neto después de apartar (si el usuario tiene un sueldo registrado, aquí puedes restar el totalNextCycleExpenses)
  // Por ahora, solo mostramos el total a apartar y el total pagado

  const getNextDueDate = (expense: Expense) => {
    const dueDate = new Date(expense.due_date)
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return "Vencido"
    } else if (diffDays === 0) {
      return "Vence hoy"
    } else if (diffDays === 1) {
      return "Vence mañana"
    } else {
      return `Vence en ${diffDays} días`
    }
  }

  const getStatusColor = (expense: Expense) => {
    const dueDate = new Date(expense.due_date)
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return "destructive"
    if (diffDays <= 3) return "secondary"
    return "default"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos Fijos</h1>
          <p className="text-muted-foreground">
            Administra tus suscripciones, pagos de tarjeta y otros gastos recurrentes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNumbers(!showNumbers)}
          >
            {showNumbers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetAllExpenses}
            disabled={loading}
            className="text-orange-600 border-orange-600 hover:bg-orange-50"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reiniciar Todos
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagados este ciclo</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {showNumbers ? totalPaidExpenses.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : "•••••"}
            </div>
            <p className="text-xs text-muted-foreground">
              Gastos fijos pagados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes este ciclo</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {showNumbers ? totalMonthlyExpenses.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : "•••••"}
            </div>
            <p className="text-xs text-muted-foreground">
              Gastos fijos pendientes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A apartar para el próximo ciclo</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {showNumbers ? totalNextCycleExpenses.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : "•••••"}
            </div>
            <p className="text-xs text-muted-foreground">
              Total a reservar de tu sueldo para el siguiente ciclo
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gastos Fijos</CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full mb-6">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Gasto Fijo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingExpense ? "Editar Gasto Fijo" : "Nuevo Gasto Fijo"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Netflix, Tarjeta Visa, Renta..."
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="amount">Monto</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="frequency">Frecuencia</Label>
                  <Select value={frequency} onValueChange={setFrequency} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona la frecuencia" />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencies.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dueDate">Próxima fecha de pago</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descripción (opcional)</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Notas adicionales..."
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? "Guardando..." : editingExpense ? "Actualizar" : "Agregar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsDialogOpen(false)
                    resetForm()
                  }}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <div className="space-y-3">
            {expenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay gastos fijos registrados</p>
                <p className="text-sm">Agrega tus suscripciones, pagos de tarjeta y otros gastos recurrentes</p>
              </div>
            ) : (
              expenses.map((expense) => (
                <div key={expense.id} className={`border rounded-lg p-4 mb-2
  ${!expense.is_active ? 'bg-gray-100 text-gray-500 border-gray-200' : ''}
  ${expense.is_paid && expense.is_active ? 'bg-emerald-50 border-emerald-200 text-gray-800' : ''}
  ${!expense.is_paid && expense.is_active ? 'bg-white border-gray-300 text-gray-900' : ''}
`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${!expense.is_active ? 'text-gray-400' : ''} ${expense.is_paid && expense.is_active ? 'text-emerald-700' : ''}`}>{expense.name}</h3>
                        <Badge variant={getStatusColor(expense)} className="text-xs">
                          {getNextDueDate(expense)}
                        </Badge>
                        {expense.is_paid && (
                          <Badge variant="default" className="text-xs bg-emerald-600">
                            Pagado
                          </Badge>
                        )}
                        {!expense.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className={`font-medium ${!expense.is_active ? 'text-gray-400' : ''} ${expense.is_paid && expense.is_active ? 'text-emerald-700' : ''}`}>
                          {showNumbers ? expense.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : "•••••"}
                        </span>
                        <span>{expense.category}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(expense.due_date).toLocaleDateString()}
                          <span className="ml-2 text-xs text-gray-500">(Próxima fecha)</span>
                        </span>
                        {expense.last_paid_date && (
                          <span className="text-emerald-600 text-xs">
                            Último pago: {new Date(expense.last_paid_date).toLocaleDateString()}
                          </span>
                        )}
                        {expense.description && (
                          <span className="italic">"{expense.description}"</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!expense.is_paid && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsPaid(expense)}
                          className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
                        >
                          Marcar como pagado
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(expense)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(expense)}>
                            {expense.is_active ? "Desactivar" : "Activar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(expense.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Debug Component - Solo visible en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <ExpenseDebug />
      )}
    </div>
  )
} 