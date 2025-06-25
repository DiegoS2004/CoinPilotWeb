"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Bug, RefreshCw, Database, AlertTriangle } from "lucide-react"

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
  updated_at: string
}

export default function ExpenseDebug() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>({})
  const { toast } = useToast()

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error("Error fetching expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const testFunction = async () => {
    if (expenses.length === 0) {
      toast({
        title: "No hay gastos",
        description: "Primero agrega algunos gastos fijos para probar",
        variant: "destructive"
      })
      return
    }

    const testExpense = expenses[0]
    setLoading(true)
    
    try {
      console.log("Probando función con gasto:", testExpense)
      
      const { data, error } = await supabase.rpc('mark_expense_as_paid', {
        expense_id: testExpense.id
      })
      
      if (error) {
        console.error("Error en función:", error)
        setDebugInfo({
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        toast({
          title: "Error en función",
          description: error.message,
          variant: "destructive"
        })
      } else {
        console.log("Función ejecutada exitosamente:", data)
        setDebugInfo({
          success: true,
          message: "Función ejecutada correctamente",
          data
        })
        toast({
          title: "Función exitosa",
          description: "La función se ejecutó correctamente"
        })
        await fetchExpenses()
      }
    } catch (error) {
      console.error("Error completo:", error)
      setDebugInfo({
        error: error instanceof Error ? error.message : "Error desconocido"
      })
    } finally {
      setLoading(false)
    }
  }

  const checkDatabaseStructure = async () => {
    setLoading(true)
    try {
      // Verificar estructura de la tabla
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'expenses')
        .in('column_name', ['last_paid_date', 'is_paid', 'due_date', 'frequency'])

      if (columnsError) throw columnsError

      // Verificar función
      const { data: functions, error: functionsError } = await supabase
        .from('information_schema.routines')
        .select('routine_name, routine_type, data_type')
        .eq('routine_name', 'mark_expense_as_paid')

      if (functionsError) throw functionsError

      setDebugInfo({
        columns: columns || [],
        functions: functions || [],
        timestamp: new Date().toISOString()
      })

      toast({
        title: "Estructura verificada",
        description: `Encontradas ${columns?.length || 0} columnas y ${functions?.length || 0} funciones`
      })
    } catch (error) {
      console.error("Error verificando estructura:", error)
      setDebugInfo({
        error: error instanceof Error ? error.message : "Error desconocido"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Debug de Gastos Fijos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={fetchExpenses} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Cargar Gastos
          </Button>
          <Button onClick={testFunction} disabled={loading || expenses.length === 0} variant="outline">
            <Database className="h-4 w-4 mr-2" />
            Probar Función
          </Button>
          <Button onClick={checkDatabaseStructure} disabled={loading} variant="outline">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Verificar Estructura
          </Button>
        </div>

        {expenses.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Gastos encontrados ({expenses.length}):</h4>
            {expenses.slice(0, 3).map((expense) => (
              <div key={expense.id} className="border rounded p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{expense.name}</span>
                  <Badge variant={expense.is_paid ? "default" : "secondary"}>
                    {expense.is_paid ? "Pagado" : "Pendiente"}
                  </Badge>
                  <Badge variant={expense.is_active ? "default" : "outline"}>
                    {expense.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>ID: {expense.id}</p>
                  <p>Monto: ${expense.amount} | Frecuencia: {expense.frequency}</p>
                  <p>Vence: {new Date(expense.due_date).toLocaleDateString()}</p>
                  {expense.last_paid_date && (
                    <p>Último pago: {new Date(expense.last_paid_date).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {Object.keys(debugInfo).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Información de Debug:</h4>
            <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 