import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get("symbol")

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
    }

    // Using Yahoo Finance API
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
    )

    if (!response.ok) {
      return NextResponse.json({ error: "Invalid symbol" }, { status: 400 })
    }

    const data = await response.json()
    const quote = data.chart.result[0].meta

    return NextResponse.json({
      symbol: quote.symbol,
      price: quote.regularMarketPrice,
      currency: quote.currency,
      exchange: quote.exchangeName,
      timestamp: quote.regularMarketTime,
    })
  } catch (error) {
    console.error("Error fetching stock price:", error)
    return NextResponse.json({ error: "Failed to fetch stock price" }, { status: 500 })
  }
} 