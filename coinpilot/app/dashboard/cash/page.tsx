"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { PlusCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"

interface CashEntry {
    id: string;
    amount: number;
    description: string | null;
    created_at: string;
}

export default function CashPage() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [cashBalance, setCashBalance] = useState(0)
    const [cashEntries, setCashEntries] = useState<CashEntry[]>([])
    const [formData, setFormData] = useState({ amount: "", description: "" })
    const [isAddCashDialogOpen, setIsAddCashDialogOpen] = useState(false)

    useEffect(() => {
        if (user) {
            fetchCashData()
        }
    }, [user])

    const fetchCashData = async () => {
        if (!user) return
        setLoading(true)
        try {
            // Fetch total cash balance
            const { data: cashData, error: cashError } = await supabase
                .from("cash_entries")
                .select("amount")
                .eq("user_id", user.id)

            if (cashError) throw cashError
            const balance = cashData.reduce((sum, entry) => sum + entry.amount, 0)
            
            // Adjust balance based on cash expenses
            const { data: expenseData, error: expenseError } = await supabase
                .from("transactions")
                .select("amount")
                .eq("user_id", user.id)
                .eq("payment_method", "cash")
                .eq("type", "expense")

            if (expenseError) throw expenseError
            const expenses = expenseData.reduce((sum, entry) => sum + entry.amount, 0)

            setCashBalance(balance - expenses)


            // Fetch recent cash entries
            const { data: entriesData, error: entriesError } = await supabase
                .from("cash_entries")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(10)

            if (entriesError) throw entriesError
            setCashEntries(entriesData || [])

        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const handleAddCash = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setLoading(true)
        try {
            const { error } = await supabase.from("cash_entries").insert({
                user_id: user.id,
                amount: Number.parseFloat(formData.amount),
                description: formData.description || null,
            })

            if (error) throw error

            toast({
                title: "Efectivo agregado",
                description: "Se ha añadido el efectivo a tu balance.",
            })

            setFormData({ amount: "", description: "" })
            fetchCashData() // Refresh data
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Gestión de Efectivo</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>Balance de Efectivo</CardTitle>
                </CardHeader>
                <CardContent>
                    <h2 className="text-3xl font-bold">
                        {formatCurrency(cashBalance)}
                    </h2>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Añadir Efectivo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddCash} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="cash-amount">Monto</Label>
                                <Input
                                    id="cash-amount"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cash-description">Descripción (opcional)</Label>
                                <Input
                                    id="cash-description"
                                    placeholder="Ej: Ahorros personales"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Agregar Efectivo
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Registros de Efectivo Recientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p>Cargando...</p>
                        ) : cashEntries.length > 0 ? (
                            <div className="space-y-3">
                                {cashEntries.map((entry) => (
                                    <div key={entry.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{new Date(entry.created_at).toLocaleDateString()}</p>
                                            <p className="text-sm text-gray-500">{entry.description || "Entrada de efectivo"}</p>
                                        </div>
                                        <p className="text-lg font-semibold">
                                            {formatCurrency(entry.amount)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>No hay registros de efectivo.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
} 