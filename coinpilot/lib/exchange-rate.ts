const CACHE_DURATION = 1000 * 60 * 1 // 1 minute

let cachedRate: { rate: number; timestamp: number } | null = null

export async function getUSDtoMXNRate(): Promise<number> {
  // Return cached rate if it's still valid
  if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_DURATION) {
    return cachedRate.rate
  }

  try {
    // Fetch from Google Finance API
    const response = await fetch(
      'https://www.google.com/finance/quote/USD-MXN',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    )

    if (!response.ok) {
      throw new Error("Error fetching from Google Finance")
    }

    const html = await response.text()
    // Extract the rate from the HTML using regex
    const match = html.match(/"USD\/MXN","([0-9.]+)"/)
    if (!match) {
      throw new Error("Could not find exchange rate in response")
    }

    const rate = parseFloat(match[1])
    if (!rate || isNaN(rate)) {
      throw new Error("Invalid rate from Google Finance")
    }

    cachedRate = {
      rate,
      timestamp: Date.now(),
    }

    return rate
  } catch (error) {
    console.error("Error fetching exchange rate:", error)
    // Try Yahoo Finance as fallback
    return await getYahooFinanceRate()
  }
}

async function getYahooFinanceRate(): Promise<number> {
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/USDMXN=X?interval=1d&range=1d'
    )
    
    if (!response.ok) {
      throw new Error("Error fetching from Yahoo Finance")
    }

    const data = await response.json()
    const rate = data.chart.result[0].meta.regularMarketPrice

    if (!rate || isNaN(rate)) {
      throw new Error("Invalid rate from Yahoo Finance")
    }

    cachedRate = {
      rate,
      timestamp: Date.now(),
    }

    return rate
  } catch (error) {
    console.error("Error fetching fallback rate:", error)
    // If all APIs fail, use a reasonable fallback rate
    return 17.0
  }
}

export function convertUSDtoMXN(usdAmount: number, rate: number): number {
  return usdAmount * rate
}

export function formatMXN(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

// Helper function to format the rate display
export function formatExchangeRate(rate: number): string {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  }).format(rate)
} 