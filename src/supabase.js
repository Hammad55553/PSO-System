import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://myiwppesofgcigiaefhp.supabase.co'
const supabaseAnonKey = 'sb_publishable_5Km-J6D5fUYVf0KIAIWLdA_HAkCWfSs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
