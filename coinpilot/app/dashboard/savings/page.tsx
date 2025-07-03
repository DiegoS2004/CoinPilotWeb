"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Eye, EyeOff, ArrowDownCircle, MinusCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

interface Saving {
  id: string
  amount: number
  description: string
  category: string
  date: string
  created_at: string
  source?: string
}

export default function SavingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [savings, setSavings] = useState<Saving[]>([])
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [loading, setLoading] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState(0)
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false)

  const fetchSavings = async () => {
    setLoading(true)
    if (!user) return
    const { data, error } = await supabase
      .from("savings")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
    if (!error && data) setSavings(data as Saving[])
    setLoading(false)
  }

  useEffect(() => {
    if (user) fetchSavings()
  }, [user])

  const handleAddSaving = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    if (!user) return
    const { error } = await supabase.from("savings").insert({
      user_id: user.id,
      amount,
      description,
      category,
      date: new Date().toISOString(),
    })
    if (!error) {
      setAmount(0)
      setDescription("")
      setCategory("")
      fetchSavings()
    }
    setLoading(false)
  }

  const totalSavings = savings.reduce((acc, s) => acc + Number(s.amount), 0)

  const handleWithdraw = async () => {
    if (!user || withdrawAmount <= 0 || withdrawAmount > totalSavings) {
      toast({
        title: "Error",
        description: "La cantidad a retirar debe ser mayor que cero y menor o igual que tus ahorros totales.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // 1. Add to cash entries
      const { error: cashError } = await supabase.from("cash_entries").insert({
        user_id: user.id,
        amount: withdrawAmount,
        description: "Retiro de ahorros",
      })
      if (cashError) throw cashError

      // 2. Add a negative saving entry to keep track
      const { error: savingError } = await supabase.from("savings").insert({
        user_id: user.id,
        amount: -withdrawAmount,
        description: "Retiro a efectivo",
        category: "Retiro",
        date: new Date().toISOString(),
      })
      if (savingError) throw savingError

      toast({
        title: "Retiro exitoso",
        description: "El monto ha sido transferido a tu balance de efectivo.",
      })

      setWithdrawAmount(0)
      setIsWithdrawDialogOpen(false)
      fetchSavings()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Total Ahorrado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <p className="text-4xl font-bold">
              {loading ? "Cargando..." : formatCurrency(totalSavings)}
            </p>
            <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={totalSavings === 0 || loading}>
                  <MinusCircle className="h-4 w-4 mr-1" /> Usar Ahorros
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Usar Ahorros</DialogTitle>
                  <DialogDescription>
                    Transfiere una parte de tus ahorros a tu balance de efectivo.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4">
                  <p className="text-sm text-muted-foreground">
                    Balance de ahorros actual:{" "}
                    <span className="font-semibold">{formatCurrency(totalSavings)}</span>
                  </p>
                  <Label htmlFor="withdraw-amount">Monto a retirar</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    max={totalSavings}
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number.parseFloat(e.target.value))}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsWithdrawDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleWithdraw} disabled={loading || withdrawAmount <= 0 || withdrawAmount > totalSavings}>
                    {loading ? "Transfiriendo..." : "Confirmar Retiro"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Agregar Ahorro</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddSaving} className="flex flex-col gap-3">
              <Label>Monto</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
              <Label>Descripción</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
              <Label>Categoría</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej: Fondo de emergencia..."
                required
              />
              <Button type="submit" disabled={loading} className="mt-2">
                {loading ? "Guardando..." : "Agregar Ahorro"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial de Ahorros</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && savings.length === 0 ? (
                <p>Cargando historial...</p>
            ) : savings.length > 0 ? (
              <ul className="space-y-4">
                {savings.map((s) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{s.description || "Ahorro"} <span className="text-muted-foreground text-sm">({s.category})</span></p>
                      <p className="text-sm text-gray-500">
                        {new Date(s.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`font-medium ${s.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {formatCurrency(s.amount)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted-foreground">No hay ahorros registrados.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 