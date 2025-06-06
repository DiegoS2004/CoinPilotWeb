import type { User } from "@supabase/supabase-js"
import { supabase } from "./supabase"

export async function createOrUpdateUser(supabaseUser: User) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: supabaseUser.id,
      email: supabaseUser.email,
      full_name: supabaseUser.user_metadata?.full_name || null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteUser(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (error) throw error
  return true
}
