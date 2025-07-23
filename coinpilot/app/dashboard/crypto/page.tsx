"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { Loader2, Plus, Trash2, Edit, TrendingUp, TrendingDown, Wallet } from "lucide-react"

// Interface para nuestros holdings de cripto
interface CryptoHolding {
  id: string
  name: string
  symbol: string
  quantity: number
  purchase_price: number
  current_price: number | null
  purchase_date: string
}

export default function CryptoPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [holdings, setHoldings] = useState<CryptoHolding[]>([])
  const [loading, setLoading] = useState(true)

  // Estado para el formulario (agregar/editar)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingHolding, setEditingHolding] = useState<CryptoHolding | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    quantity: "",
    purchase_price: "",
    current_price: "",
    purchase_date: new Date().toISOString().split("T")[0],
  })

  // Fetch holdings del usuario
  const fetchHoldings = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("crypto_holdings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setHoldings(data || [])
    } catch (error: any) {
      toast({ title: "Error", description: "No se pudieron cargar tus criptomonedas.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchHoldings()
    }
  }, [user])

  // Resetear y abrir el diálogo
  const handleOpenDialog = (holding: CryptoHolding | null = null) => {
    if (holding) {
      setEditingHolding(holding)
      setFormData({
        name: holding.name,
        symbol: holding.symbol,
        quantity: String(holding.quantity),
        purchase_price: String(holding.purchase_price),
        current_price: String(holding.current_price || holding.purchase_price),
        purchase_date: new Date(holding.purchase_date).toISOString().split("T")[0],
      })
    } else {
      setEditingHolding(null)
      setFormData({
        name: "",
        symbol: "",
        quantity: "",
        purchase_price: "",
        current_price: "",
        purchase_date: new Date().toISOString().split("T")[0],
      })
    }
    setIsDialogOpen(true)
  }

  // Manejar el submit (crear o actualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const holdingData = {
      user_id: user.id,
      name: formData.name,
      symbol: formData.symbol.toUpperCase(),
      quantity: Number(formData.quantity),
      purchase_price: Number(formData.purchase_price),
      current_price: Number(formData.current_price) || Number(formData.purchase_price),
      purchase_date: formData.purchase_date,
    }

    setLoading(true)
    try {
      let error
      if (editingHolding) {
        // Actualizar
        const { error: updateError } = await supabase
          .from("crypto_holdings")
          .update(holdingData)
          .eq("id", editingHolding.id)
        error = updateError
      } else {
        // Insertar
        const { error: insertError } = await supabase
          .from("crypto_holdings")
          .insert(holdingData)
        error = insertError
      }

      if (error) throw error
      toast({
        title: `Cripto ${editingHolding ? 'actualizada' : 'agregada'}`,
        description: `${formData.name} se ha guardado correctamente.`,
      })

      setIsDialogOpen(false)
      fetchHoldings()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Eliminar un holding
  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta criptomoneda?")) return

    setLoading(true)
    try {
      const { error } = await supabase.from("crypto_holdings").delete().eq("id", id)
      if (error) throw error
      toast({ title: "Criptomoneda eliminada", variant: "destructive" })
      fetchHoldings()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // --- Cálculos para el resumen del portafolio ---
  const totalInitialValue = holdings.reduce((sum, h) => sum + h.quantity * h.purchase_price, 0)
  const totalCurrentValue = holdings.reduce((sum, h) => sum + h.quantity * (h.current_price || h.purchase_price), 0)
  const totalGainLoss = totalCurrentValue - totalInitialValue
  const totalGainLossPercent = totalInitialValue > 0 ? (totalGainLoss / totalInitialValue) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portafolio de Criptomonedas</h1>
          <p className="text-muted-foreground">
            Monitorea el rendimiento de tus activos digitales.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Agregar Cripto
        </Button>
      </div>

      {/* Resumen del Portafolio */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen General</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 border rounded-lg">
            <Label className="text-sm text-muted-foreground">Valor Actual</Label>
            <p className="text-2xl font-bold">{formatCurrency(totalCurrentValue)}</p>
          </div>
          <div className="p-4 border rounded-lg">
            <Label className="text-sm text-muted-foreground">Costo Inicial</Label>
            <p className="text-2xl font-bold">{formatCurrency(totalInitialValue)}</p>
          </div>
          <div className={`p-4 border rounded-lg ${totalGainLoss >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <Label className="text-sm text-muted-foreground">Ganancia/Pérdida Total</Label>
            <div className={`flex items-center text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalGainLoss >= 0 ? <TrendingUp className="mr-2 h-6 w-6"/> : <TrendingDown className="mr-2 h-6 w-6"/>}
              {formatCurrency(totalGainLoss)}
            </div>
          </div>
           <div className={`p-4 border rounded-lg ${totalGainLoss >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <Label className="text-sm text-muted-foreground">Rendimiento</Label>
             <p className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercentage(totalGainLossPercent * 100)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Holdings */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p>Cargando portafolio...</p>
        ) : holdings.length > 0 ? (
          holdings.map((holding) => {
            const initialValue = holding.quantity * holding.purchase_price
            const currentValue = holding.quantity * (holding.current_price || holding.purchase_price)
            const gainLoss = currentValue - initialValue
            const gainLossPercent = initialValue > 0 ? (gainLoss / initialValue) : 0

            return (
              <Card key={holding.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{holding.name}</CardTitle>
                      <CardDescription>{holding.symbol}</CardDescription>
                    </div>
                     <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(holding)}>
                            <Edit className="h-4 w-4"/>
                        </Button>
                         <Button variant="ghost" size="icon" onClick={() => handleDelete(holding.id)}>
                            <Trash2 className="h-4 w-4 text-red-500"/>
                        </Button>
                     </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow">
                  <div className="flex justify-between items-baseline">
                    <Label>Cantidad:</Label>
                    <span className="font-mono">{holding.quantity}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <Label>Precio de Compra:</Label>
                    <span className="font-mono">{formatCurrency(holding.purchase_price)}</span>
                  </div>
                   <div className="flex justify-between items-baseline">
                    <Label>Precio Actual:</Label>
                    <span className="font-mono">{formatCurrency(holding.current_price || holding.purchase_price)}</span>
                  </div>
                  <div className="border-t pt-4 space-y-2">
                     <div className="flex justify-between items-baseline">
                        <Label>Valor Inicial:</Label>
                        <span className="font-mono">{formatCurrency(initialValue)}</span>
                    </div>
                     <div className="flex justify-between items-baseline">
                        <Label>Valor Actual:</Label>
                        <span className="font-bold">{formatCurrency(currentValue)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className={`p-4 rounded-b-lg ${gainLoss >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className={`w-full flex justify-between items-center font-bold ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <span>Rendimiento:</span>
                    <div className="flex items-center gap-2">
                       {gainLoss >= 0 ? <TrendingUp className="h-5 w-5"/> : <TrendingDown className="h-5 w-5"/>}
                      <span>{formatCurrency(gainLoss)} ({formatPercentage(gainLossPercent * 100)})</span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            )
          })
        ) : (
           <div className="col-span-full text-center py-12 text-muted-foreground">
                <Wallet className="mx-auto h-12 w-12 opacity-50"/>
                <h3 className="mt-4 text-lg font-semibold">Tu portafolio está vacío</h3>
                <p>Agrega tu primera criptomoneda para empezar a monitorear su rendimiento.</p>
          </div>
        )}
      </div>

      {/* Diálogo para Agregar/Editar Holding */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingHolding ? "Editar" : "Agregar"} Criptomoneda</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Bitcoin" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol">Símbolo</Label>
                <Input id="symbol" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value})} placeholder="BTC" required />
              </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input id="quantity" type="number" step="any" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} placeholder="0.1" required />
              </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="purchase_price">Precio de Compra (por unidad)</Label>
                <Input id="purchase_price" type="number" step="any" value={formData.purchase_price} onChange={(e) => setFormData({...formData, purchase_price: e.target.value})} placeholder="50000" required />
              </div>
               <div className="space-y-2">
                <Label htmlFor="current_price">Precio Actual (por unidad)</Label>
                <Input id="current_price" type="number" step="any" value={formData.current_price} onChange={(e) => setFormData({...formData, current_price: e.target.value})} placeholder="60000" />
              </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="purchase_date">Fecha de Compra</Label>
                <Input id="purchase_date" type="date" value={formData.purchase_date} onChange={(e) => setFormData({...formData, purchase_date: e.target.value})} required />
              </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 