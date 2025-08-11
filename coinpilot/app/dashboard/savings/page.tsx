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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface Saving {
  id: string
  amount: number
  description: string
  category: string
  date: string
  created_at: string
  source?: string
}

interface SavingBucket {
  id: string
  user_id: string
  name: string
  institution: string | null
  annual_interest_rate: number | null // porcentaje, ej. 10 = 10%
  compounding: "monthly" | "daily" | null
  last_accrual_date: string | null
  created_at: string
}

export default function SavingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [savings, setSavings] = useState<Saving[]>([])
  const [buckets, setBuckets] = useState<SavingBucket[]>([])
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [loading, setLoading] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState(0)
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false)
  const [selectedWithdrawBucket, setSelectedWithdrawBucket] = useState<string>("")
  const [isBucketDialogOpen, setIsBucketDialogOpen] = useState(false)
  const [editingBucket, setEditingBucket] = useState<SavingBucket | null>(null)
  const [bucketName, setBucketName] = useState("")
  const [bucketInstitution, setBucketInstitution] = useState("")
  const [bucketRate, setBucketRate] = useState<string>("") // porcentaje en texto
  const [bucketCompounding, setBucketCompounding] = useState<"monthly" | "daily" | "">("")
  const [ignoredNames, setIgnoredNames] = useState<string[]>([])

  // Preload desde cache local para primer render rápido
  useEffect(() => {
    if (!user) return
    try {
      const cs = localStorage.getItem(`cp_savings_${user.id}`)
      if (cs) setSavings(JSON.parse(cs))
      const cb = localStorage.getItem(`cp_saving_buckets_${user.id}`)
      if (cb) setBuckets(JSON.parse(cb))
      const ci = localStorage.getItem(`cp_ignored_buckets_${user.id}`)
      if (ci) setIgnoredNames(JSON.parse(ci))
    } catch {}
  }, [user])

  // Realtime para refrescar al instante
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`savings_live_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings', filter: `user_id=eq.${user.id}` }, () => {
        fetchSavings()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saving_buckets', filter: `user_id=eq.${user.id}` }, () => {
        fetchBuckets()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ignored_bucket_names', filter: `user_id=eq.${user.id}` }, () => {
        fetchIgnored()
      })
      .subscribe()

    return () => {
      try { supabase.removeChannel(channel) } catch {}
    }
  }, [user])
  

  const fetchSavings = async () => {
    setLoading(true)
    if (!user) return
    const { data, error } = await supabase
      .from("savings")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
    if (!error && data) {
      setSavings(data as Saving[])
      try { localStorage.setItem(`cp_savings_${user.id}`, JSON.stringify(data)) } catch {}
    }
    setLoading(false)
  }

  useEffect(() => {
    if (user) {
      fetchSavings()
      fetchBuckets()
      fetchIgnored()
    }
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

  // Aggregate balances by bucket (category)
  const bucketBalances = savings.reduce<Record<string, number>>((acc, s) => {
    const key = s.category || "Sin categoría"
    acc[key] = (acc[key] || 0) + Number(s.amount)
    return acc
  }, {})
  const existingBuckets = Object.keys(bucketBalances)

  const unionBucketNames = Array.from(new Set([
    ...existingBuckets,
    ...buckets.map((b) => b.name),
  ])).filter((name) => !ignoredNames.includes(name) || !!buckets.find((b) => b.name === name))

  const fetchBuckets = async () => {
    if (!user) return
    const { data, error } = await supabase
      .from("saving_buckets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
    if (!error && data) {
      setBuckets(data as SavingBucket[])
      try { localStorage.setItem(`cp_saving_buckets_${user.id}`, JSON.stringify(data)) } catch {}
    }
  }

  const fetchIgnored = async () => {
    if (!user) return
    const { data, error } = await supabase
      .from("ignored_bucket_names")
      .select("name")
      .eq("user_id", user.id)
    if (!error && data) {
      const names = (data as { name: string }[]).map((r) => r.name)
      setIgnoredNames(names)
      try { localStorage.setItem(`cp_ignored_buckets_${user.id}`, JSON.stringify(names)) } catch {}
    }
  }

  const resetBucketForm = () => {
    setEditingBucket(null)
    setBucketName("")
    setBucketInstitution("")
    setBucketRate("")
    setBucketCompounding("")
  }

  const openCreateBucket = () => {
    resetBucketForm()
    setIsBucketDialogOpen(true)
  }

  const openEditBucket = (bucket: SavingBucket) => {
    setEditingBucket(bucket)
    setBucketName(bucket.name)
    setBucketInstitution(bucket.institution || "")
    setBucketRate(bucket.annual_interest_rate != null ? String(bucket.annual_interest_rate) : "")
    setBucketCompounding(bucket.compounding || "")
    setIsBucketDialogOpen(true)
  }

  const handleSaveBucket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!bucketName) {
      toast({ title: "Nombre requerido", variant: "destructive" })
      return
    }
    const rateNum = bucketRate ? Number(bucketRate) : null
    if (rateNum != null && (isNaN(rateNum) || rateNum < 0)) {
      toast({ title: "Tasa inválida", description: "Usa un número positivo", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      if (editingBucket) {
        const { error } = await supabase
          .from("saving_buckets")
          .update({
            name: bucketName,
            institution: bucketInstitution || null,
            annual_interest_rate: rateNum,
            compounding: bucketCompounding || null,
          })
          .eq("id", editingBucket.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("saving_buckets")
          .insert({
            user_id: user.id,
            name: bucketName,
            institution: bucketInstitution || null,
            annual_interest_rate: rateNum,
            compounding: bucketCompounding || null,
            last_accrual_date: new Date().toISOString().split("T")[0],
          })
        if (error) throw error
      }
      await fetchBuckets()
      setIsBucketDialogOpen(false)
      resetBucketForm()
    } catch (error: any) {
      toast({ title: "Error guardando cajita", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const daysBetween = (fromISO?: string | null, to = new Date()) => {
    if (!fromISO) return 0
    const from = new Date(fromISO)
    const diffMs = to.getTime() - from.getTime()
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  }

  const handleApplyInterest = async (bucket: SavingBucket) => {
    if (!user) return
    const balance = bucketBalances[bucket.name] || 0
    if (balance <= 0) {
      toast({ title: "Sin saldo", description: "No hay saldo para calcular intereses." })
      return
    }

    const r = (bucket.annual_interest_rate || 0) / 100
    if (!r) {
      toast({ title: "Tasa no configurada", description: "Define una tasa anual primero.", variant: "destructive" })
      return
    }

    let interest = 0
    if (bucket.compounding === "daily") {
      const n = Math.max(1, daysBetween(bucket.last_accrual_date))
      const dailyRate = r / 365
      interest = balance * (Math.pow(1 + dailyRate, n) - 1)
    } else {
      // monthly by default
      const n = 1
      const monthlyRate = r / 12
      interest = balance * monthlyRate * n
    }
    if (interest <= 0) {
      toast({ title: "Interés calculado cero" })
      return
    }

    setLoading(true)
    try {
      const { error: sErr } = await supabase.from("savings").insert({
        user_id: user.id,
        amount: Number(interest.toFixed(2)),
        description: "Interés generado",
        category: bucket.name,
        date: new Date().toISOString(),
      })
      if (sErr) throw sErr

      const todayISO = new Date().toISOString().split("T")[0]
      const { error: bErr } = await supabase
        .from("saving_buckets")
        .update({ last_accrual_date: todayISO })
        .eq("id", bucket.id)
      if (bErr) throw bErr

      toast({ title: "Intereses aplicados", description: `Se añadieron ${formatCurrency(Number(interest.toFixed(2)))}` })
      await fetchSavings()
      await fetchBuckets()
    } catch (error: any) {
      toast({ title: "Error aplicando intereses", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBucket = async (bucket: SavingBucket) => {
    if (!user) return
    const confirmed = typeof window !== 'undefined' ? window.confirm(`¿Eliminar la cajita "${bucket.name}"? No se borrarán tus movimientos, solo la configuración.`) : true
    if (!confirmed) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from("saving_buckets")
        .delete()
        .eq("id", bucket.id)
      if (error) throw error
      // Registrar nombre ignorado para que no reaparezca como "sin configuración"
      await supabase.from("ignored_bucket_names").insert({ user_id: user.id, name: bucket.name })
      toast({ title: "Cajita eliminada" })
      await Promise.all([fetchBuckets(), fetchIgnored()])
    } catch (error: any) {
      toast({ title: "Error eliminando cajita", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!user) return
    if (!selectedWithdrawBucket) {
      toast({ title: "Selecciona una cajita", description: "Debes elegir de qué cajita retirar.", variant: "destructive" })
      return
    }
    const bucketBalance = bucketBalances[selectedWithdrawBucket] || 0
    if (withdrawAmount <= 0 || withdrawAmount > bucketBalance) {
      toast({
        title: "Saldo insuficiente",
        description: `La cantidad debe ser mayor que cero y menor o igual al saldo de la cajita (${formatCurrency(bucketBalance)}).`,
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
        description: `Retiro desde ahorros: ${selectedWithdrawBucket}`,
      })
      if (cashError) throw cashError

      // 2. Register a negative saving entry in the selected bucket
      const { error: savingError } = await supabase.from("savings").insert({
        user_id: user.id,
        amount: -withdrawAmount,
        description: "Retiro a efectivo",
        category: selectedWithdrawBucket,
        date: new Date().toISOString(),
      })
      if (savingError) throw savingError

      toast({
        title: "Retiro exitoso",
        description: `Transferido a efectivo desde "${selectedWithdrawBucket}"`,
      })

      setWithdrawAmount(0)
      setSelectedWithdrawBucket("")
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
            <Dialog open={isWithdrawDialogOpen} onOpenChange={(open) => { setIsWithdrawDialogOpen(open); if (!open) { setSelectedWithdrawBucket(""); setWithdrawAmount(0) } }}>
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
                  <Label htmlFor="withdraw-bucket">Cajita</Label>
                  <Select value={selectedWithdrawBucket} onValueChange={setSelectedWithdrawBucket}>
                    <SelectTrigger id="withdraw-bucket">
                      <SelectValue placeholder="Selecciona una cajita" />
                    </SelectTrigger>
                    <SelectContent>
                      {unionBucketNames.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b} ({formatCurrency(bucketBalances[b] || 0)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedWithdrawBucket && (
                    <p className="text-xs text-muted-foreground">
                      Saldo de "{selectedWithdrawBucket}": {formatCurrency(bucketBalances[selectedWithdrawBucket] || 0)}
                    </p>
                  )}
                  <Label htmlFor="withdraw-amount">Monto a retirar</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    max={selectedWithdrawBucket ? bucketBalances[selectedWithdrawBucket] || 0 : totalSavings}
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number.parseFloat(e.target.value))}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsWithdrawDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleWithdraw} disabled={loading || !selectedWithdrawBucket || withdrawAmount <= 0 || withdrawAmount > (bucketBalances[selectedWithdrawBucket] || 0)}>
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
              <Label>Cajita</Label>
              {unionBucketNames.length > 0 ? (
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una cajita o escribe una nueva abajo" />
                  </SelectTrigger>
                  <SelectContent>
                    {unionBucketNames.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b} ({formatCurrency(bucketBalances[b] || 0)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={existingBuckets.length > 0 ? "O escribe un nombre para crear una nueva cajita" : "Ej: Fondo de emergencia, Renta, Carro..."}
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
            <CardTitle>Cajitas de Ahorro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Configura tus cajitas: institución, tasa y capitalización</p>
                <Button size="sm" variant="outline" onClick={openCreateBucket}>Nueva cajita</Button>
              </div>
              {buckets.length === 0 && (
                <div className="text-muted-foreground">Aún no has configurado cajitas. Puedes crearlas o se mostrarán automáticamente con movimientos.</div>
              )}
              {buckets.map((b) => {
                const balance = bucketBalances[b.name] || 0
                return (
                  <div key={b.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border rounded-md p-4 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{b.name}</p>
                        {b.institution && <Badge variant="secondary">{b.institution}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Tasa anual: {b.annual_interest_rate != null ? `${b.annual_interest_rate}%` : "—"} · Capitalización: {b.compounding || "—"}
                        {b.last_accrual_date && ` · Últ. devengo: ${new Date(b.last_accrual_date).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <div className={`font-semibold ${balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(balance)}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => openEditBucket(b)}>Editar</Button>
                      <Button size="sm" onClick={() => handleApplyInterest(b)} disabled={loading || balance <= 0}>Aplicar intereses</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteBucket(b)} disabled={loading}>Eliminar</Button>
                    </div>
                  </div>
                )
              })}

              {/* Buckets without metadata but with balance */}
              {Object.entries(bucketBalances)
                .filter(([name, balance]) => !buckets.find((b) => b.name === name) && (balance || 0) > 0 && !ignoredNames.includes(name))
                .map(([name, balance]) => (
                  <div key={name} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border rounded-md p-4 gap-3">
                    <div>
                      <p className="font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">Sin configuración</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <div className={`font-semibold ${balance < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(balance)}</div>
                      <Button size="sm" variant="outline" onClick={() => openCreateBucket()}>Configurar</Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog crear/editar bucket */}
      <Dialog open={isBucketDialogOpen} onOpenChange={(o) => { setIsBucketDialogOpen(o); if (!o) resetBucketForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBucket ? "Editar cajita" : "Nueva cajita"}</DialogTitle>
            <DialogDescription>Define nombre, institución y tasa anual</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveBucket} className="space-y-3">
            <div>
              <Label>Nombre</Label>
              <Input value={bucketName} onChange={(e) => setBucketName(e.target.value)} required placeholder="Ej: Renta, Carro, Emergencia" />
            </div>
            <div>
              <Label>Institución (opcional)</Label>
              <Input value={bucketInstitution} onChange={(e) => setBucketInstitution(e.target.value)} placeholder="Ej: BBVA, Santander, Efectivo" />
            </div>
            <div>
              <Label>Tasa anual (%)</Label>
              <Input type="number" step="0.01" min="0" value={bucketRate} onChange={(e) => setBucketRate(e.target.value)} placeholder="Ej: 10" />
            </div>
            <div>
              <Label>Capitalización</Label>
              <Select value={bucketCompounding} onValueChange={(v) => setBucketCompounding(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="daily">Diaria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsBucketDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            <div className="text-muted-foreground">No hay movimientos de ahorros.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 