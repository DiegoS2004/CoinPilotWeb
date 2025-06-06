"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Eye, EyeOff, ArrowDownCircle } from "lucide-react"

interface Saving {
  id: string
  amount: number
  description: string
  category: string
  date: string
}

export default function SavingsPage() {
  const { user } = useAuth()
  const [savings, setSavings] = useState<Saving[]>([])
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [loading, setLoading] = useState(false)
  const [showNumbers, setShowNumbers] = useState(true)

  useEffect(() => {
    if (user) fetchSavings()
  }, [user])

  const fetchSavings = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("savings")
      .select("*")
      .eq("user_id", user?.id)
      .order("date", { ascending: false })
    if (!error && data) setSavings(data)
    setLoading(false)
  }

  const handleAddSaving = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from("savings").insert({
      user_id: user?.id,
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

  const handleTransferToBalance = async () => {
    if (!user || totalSavings === 0) return;
    await supabase.from("transactions").insert({
      user_id: user.id,
      amount: totalSavings,
      type: "income",
      description: "Transferencia desde ahorros",
      transaction_date: new Date().toISOString(),
    })
    // Opcional: vaciar los ahorros
    // await supabase.from("savings").delete().eq("user_id", user.id)
    fetchSavings();
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mis Ahorros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="text-2xl font-bold">{showNumbers ? totalSavings.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : "•••••"}</div>
            <Button variant="ghost" size="icon" onClick={() => setShowNumbers(v => !v)}>
              {showNumbers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleTransferToBalance} disabled={totalSavings === 0}>
              <ArrowDownCircle className="h-4 w-4 mr-1" /> Sumar a balance neto
            </Button>
          </div>
          <form onSubmit={handleAddSaving} className="flex flex-col gap-2 mb-6">
            <Label>Monto</Label>
            <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} required />
            <Label>Descripción</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} required />
            <Label>Categoría</Label>
            <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ej: Renta, Fondo de emergencia..." required />
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Agregar Ahorro"}</Button>
          </form>
          <div>
            <h3 className="font-semibold mb-2">Movimientos</h3>
            {savings.length === 0 && <div className="text-muted-foreground">No hay ahorros registrados.</div>}
            <ul className="space-y-2">
              {savings.map(s => (
                <li key={s.id} className="border rounded p-2 flex flex-col">
                  <span className="font-medium">{s.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
                  <span className="text-sm">{s.description} ({s.category})</span>
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