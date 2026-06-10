import { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export async function ensureUserProfile(user: User) {
  return supabase.from('users').upsert({
    id: user.id,
    email: user.email,
    first_name:
      typeof user.user_metadata?.first_name === 'string'
        ? user.user_metadata.first_name
        : null,
    last_name:
      typeof user.user_metadata?.last_name === 'string'
        ? user.user_metadata.last_name
        : null,
  });
}
