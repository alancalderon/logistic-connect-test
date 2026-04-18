import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { clearAppProfileCache } from '@/lib/profile'

let browserClient: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  if (!browserClient) {
    browserClient = createClient(url, key)
    browserClient.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') clearAppProfileCache()
    })
  }
  return browserClient
}
