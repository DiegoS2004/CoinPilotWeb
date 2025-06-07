"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { getUSDtoMXNRate, convertUSDtoMXN, formatMXN, formatExchangeRate } from "@/lib/exchange-rate"
import { TrendingUp, TrendingDown, Plus, RefreshCw, DollarSign } from "lucide-react"

interface StockInvestment {
  id: string
  symbol: string
  shares: number
  purchase_price: number
  purchase_date: string
  current_price: number | null
  last_updated: string | null
}

export function StockInvestments() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [investments, setInvestments] = useState<StockInvestment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [updatingPrices, setUpdatingPrices] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number>(0)
  const [showInMXN, setShowInMXN] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Form state
  const [symbol, setSymbol] = useState("")
  const [shares, setShares] = useState("")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0])

  useEffect(() => {
    if (user) {
      fetchInvestments()
      fetchExchangeRate()
    }
  }, [user])

  // Update the auto-refresh interval to 1 minute
  useEffect(() => {
    const interval = setInterval(() => {
      fetchExchangeRate()
    }, 60 * 1000) // Refresh every minute

    return () => clearInterval(interval)
  }, [])

  const fetchExchangeRate = async () => {
    const rate = await getUSDtoMXNRate()
    setExchangeRate(rate)
    setLastUpdate(new Date())
  }

  const fetchInvestments = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("stock_investments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setInvestments(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las inversiones",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateStockPrices = async () => {
    if (!user || investments.length === 0) return
    setUpdatingPrices(true)

    try {
      // Fetch current prices for all symbols
      const symbols = [...new Set(investments.map(inv => inv.symbol))]
      const prices = await Promise.all(
        symbols.map(async (symbol) => {
          const response = await fetch(`/api/stocks/price?symbol=${symbol}`)
          const data = await response.json()
          return { symbol, price: data.price }
        })
      )

      // Update prices in database
      const updates = investments.map(inv => {
        const currentPrice = prices.find(p => p.symbol === inv.symbol)?.price
        return supabase
          .from("stock_investments")
          .update({
            current_price: currentPrice,
            last_updated: new Date().toISOString(),
          })
          .eq("id", inv.id)
      })

      await Promise.all(updates)
      await fetchInvestments()

      toast({
        title: "Precios actualizados",
        description: "Los precios de tus acciones se han actualizado",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los precios",
        variant: "destructive",
      })
    } finally {
      setUpdatingPrices(false)
    }
  }

  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      // First verify the symbol exists
      const response = await fetch(`/api/stocks/price?symbol=${symbol}`)
      const data = await response.json()
      
      if (!data.price) {
        throw new Error("Símbolo no válido")
      }

      const { error } = await supabase.from("stock_investments").insert({
        user_id: user.id,
        symbol: symbol.toUpperCase(),
        shares: Number(shares),
        purchase_price: Number(purchasePrice),
        purchase_date: purchaseDate,
        current_price: data.price,
        last_updated: new Date().toISOString(),
      })

      if (error) throw error

      toast({
        title: "Inversión agregada",
        description: "Tu inversión en acciones se ha guardado correctamente",
      })

      setShowAddDialog(false)
      setSymbol("")
      setShares("")
      setPurchasePrice("")
      setPurchaseDate(new Date().toISOString().split("T")[0])
      fetchInvestments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar la inversión",
        variant: "destructive",
      })
    }
  }

  const formatAmount = (amount: number) => {
    if (showInMXN) {
      return formatMXN(convertUSDtoMXN(amount, exchangeRate))
    }
    return formatCurrency(amount)
  }

  const calculateTotalValue = () => {
    const totalUSD = investments.reduce((total, inv) => {
      const currentValue = (inv.current_price || inv.purchase_price) * inv.shares
      return total + currentValue
    }, 0)
    return showInMXN ? convertUSDtoMXN(totalUSD, exchangeRate) : totalUSD
  }

  const calculateTotalGain = () => {
    const totalGainUSD = investments.reduce((total, inv) => {
      const purchaseValue = inv.purchase_price * inv.shares
      const currentValue = (inv.current_price || inv.purchase_price) * inv.shares
      return total + (currentValue - purchaseValue)
    }, 0)
    return showInMXN ? convertUSDtoMXN(totalGainUSD, exchangeRate) : totalGainUSD
  }

  const calculateTotalGainPercentage = () => {
    const totalPurchaseValue = investments.reduce((total, inv) => {
      return total + (inv.purchase_price * inv.shares)
    }, 0)
    
    if (totalPurchaseValue === 0) return 0
    return (calculateTotalGain() / totalPurchaseValue) * 100
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Inversiones en Acciones</CardTitle>
          <CardDescription>
            Trackea tus inversiones en el mercado de valores
            {lastUpdate && (
              <span className="text-xs text-muted-foreground ml-2">
                (Última actualización: {lastUpdate.toLocaleTimeString()})
              </span>
            )}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInMXN(!showInMXN)}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            {showInMXN ? "Mostrar en USD" : "Mostrar en MXN"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchExchangeRate()
              updateStockPrices()
            }}
            disabled={updatingPrices || investments.length === 0}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${updatingPrices ? "animate-spin" : ""}`} />
            Actualizar Precios
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Acción
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Inversión en Acciones</DialogTitle>
                <DialogDescription>
                  Ingresa los detalles de tu inversión en acciones
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddInvestment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Símbolo de la Acción</Label>
                  <Input
                    id="symbol"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="Ej: AAPL, SPY, QQQ"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shares">Cantidad de Acciones</Label>
                  <Input
                    id="shares"
                    type="number"
                    step="0.000001"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    placeholder="Ej: 10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Precio de Compra por Acción</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="Ej: 150.25"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Fecha de Compra</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">Guardar Inversión</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatAmount(calculateTotalValue())}
              </div>
              <p className="text-xs text-muted-foreground">
                {showInMXN ? "Valor en MXN" : "Valor en USD"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ganancia/Pérdida</CardTitle>
              {calculateTotalGain() >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${calculateTotalGain() >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatAmount(calculateTotalGain())}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(calculateTotalGainPercentage())}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tipo de Cambio</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatExchangeRate(exchangeRate)}
              </div>
              <p className="text-xs text-muted-foreground">
                USD/MXN (Google Finance)
              </p>
            </CardContent>
          </Card>
        </div>

        {investments.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No tienes inversiones en acciones registradas
          </div>
        ) : (
          <div className="space-y-4">
            {investments.map((inv) => {
              const currentValue = (inv.current_price || inv.purchase_price) * inv.shares
              const purchaseValue = inv.purchase_price * inv.shares
              const gain = currentValue - purchaseValue
              const gainPercentage = (gain / purchaseValue) * 100

              return (
                <Card key={inv.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{inv.symbol}</h3>
                        <p className="text-sm text-muted-foreground">
                          {inv.shares} acciones
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatAmount(currentValue)}
                        </div>
                        <div className={`text-sm ${gain >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatAmount(gain)} ({formatPercentage(gainPercentage)})
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Precio de compra: </span>
                        {formatAmount(inv.purchase_price)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Precio actual: </span>
                        {formatAmount(inv.current_price || inv.purchase_price)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fecha de compra: </span>
                        {new Date(inv.purchase_date).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Última actualización: </span>
                        {inv.last_updated ? new Date(inv.last_updated).toLocaleDateString() : "N/A"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 