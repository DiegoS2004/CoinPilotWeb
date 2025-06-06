import { supabase } from "./supabase"

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error("No authentication token")
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  }
}

export async function fetchTransactions(
  filters: {
    type?: string
    categoryId?: string
    dateFilter?: string
    limit?: number
    search?: string
  } = {},
) {
  const headers = await getAuthHeaders()
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString())
    }
  })

  const response = await fetch(`/api/transactions?${params}`, { headers })
  if (!response.ok) {
    throw new Error("Failed to fetch transactions")
  }

  let transactions = await response.json()

  // Apply search filter on client side
  if (filters.search) {
    transactions = transactions.filter(
      (transaction: any) =>
        transaction.description?.toLowerCase().includes(filters.search!.toLowerCase()) ||
        transaction.category?.name?.toLowerCase().includes(filters.search!.toLowerCase()),
    )
  }

  return transactions
}

export async function createTransaction(data: {
  amount: number
  description?: string
  categoryId?: string
  type: "income" | "expense"
  transactionDate: string
}) {
  const headers = await getAuthHeaders()

  const response = await fetch("/api/transactions", {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error("Failed to create transaction")
  }

  return response.json()
}

export async function deleteTransaction(id: string) {
  const headers = await getAuthHeaders()

  const response = await fetch(`/api/transactions/${id}`, {
    method: "DELETE",
    headers,
  })

  if (!response.ok) {
    throw new Error("Failed to delete transaction")
  }

  return response.json()
}

export async function fetchCategories() {
  const response = await fetch("/api/categories")
  if (!response.ok) {
    throw new Error("Failed to fetch categories")
  }
  return response.json()
}

export async function fetchStats() {
  const headers = await getAuthHeaders()

  const response = await fetch("/api/stats", { headers })
  if (!response.ok) {
    throw new Error("Failed to fetch stats")
  }
  return response.json()
}

export async function fetchReports(type: "monthly" | "categories" = "monthly") {
  const headers = await getAuthHeaders()

  const response = await fetch(`/api/reports?type=${type}`, { headers })
  if (!response.ok) {
    throw new Error("Failed to fetch reports")
  }
  return response.json()
}
