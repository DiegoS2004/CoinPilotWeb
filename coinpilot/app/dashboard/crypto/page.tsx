"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

interface CryptoAddress {
  id: string
  address: string
  currency: string
}

interface CryptoInfo {
  balance: number
  usdValue: number
  loading: boolean
  error?: string
}

const fetchCryptoBalance = async (address: string, currency: string): Promise<CryptoInfo> => {
  try {
    if (currency === "BTC") {
      // Blockchair API for Bitcoin
      const res = await fetch(`https://api.blockchair.com/bitcoin/dashboards/address/${address}`)
      const data = await res.json()
      const satoshis = data.data[address]?.address?.balance || 0
      const btc = satoshis / 1e8
      // Get BTC price
      const priceRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")
      const priceData = await priceRes.json()
      const usdValue = btc * priceData.bitcoin.usd
      return { balance: btc, usdValue, loading: false }
    } else if (currency === "ETH") {
      // Blockchair API for Ethereum
      const res = await fetch(`https://api.blockchair.com/ethereum/dashboards/address/${address}`)
      const data = await res.json()
      const wei = data.data[address]?.address?.balance || 0
      const eth = wei / 1e18
      // Get ETH price
      const priceRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
      const priceData = await priceRes.json()
      const usdValue = eth * priceData.ethereum.usd
      return { balance: eth, usdValue, loading: false }
    }
    return { balance: 0, usdValue: 0, loading: false, error: "Moneda no soportada" }
  } catch (error) {
    return { balance: 0, usdValue: 0, loading: false, error: "Error al obtener datos" }
  }
}

export default function CryptoPage() {
  const { user } = useAuth()
  const [addresses, setAddresses] = useState<CryptoAddress[]>([])
  const [address, setAddress] = useState("")
  const [currency, setCurrency] = useState("BTC")
  const [loading, setLoading] = useState(false)
  const [balances, setBalances] = useState<Record<string, CryptoInfo>>({})

  useEffect(() => {
    if (user) fetchAddresses()
  }, [user])

  useEffect(() => {
    addresses.forEach(addr => {
      setBalances(bal => ({ ...bal, [addr.id]: { ...bal[addr.id], loading: true } }))
      fetchCryptoBalance(addr.address, addr.currency).then(info => {
        setBalances(bal => ({ ...bal, [addr.id]: info }))
      })
    })
  }, [addresses])

  const fetchAddresses = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("crypto_addresses")
      .select("id, address, currency")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
    if (!error && data) setAddresses(data)
    setLoading(false)
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from("crypto_addresses").insert({
      user_id: user?.id,
      address,
      currency,
    })
    if (!error) {
      setAddress("")
      setCurrency("BTC")
      fetchAddresses()
    }
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mis Direcciones de Cripto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddAddress} className="flex flex-col gap-2 mb-6">
            <Label>Dirección Pública</Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} required />
            <Label>Moneda</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Agregar Dirección"}</Button>
          </form>
          <div>
            <h3 className="font-semibold mb-2">Direcciones Guardadas</h3>
            {addresses.length === 0 && <div className="text-muted-foreground">No hay direcciones guardadas.</div>}
            <ul className="space-y-2">
              {addresses.map(addr => (
                <li key={addr.id} className="border rounded p-2 flex flex-col">
                  <span className="font-medium">{addr.currency}: {addr.address}</span>
                  {balances[addr.id]?.loading ? (
                    <span className="text-xs text-muted-foreground">Cargando balance...</span>
                  ) : balances[addr.id]?.error ? (
                    <span className="text-xs text-red-600">{balances[addr.id].error}</span>
                  ) : (
                    <span className="text-xs">Balance: {balances[addr.id]?.balance} {addr.currency} (~{balances[addr.id]?.usdValue.toLocaleString(undefined, { style: 'currency', currency: 'USD' })})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 