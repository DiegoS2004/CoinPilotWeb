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

interface Saving {
  id: string
  amount: number
  description: string
  category: string
  date: string
}

export default function SavingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [savings, setSavings] = useState<Saving[]>([])
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [loading, setLoading] = useState(false)
  const [showNumbers, setShowNumbers] = useState(true)
  const [withdrawAmount, setWithdrawAmount] = useState(0)
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false)

  useEffect(() => {
    if (user) fetchSavings()
  }, [user])

  const fetchSavings = async () => {
    setLoading(true)
    if (!user) return
    const { data, error } = await supabase
      .from("savings")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
    if (!error && data) setSavings(data)
    setLoading(false)
  }

  const handleAddSaving = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    if (!user) return
    const { error } = await supabase.from("savings").insert({
      user_id: user.id,
      amount,
      description,
      category,
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
          <CardTitle>Mis Ahorros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="text-2xl font-bold">
              {showNumbers
                ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(totalSavings)
                : "•••••"}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowNumbers((v) => !v)}>
              {showNumbers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={totalSavings === 0}>
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
                <div className="space-y-2">
                  <Label htmlFor="withdraw-amount">Monto a retirar</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    max={totalSavings}
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number.parseFloat(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground">
                    Balance de ahorros actual:{" "}
                    {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(totalSavings)}
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsWithdrawDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleWithdraw} disabled={loading}>
                    {loading ? "Transfiriendo..." : "Confirmar Retiro"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <form onSubmit={handleAddSaving} className="flex flex-col gap-2 mb-6">
            <Label>Monto</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
            <Label>Descripción</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
            <Label>Categoría</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej: Renta, Fondo de emergencia..."
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Agregar Ahorro"}
            </Button>
          </form>
          <div>
            <h3 className="font-semibold mb-2">Movimientos</h3>
            {savings.length === 0 && <div className="text-muted-foreground">No hay ahorros registrados.</div>}
            <ul className="space-y-2">
              {savings.map((s) => (
                <li key={s.id} className="border rounded p-2 flex flex-col">
                  <span className={`font-medium ${s.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(s.amount)}
                  </span>
                  <span className="text-sm">
                    {s.description} ({s.category})
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(s.date).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 