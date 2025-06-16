"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Eye, EyeOff, Plus, Trash2, Edit, Calendar, DollarSign } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

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
  
  // Form state
  const [name, setName] = useState("")
  const [amount, setAmount] = useState(0)
  const [category, setCategory] = useState("")
  const [frequency, setFrequency] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (user) fetchExpenses()
  }, [user])

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

  const handleMarkAsPaid = async (expense: Expense) => {
    if (confirm(`¿Confirmar pago de ${expense.name} por ${expense.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}?`)) {
      setLoading(true)
      try {
        // Call the database function to mark as paid and calculate next due date
        const { error } = await supabase.rpc('mark_expense_as_paid', {
          expense_id: expense.id
        })
        
        if (error) throw error
        
        fetchExpenses()
      } catch (error) {
        console.error('Error marking expense as paid:', error)
        alert('Error al marcar como pagado')
      }
      setLoading(false)
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
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gastos Fijos</CardTitle>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-lg font-semibold">
                  {showNumbers ? totalMonthlyExpenses.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : "•••••"}
                  <span className="text-sm text-muted-foreground ml-2">/mes pendientes</span>
                </div>
                {totalPaidExpenses > 0 && (
                  <div className="text-sm text-green-600">
                    {showNumbers ? totalPaidExpenses.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : "•••••"}
                    <span className="text-muted-foreground ml-1">pagados este mes</span>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowNumbers(v => !v)}>
                {showNumbers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
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
                <div key={expense.id} className={`border rounded-lg p-4 ${!expense.is_active ? 'opacity-60' : ''} ${expense.is_paid ? 'bg-green-50 border-green-200' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{expense.name}</h3>
                        <Badge variant={getStatusColor(expense)} className="text-xs">
                          {getNextDueDate(expense)}
                        </Badge>
                        {expense.is_paid && (
                          <Badge variant="default" className="text-xs bg-green-600">
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
                        <span className="font-medium">
                          {showNumbers ? expense.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : "•••••"}
                        </span>
                        <span>{expense.category}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(expense.due_date).toLocaleDateString()}
                        </span>
                        {expense.last_paid_date && (
                          <span className="text-green-600 text-xs">
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
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          Marcar como pagado
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(expense)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(expense)}
                      >
                        {expense.is_active ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 