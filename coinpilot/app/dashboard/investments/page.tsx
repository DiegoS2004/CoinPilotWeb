"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

interface Investment {
  id: string
  amount: number
  description: string
  asset: string
  date: string
}

export default function InvestmentsPage() {
  const { user } = useAuth()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState("")
  const [asset, setAsset] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) fetchInvestments()
  }, [user])

  const fetchInvestments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("investments")
      .select("*")
      .eq("user_id", user?.id)
      .order("date", { ascending: false })
    if (!error && data) setInvestments(data)
    setLoading(false)
  }

  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from("investments").insert({
      user_id: user?.id,
      amount,
      description,
      asset,
    })
    if (!error) {
      setAmount(0)
      setDescription("")
      setAsset("")
      fetchInvestments()
    }
    setLoading(false)
  }

  const totalInvestments = investments.reduce((acc, i) => acc + Number(i.amount), 0)

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mis Inversiones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-4">Total: {totalInvestments.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</div>
          <form onSubmit={handleAddInvestment} className="flex flex-col gap-2 mb-6">
            <Label>Monto</Label>
            <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} required />
            <Label>Descripción</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} required />
            <Label>Activo</Label>
            <Input value={asset} onChange={e => setAsset(e.target.value)} placeholder="Ej: Bitcoin, Acciones..." required />
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Agregar Inversión"}</Button>
          </form>
          <div>
            <h3 className="font-semibold mb-2">Movimientos</h3>
            {investments.length === 0 && <div className="text-muted-foreground">No hay inversiones registradas.</div>}
            <ul className="space-y-2">
              {investments.map(i => (
                <li key={i.id} className="border rounded p-2 flex flex-col">
                  <span className="font-medium">{i.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
                  <span className="text-sm">{i.description} ({i.asset})</span>
                  <span className="text-xs text-muted-foreground">{new Date(i.date).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 