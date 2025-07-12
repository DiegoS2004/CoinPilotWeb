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
    type: 'in' | 'out';
}

export default function CashPage() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [cashBalance, setCashBalance] = useState(0)
    const [cashEntries, setCashEntries] = useState<CashEntry[]>([])
    const [formData, setFormData] = useState({ amount: "", description: "", type: "in" })
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
            // Fetch ALL cash entries for balance
            const { data: allEntries, error: allEntriesError } = await supabase
                .from("cash_entries")
                .select("*")
                .eq("user_id", user.id)

            if (allEntriesError) throw allEntriesError
            const balance = allEntries.reduce((sum, entry) => sum + (entry.type === 'in' ? entry.amount : -entry.amount), 0)

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

            // Fetch recent cash entries (last 10 for display)
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
                type: formData.type,
            })

            if (error) throw error

            toast({
                title: formData.type === 'in' ? "Efectivo ingresado" : "Efectivo retirado",
                description: formData.type === 'in' ? "Se ha añadido efectivo a tu balance." : "Se ha retirado efectivo de tu balance.",
            })

            setFormData({ amount: "", description: "", type: "in" })
            fetchCashData() // Refresh data
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteEntry = async (id: string) => {
        if (!user) return
        setLoading(true)
        try {
            const { error } = await supabase.from("cash_entries").delete().eq("id", id)
            if (error) throw error
            toast({ title: "Registro eliminado" })
            fetchCashData()
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
                        <CardTitle>Añadir/Retirar Efectivo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddCash} className="space-y-4">
                            <div className="flex gap-2">
                                <Button type="button" variant={formData.type === 'in' ? 'default' : 'outline'} onClick={() => setFormData(f => ({ ...f, type: 'in' }))}>
                                    + Ingreso
                                </Button>
                                <Button type="button" variant={formData.type === 'out' ? 'destructive' : 'outline'} onClick={() => setFormData(f => ({ ...f, type: 'out' }))}>
                                    - Retiro
                                </Button>
                            </div>
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
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {formData.type === 'in' ? 'Agregar Efectivo' : 'Retirar Efectivo'}
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
                                            <p className="text-sm text-gray-500">{entry.description || (entry.type === 'in' ? 'Ingreso de efectivo' : 'Retiro de efectivo')}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-lg font-semibold ${entry.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                                {entry.type === 'in' ? '+' : '-'}{formatCurrency(Math.abs(entry.amount))}
                                            </p>
                                            <Button size="icon" variant="ghost" onClick={() => handleDeleteEntry(entry.id)} title="Eliminar">
                                                🗑️
                                            </Button>
                                        </div>
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