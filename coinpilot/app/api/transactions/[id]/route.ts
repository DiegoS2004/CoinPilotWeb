import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the transaction belongs to the user
    const { data: transaction, error: fetchError } = await supabase
      .from("transactions")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("id", params.id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
