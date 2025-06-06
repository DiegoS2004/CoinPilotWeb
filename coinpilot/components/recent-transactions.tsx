"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

interface Transaction {
  id: string
  amount: number
  description: string | null
  type: "income" | "expense"
  transaction_date: string
  categories: {
    name: string
    icon: string | null
  } | null
}

interface RecentTransactionsProps {
  onUpdate: () => void
}

export function RecentTransactions({ onUpdate }: RecentTransactionsProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTransactions = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          amount,
          description,
          type,
          transaction_date,
          categories (
            name,
            icon
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Transacción eliminada",
        description: "La transacción se ha eliminado correctamente.",
      })

      fetchTransactions()
      onUpdate()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [user])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
            <div className="space-y-1">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No hay transacciones recientes</p>
        <p className="text-sm">Agrega tu primera transacción para comenzar</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="text-lg">
              {transaction.categories?.icon || (transaction.type === "income" ? "💰" : "💸")}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {transaction.description || transaction.categories?.name || "Sin descripción"}
                </span>
                <Badge variant={transaction.type === "income" ? "default" : "secondary"}>
                  {transaction.type === "income" ? "Ingreso" : "Gasto"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{formatDate(transaction.transaction_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}>
              {transaction.type === "income" ? "+" : "-"}
              {formatCurrency(transaction.amount)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteTransaction(transaction.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
